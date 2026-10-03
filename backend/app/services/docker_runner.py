"""Run untrusted Python submissions in resource-limited Docker containers."""

import time
import threading

import docker
import requests


client = docker.from_env()

# A single submission can use at most one CPU core.
CPU_LIMIT_NANO_CPUS = 1_000_000_000
PROCESS_LIMIT = 50
MEMORY_PEAK_POLL_INTERVAL_SECONDS = 0.01


def _read_memory_peak_bytes(container):
    """Read cgroup v2's monotonic peak counter from the running container."""
    try:
        result = container.exec_run(
            ["cat", "/sys/fs/cgroup/memory.peak"],
            demux=True,
        )
        stdout = result.output[0] if isinstance(result.output, tuple) else result.output
        return int(stdout.strip()) if result.exit_code == 0 else None
    except (docker.errors.DockerException, OSError, ValueError, AttributeError):
        return None


def run_code_in_docker(code, input_data, time_limit_ms, memory_limit_mb):
    container = client.containers.create(
        "python:3.11-slim",
        ["python", "-c", code],
        stdin_open=True,
        mem_limit=f"{memory_limit_mb}m",
        nano_cpus=CPU_LIMIT_NANO_CPUS,
        pids_limit=PROCESS_LIMIT,
        network_disabled=True,
    )

    peak_memory_bytes = 0
    try:
        container.start()

        stream = container.attach_socket(
            params={"stdin": 1, "stdout": 0, "stderr": 0, "stream": 1}
        )
        stream.sendall(input_data.encode())
        stream.close()

        start_time = time.perf_counter()
        stats_stop = threading.Event()

        def sample_memory_peak():
            nonlocal peak_memory_bytes
            try:
                for sample in container.stats(decode=True):
                    memory = sample.get("memory_stats", {})
                    peak_memory_bytes = max(
                        peak_memory_bytes,
                        int(memory.get("max_usage", memory.get("usage", 0))),
                    )
                    if stats_stop.is_set():
                        break
            except (docker.errors.DockerException, KeyError, TypeError, ValueError):
                pass

        stats_thread = threading.Thread(target=sample_memory_peak, daemon=True)
        stats_thread.start()
        timed_out = False
        try:
            result = container.wait(timeout=time_limit_ms / 1000)
        except requests.exceptions.ReadTimeout:
            timed_out = True
            container.kill()
            result = container.wait()
        finally:
            stats_stop.set()
            stats_thread.join(timeout=1)

        time_taken_ms = int((time.perf_counter() - start_time) * 1000)
        container.reload()
        is_oom = container.attrs.get("State", {}).get("OOMKilled", False)
        exit_code = None if timed_out else result["StatusCode"]

        stdout = container.logs(stdout=True, stderr=False)
        stderr = container.logs(stdout=False, stderr=True)

        return {
            "stdout": stdout.decode(errors="replace").strip(),
            "stderr": stderr.decode(errors="replace").strip(),
            "exit_code": exit_code,
            "timed_out": timed_out,
            "is_oom": is_oom,
            "time_taken_ms": time_taken_ms,
            "memory_used_mb": (peak_memory_bytes + 1024 * 1024 - 1) // (1024 * 1024),
        }
    finally:
        container.remove(force=True)
