"""Run untrusted Python submissions in resource-limited Docker containers."""

import time
import threading
import re

import docker


client = docker.from_env()

# A single submission can use at most one CPU core.
CPU_LIMIT_NANO_CPUS = 1_000_000_000
PROCESS_LIMIT = 50
MEMORY_PEAK_POLL_INTERVAL_SECONDS = 0.01


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


def run_code_in_docker(code, input_data, time_limit_ms, memory_limit_mb):
    # Keep the interpreter alive until the memory monitor is ready. Reading one
    # line preserves the original stdin stream without buffering the full input.
    bootstrap = (
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
    container = client.containers.create(
        "python:3.11-slim",
        ["python", "-c", bootstrap, code],
        stdin_open=True,
        mem_limit=f"{memory_limit_mb}m",
        nano_cpus=CPU_LIMIT_NANO_CPUS,
        pids_limit=PROCESS_LIMIT,
        network_disabled=True,
    )

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
            container.kill()
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
