import docker
import requests
import time


client = docker.from_env()


def run_code_in_docker(
    code,
    input_data,
    time_limit_ms,
    memory_limit_mb,
):

    container = client.containers.create(
        "python:3.11-slim",
        ["python", "-c", code],
        stdin_open=True,
        mem_limit=f"{memory_limit_mb}m",
    )

    container.start()

    stream = container.attach_socket(
        params={
            "stdin": 1,
            "stdout": 0,
            "stderr": 0,
            "stream": 1,
        }
    )

    stream.sendall(input_data.encode())
    stream.close()

    start_time = time.perf_counter()

    try:
        result = container.wait(
            timeout=time_limit_ms / 1000
        )

        time_taken_ms = int(
            (time.perf_counter() - start_time) * 1000
        )

        exit_code = result["StatusCode"]

        stdout = container.logs(
            stdout=True,
            stderr=False
        )

        stderr = container.logs(
            stdout=False,
            stderr=True
        )

        return {
            "stdout": stdout.decode().strip(),
            "stderr": stderr.decode().strip(),
            "exit_code": exit_code,
            "timed_out": False,
            "time_taken_ms": time_taken_ms,
        }

    except requests.exceptions.ReadTimeout:

        time_taken_ms = int(
            (time.perf_counter() - start_time) * 1000
        )

        container.kill()

        return {
            "stdout": "",
            "stderr": "",
            "exit_code": None,
            "timed_out": True,
            "time_taken_ms": time_taken_ms,
        }

    finally:
        container.remove(force=True)