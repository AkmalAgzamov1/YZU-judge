"""Compile and run untrusted submissions in resource-limited Docker containers."""

import io
import tarfile
import time
import threading
import re
import socket

from datetime import datetime, timedelta, timezone

import docker
from docker.types import LogConfig, Ulimit

from .languages import get_language


client = docker.from_env()

# A single submission can use at most one CPU core.
CPU_LIMIT_NANO_CPUS = 1_000_000_000
PROCESS_LIMIT = 50
MEMORY_PEAK_POLL_INTERVAL_SECONDS = 0.1

# Submissions run as nobody, without capabilities or a way to gain privileges.
SANDBOX_USER = "65534:65534"
SANDBOX_LABEL = "yzu-judge-sandbox"
SANDBOX_OPTIONS = dict(
    user = SANDBOX_USER,
    cap_drop = ["ALL"],
    security_opt = ["no-new-privileges"],
    network_disabled = True,
    labels = {SANDBOX_LABEL: "1"},
    # A crash must not hand a core dump to the host's crash handler.
    ulimits = [Ulimit(name = "core", soft = 0, hard = 0)],
)

# Longer than any real limit, so only a container whose worker died is this old.
STALE_SANDBOX_AGE = timedelta(minutes = 5)

# Correct outputs are under 2 MB, so this only stops runaway programs.
OUTPUT_LIMIT_BYTES = 16 * 1024 * 1024
# Enough to find the memory marker the Python bootstrap writes at the very end.
STDERR_TAIL_BYTES = 64 * 1024
OUTPUT_DRAIN_SECONDS = 5

# Every folder the sandbox user can write to is a small tmpfs, which also counts
# against the memory limit, so a submission cannot fill the server's disk.
SANDBOX_TMPFS_OPTIONS = "size=64m,mode=1777"
SANDBOX_TMPFS = {path: SANDBOX_TMPFS_OPTIONS for path in ("/tmp", "/var/tmp", "/run/lock")}
# A tmpfs only appears at start, so the binary goes in a folder the sandbox cannot write to.
RUN_DIR = "/usr/local/bin"

COMPILE_TIME_LIMIT_SECONDS = 15
COMPILE_MEMORY_LIMIT_MB = 512
COMPILE_PROCESS_LIMIT = 64
# Template errors in C++ can run to megabytes; students need the first ones.
COMPILE_OUTPUT_LIMIT_CHARS = 8000
WORK_DIR = "/tmp"
# An initialized global array is stored in the binary byte for byte, so two lines
# of C++ can link to hundreds of MB. Real solutions stay far below this.
MAX_BINARY_BYTES = 32 * 1024 * 1024
BINARY_TOO_LARGE = f"The compiled program is larger than {MAX_BINARY_BYTES // (1024 * 1024)} MB."
# The kernel stops the compiler or linker at this file size, before it reaches the disk.
COMPILE_ULIMITS = [Ulimit(name = "fsize", soft = MAX_BINARY_BYTES, hard = MAX_BINARY_BYTES)]
FILE_SIZE_EXCEEDED = ("File size limit exceeded", "signal 25", "File too large")


def remove_stale_sandboxes() -> int:
    """Removes containers left running by a worker that died. Returns how many."""
    cutoff = datetime.now(timezone.utc) - STALE_SANDBOX_AGE
    removed = 0
    for container in client.containers.list(all = True, filters = {"label": SANDBOX_LABEL}):
        created = datetime.fromisoformat(container.attrs["Created"][:19]).replace(tzinfo = timezone.utc)
        if created < cutoff:
            container.remove(force = True)
            removed += 1
    return removed


def _tar_bytes(files: dict[str, tuple[bytes, int]], owner: int = 65534) -> bytes:
    """Builds an in memory tar of {name: (content, mode)}, by default owned by the sandbox user."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj = buffer, mode = "w") as archive:
        for name, (content, mode) in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(content)
            info.mode = mode
            info.uid = info.gid = owner
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
        entrypoint = [],
        mem_limit = f"{COMPILE_MEMORY_LIMIT_MB}m",
        memswap_limit = f"{COMPILE_MEMORY_LIMIT_MB}m",
        nano_cpus = CPU_LIMIT_NANO_CPUS,
        pids_limit = COMPILE_PROCESS_LIMIT,
        **{**SANDBOX_OPTIONS, "ulimits": SANDBOX_OPTIONS["ulimits"] + COMPILE_ULIMITS},
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
            if any(marker in output for marker in FILE_SIZE_EXCEEDED):
                output = f"{BINARY_TOO_LARGE}\n\n{output}"
            return {"ok": False, "output": output, "binary": None}

        if language.kind == "java":
            # javac emits one .class per class (and inner classes), not one binary.
            # Keep just the class files and hand them to the run step as a tar.
            chunks, _ = container.get_archive(WORK_DIR)
            classes = _collect_class_files(chunks)
            if not classes:
                return {
                    "ok": False,
                    "output": output + "\nThe program needs a class named 'Main' (public class Main) in Main.java.",
                    "binary": None,
                }
            if sum(len(content) for content in classes.values()) > MAX_BINARY_BYTES:
                return {"ok": False, "output": BINARY_TOO_LARGE, "binary": None}
            files = {name: (content, 0o644) for name, content in classes.items()}
            return {"ok": True, "output": output, "binary": _tar_bytes(files, owner = 0)}

        chunks, stat = container.get_archive(f"{WORK_DIR}/{language.binary_name}")
        # Checked before reading, so an oversized binary never reaches the worker's memory.
        if stat["size"] > MAX_BINARY_BYTES:
            return {"ok": False, "output": BINARY_TOO_LARGE, "binary": None}
        return {"ok": True, "output": output, "binary": _untar_single_file(chunks)}
    finally:
        container.remove(force = True)


def _collect_class_files(chunks) -> dict[str, bytes]:
    """Pull every .class file out of a get_archive() directory tar, flattened by name."""
    archive = tarfile.open(fileobj = io.BytesIO(b"".join(chunks)))
    classes = {}
    for member in archive.getmembers():
        if member.isfile() and member.name.endswith(".class"):
            content = archive.extractfile(member).read()
            classes[member.name.rsplit("/", 1)[-1]] = content
    return classes


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

    if lang.kind == "interpreted":
        command = ["python", "-c", PYTHON_BOOTSTRAP, code]
        return _run_container(lang.image, command, None, input_data, time_limit_ms, memory_limit_mb)

    if binary is None:
        raise ValueError(f"{language} needs a compiled binary to run")

    if lang.kind == "java":
        # binary is the tar of .class files built by compile_in_docker above.
        command = ["sh", "-c", _java_command(lang, memory_limit_mb)]
        return _run_container(lang.image, command, None, input_data, time_limit_ms, memory_limit_mb,
                              archive = binary, environment = JAVA_ENV)

    # Wait for the judge's handshake line, then hand the rest of stdin to
    # the program, the same contract as the Python bootstrap below.
    command = ["sh", "-c", f"read _ && exec {RUN_DIR}/{lang.binary_name}"]
    files = {lang.binary_name: (binary, 0o755)}
    return _run_container(lang.image, command, files, input_data, time_limit_ms, memory_limit_mb)


# The JVM keeps its own memory beyond the heap, so cap everything to stay inside
# the problem's limit rather than trusting the default sizes a full desktop gets.
JAVA_HEAP_OVERHEAD_MB = 128
JAVA_MIN_HEAP_MB = 16
JAVA_FLAGS = (
    "-Xss8m",                  # room for recursion; thread stacks are mostly virtual
    "-XX:+UseSerialGC",        # one GC thread: a smaller, steadier footprint
    "-XX:MaxMetaspaceSize=48m",
    "-XX:ReservedCodeCacheSize=32m",
    "-XX:+ExitOnOutOfMemoryError",  # a heap overflow exits, and the judge reads it as MLE
)
# HOME and the temp dir point at the tmpfs the sandbox is allowed to write.
JAVA_ENV = {"HOME": "/tmp", "TMPDIR": "/tmp", "LANG": "C.UTF-8"}


def _java_command(lang, memory_limit_mb) -> str:
    heap_mb = max(JAVA_MIN_HEAP_MB, memory_limit_mb - JAVA_HEAP_OVERHEAD_MB)
    flags = " ".join((f"-Xms{JAVA_MIN_HEAP_MB}m", f"-Xmx{heap_mb}m", *JAVA_FLAGS))
    return f"read _ && exec java {flags} -cp {RUN_DIR} {lang.main_class}"


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


def _run_container(image, command, files, input_data, time_limit_ms, memory_limit_mb, archive = None, environment = None):
    container = client.containers.create(
        image,
        command,
        # AdoptOpenJDK images ship a `java` entrypoint; clearing it keeps our command
        # the whole process instead of being appended to it.
        entrypoint=[],
        stdin_open=True,
        mem_limit=f"{memory_limit_mb}m",
        # Equal to mem_limit, so there is no swap: a program over the limit is
        # killed for memory instead of crawling in swap until it times out.
        memswap_limit=f"{memory_limit_mb}m",
        nano_cpus=CPU_LIMIT_NANO_CPUS,
        pids_limit=PROCESS_LIMIT,
        tmpfs=SANDBOX_TMPFS,
        # Output is read live below, so Docker does not need to keep a copy on disk.
        log_config=LogConfig(type=LogConfig.types.NONE),
        environment=environment,
        **SANDBOX_OPTIONS,
    )

    peak_memory_bytes = 0
    try:
        if archive is not None:
            # Java hands over its classes as a ready tar; compiled binaries use files.
            container.put_archive(RUN_DIR, archive)
        elif files:
            container.put_archive(RUN_DIR, _tar_bytes(files, owner=0))

        container.start()

        # The program stays silent until the handshake below, so no output is missed.
        output_stream = container.attach(
            stdout=True, stderr=True, stream=True, demux=True, logs=False
        )
        stdout_chunks = []
        stderr_tail = bytearray()
        output_exceeded = threading.Event()
        output_finished = threading.Event()
        output_errors = []

        def kill_container():
            try:
                container.kill()
            except docker.errors.APIError:
                pass

        def collect_output():
            total = 0
            try:
                # Keep reading until the stream ends, even past the limit: if nobody
                # reads, Docker blocks every call on this container, kill included.
                for stdout_chunk, stderr_chunk in output_stream:
                    if output_exceeded.is_set():
                        continue
                    if stdout_chunk:
                        total += len(stdout_chunk)
                        stdout_chunks.append(stdout_chunk)
                    if stderr_chunk:
                        total += len(stderr_chunk)
                        stderr_tail.extend(stderr_chunk)
                        del stderr_tail[:-STDERR_TAIL_BYTES]
                    if total > OUTPUT_LIMIT_BYTES:
                        output_exceeded.set()
                        threading.Thread(target=kill_container, daemon=True).start()
            except Exception as error:
                output_errors.append(error)
            finally:
                output_finished.set()

        threading.Thread(target=collect_output, daemon=True).start()

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
        # On Linux this is a SocketIO wrapper without sendall; on Windows it is the
        # named pipe itself. Write to the real socket either way.
        raw_stream = getattr(stream, "_sock", stream)

        def send_input():
            try:
                raw_stream.sendall(b"\n")
                raw_stream.sendall(input_data.encode())
                # Half close so the program sees end of input on a Unix socket.
                try:
                    raw_stream.shutdown(socket.SHUT_WR)
                except (AttributeError, OSError):
                    pass
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
        for handle in (stream, raw_stream):
            try:
                handle.close()
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

        # A verdict needs the whole output, so a broken stream must not look like a wrong answer.
        output_drained = output_finished.wait(OUTPUT_DRAIN_SECONDS)
        if not timed_out and not output_exceeded.is_set():
            if output_errors:
                raise output_errors[0]
            if not output_drained:
                raise RuntimeError("The sandbox output stream did not finish")

        stdout = b"".join(list(stdout_chunks))
        stderr = bytes(stderr_tail).decode(errors="replace")
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
            # Not stripped: the judge checks the final newline. Callers strip what they store.
            "stdout": stdout.decode(errors="replace"),
            "stderr": stderr,
            "exit_code": exit_code,
            "timed_out": timed_out,
            "is_oom": is_oom,
            "output_limit_exceeded": output_exceeded.is_set(),
            "time_taken_ms": time_taken_ms,
            "memory_used_mb": (
                (peak_memory_bytes + 1024 * 1024 - 1) // (1024 * 1024)
                if peak_memory_bytes is not None
                else None
            ),
        }
    finally:
        container.remove(force=True)
