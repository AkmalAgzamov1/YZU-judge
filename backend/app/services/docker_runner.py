"""Compile and run untrusted submissions in resource-limited Docker containers."""

import io
import tarfile
import time
import threading
import re

import docker

from .languages import get_language


client = docker.from_env()

# A single submission can use at most one CPU core.
CPU_LIMIT_NANO_CPUS = 1_000_000_000
PROCESS_LIMIT = 50
MEMORY_PEAK_POLL_INTERVAL_SECONDS = 0.1

# Submissions run as nobody, without capabilities or a way to gain privileges.
SANDBOX_USER = "65534:65534"
SANDBOX_OPTIONS = dict(
    user = SANDBOX_USER,
    cap_drop = ["ALL"],
    security_opt = ["no-new-privileges"],
    network_disabled = True,
)

COMPILE_TIME_LIMIT_SECONDS = 15
COMPILE_MEMORY_LIMIT_MB = 512
COMPILE_PROCESS_LIMIT = 64
# Template errors in C++ can run to megabytes; students need the first ones.
COMPILE_OUTPUT_LIMIT_CHARS = 8000
WORK_DIR = "/tmp"


def _tar_bytes(files: dict[str, tuple[bytes, int]]) -> bytes:
    """Builds an in memory tar of {name: (content, mode)} owned by the sandbox user."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj = buffer, mode = "w") as archive:
        for name, (content, mode) in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(content)
            info.mode = mode
            info.uid = info.gid = 65534
            info.mtime = int(time.time())
            archive.addfile(info, io.BytesIO(content))
    return buffer.getvalue()


def _untar_single_file(chunks) -> bytes:
    archive = tarfile.open(fileobj = io.BytesIO(b"".join(chunks)))
    member = archive.next()
    return archive.extractfile(member).read()


def compile_in_docker(language_name, code):
    """Compiles once per submission. Returns ok, the compiler output and the binary."""
    language = get_language(language_name)

    if language.compile_command is None:
        return {"ok": True, "output": "", "binary": None}

    container = client.containers.create(
        language.image,
        ["sleep", str(COMPILE_TIME_LIMIT_SECONDS + 5)],
        mem_limit = f"{COMPILE_MEMORY_LIMIT_MB}m",
        memswap_limit = f"{COMPILE_MEMORY_LIMIT_MB}m",
        nano_cpus = CPU_LIMIT_NANO_CPUS,
        pids_limit = COMPILE_PROCESS_LIMIT,
        **SANDBOX_OPTIONS,
    )

    try:
        container.put_archive(WORK_DIR, _tar_bytes({language.source_name: (code.encode(), 0o644)}))
        container.start()

        finished = threading.Event()
        outcome = []

        def run_compiler():
            try:
                outcome.append(container.exec_run(
                    list(language.compile_command),
                    workdir = WORK_DIR,
                    user = SANDBOX_USER,
                    demux = True,
                ))
            except docker.errors.DockerException as error:
                outcome.append(error)
            finally:
                finished.set()

        threading.Thread(target = run_compiler, daemon = True).start()

        if not finished.wait(COMPILE_TIME_LIMIT_SECONDS):
            try:
                container.kill()
            except docker.errors.APIError:
                pass
            return {
                "ok": False,
                "output": f"Compilation took longer than {COMPILE_TIME_LIMIT_SECONDS} seconds.",
                "binary": None,
            }

        result = outcome[0]
        if isinstance(result, Exception):
            raise result

        stdout, stderr = result.output if isinstance(result.output, tuple) else (result.output, None)
        output = ((stdout or b"") + (stderr or b"")).decode(errors = "replace").strip()
        if len(output) > COMPILE_OUTPUT_LIMIT_CHARS:
            output = output[:COMPILE_OUTPUT_LIMIT_CHARS] + "\n... (output truncated)"

        if result.exit_code != 0:
            return {"ok": False, "output": output, "binary": None}

        chunks, _ = container.get_archive(f"{WORK_DIR}/{language.binary_name}")
        return {"ok": True, "output": output, "binary": _untar_single_file(chunks)}
    finally:
        container.remove(force = True)


def _read_memory_peak_bytes(container):
    """Read the cgroup memory high-water mark on v2 or v1 hosts."""
    for path in (
        "/sys/fs/cgroup/memory.peak",
        "/sys/fs/cgroup/memory/memory.max_usage_in_bytes",
    ):
        try:
            result = container.exec_run(["cat", path], demux=True)
            stdout = result.output[0] if isinstance(result.output, tuple) else result.output
            if result.exit_code == 0:
                return int(stdout.strip())
        except (docker.errors.DockerException, OSError, ValueError, AttributeError):
            continue
    return None


def run_code_in_docker(code, input_data, time_limit_ms, memory_limit_mb, language = "python", binary = None):
    lang = get_language(language)

    if lang.compile_command is not None:
        if binary is None:
            raise ValueError(f"{language} needs a compiled binary to run")
        # Wait for the judge's handshake line, then hand the rest of stdin to
        # the program, the same contract as the Python bootstrap below.
        command = ["sh", "-c", f"read _ && exec {WORK_DIR}/{lang.binary_name}"]
        files = {lang.binary_name: (binary, 0o755)}
    else:
        command = ["python", "-c", PYTHON_BOOTSTRAP, code]
        files = None

    return _run_container(lang.image, command, files, input_data, time_limit_ms, memory_limit_mb)


# Keep the interpreter alive until the memory monitor is ready. Reading one
# line preserves the original stdin stream without buffering the full input.
PYTHON_BOOTSTRAP = (
    "import resource as _resource, sys\n"
    "_judge_stderr = sys.stderr\n"
    "_judge_getrusage = _resource.getrusage\n"
    "sys.stdin.buffer.readline()\n"
    "try:\n"
    "    exec(compile(sys.argv[1], '<submission>', 'exec'))\n"
    "finally:\n"
    "    _judge_stderr.write('\\n__OJ_RSS_KB__=%d\\n' % "
    "_judge_getrusage(_resource.RUSAGE_SELF).ru_maxrss)\n"
)


def _run_container(image, command, files, input_data, time_limit_ms, memory_limit_mb):
    container = client.containers.create(
        image,
        command,
        stdin_open=True,
        mem_limit=f"{memory_limit_mb}m",
        # Equal to mem_limit, so there is no swap: a program over the limit is
        # killed for memory instead of crawling in swap until it times out.
        memswap_limit=f"{memory_limit_mb}m",
        nano_cpus=CPU_LIMIT_NANO_CPUS,
        pids_limit=PROCESS_LIMIT,
        **SANDBOX_OPTIONS,
    )

    if files:
        container.put_archive(WORK_DIR, _tar_bytes(files))

    peak_memory_bytes = 0
    try:
        container.start()

        # This initial sample happens while the bootstrap is waiting for stdin.
        initial_peak = _read_memory_peak_bytes(container)
        if initial_peak is not None:
            peak_memory_bytes = initial_peak

        stats_stop = threading.Event()

        def sample_memory_peak():
            nonlocal peak_memory_bytes
            while not stats_stop.is_set():
                memory_peak = _read_memory_peak_bytes(container)
                if memory_peak is not None:
                    peak_memory_bytes = max(peak_memory_bytes, memory_peak)
                stats_stop.wait(MEMORY_PEAK_POLL_INTERVAL_SECONDS)

        stats_thread = threading.Thread(target=sample_memory_peak, daemon=True)
        stats_thread.start()

        stream = container.attach_socket(
            params={"stdin": 1, "stdout": 0, "stderr": 0, "stream": 1}
        )

        def send_input():
            try:
                stream.sendall(b"\n")
                stream.sendall(input_data.encode())
            except Exception:
                # Submissions that exit without consuming stdin can close the
                # pipe while the writer is sending. The verdict comes from wait().
                pass
            finally:
                try:
                    stream.close()
                except Exception:
                    pass

        start_time = time.perf_counter()
        input_thread = threading.Thread(target=send_input, daemon=True)
        input_thread.start()
        wait_finished = threading.Event()
        wait_result = []
        wait_error = []

        def wait_for_container():
            try:
                wait_result.append(container.wait())
            except Exception as error:
                wait_error.append(error)
            finally:
                wait_finished.set()

        wait_thread = threading.Thread(target=wait_for_container, daemon=True)
        wait_thread.start()
        timed_out = not wait_finished.wait(time_limit_ms / 1000)
        time_taken_ms = int((time.perf_counter() - start_time) * 1000)

        if timed_out:
            try:
                container.kill()
            except docker.errors.APIError:
                # It may have exited naturally at the deadline.
                pass
        try:
            stream.close()
        except Exception:
            pass

        if timed_out:
            # Killing the container should release Docker's wait request. Bound
            # cleanup so a daemon/API problem cannot pin this worker indefinitely.
            wait_finished.wait(5)

        try:
            input_thread.join(timeout=MEMORY_PEAK_POLL_INTERVAL_SECONDS * 2)
        finally:
            stats_stop.set()
            stats_thread.join(
                timeout=MEMORY_PEAK_POLL_INTERVAL_SECONDS * 2
            )

        if not timed_out and wait_error:
            raise wait_error[0]

        result = wait_result[0] if wait_result else {"StatusCode": None}

        container.reload()
        is_oom = container.attrs.get("State", {}).get("OOMKilled", False)
        exit_code = None if timed_out else result["StatusCode"]

        stdout = container.logs(stdout=True, stderr=False)
        stderr = container.logs(stdout=False, stderr=True).decode(errors="replace")
        rss_samples_kb = re.findall(r"__OJ_RSS_KB__=(\d+)", stderr)
        process_peak_bytes = int(rss_samples_kb[-1]) * 1024 if rss_samples_kb else None
        stderr = re.sub(r"\n?__OJ_RSS_KB__=\d+\n?", "\n", stderr).strip()
        peak_memory_bytes = max(
            (sample for sample in (peak_memory_bytes, process_peak_bytes) if sample is not None),
            default=None,
        )
        if is_oom:
            peak_memory_bytes = max(
                peak_memory_bytes or 0,
                memory_limit_mb * 1024 * 1024,
            )

        return {
            "stdout": stdout.decode(errors="replace").strip(),
            "stderr": stderr,
            "exit_code": exit_code,
            "timed_out": timed_out,
            "is_oom": is_oom,
            "time_taken_ms": time_taken_ms,
            "memory_used_mb": (
                (peak_memory_bytes + 1024 * 1024 - 1) // (1024 * 1024)
                if peak_memory_bytes is not None
                else None
            ),
        }
    finally:
        container.remove(force=True)
