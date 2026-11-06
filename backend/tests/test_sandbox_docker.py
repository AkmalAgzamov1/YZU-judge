"""Runs hostile code in the real sandbox, because a fake runner cannot prove a limit holds.

Needs Docker and the judge images (python -m scripts.pull_judge_images). Without
Docker these tests skip, unless REQUIRE_DOCKER is set, as it is in CI.

Run from backend/: python -m unittest tests.test_sandbox_docker
"""

import os
import unittest

import docker

from app.services.docker_runner import (
    COMPILE_OUTPUT_LIMIT_CHARS,
    compile_in_docker,
    run_code_in_docker,
)


def setUpModule():
    try:
        docker.from_env().ping()
    except docker.errors.DockerException as error:
        if os.getenv("REQUIRE_DOCKER"):
            raise
        raise unittest.SkipTest(f"Docker is not available: {error}")


def run_python(code, input_data = "", time_limit_ms = 3000, memory_limit_mb = 256):
    return run_code_in_docker(code, input_data, time_limit_ms, memory_limit_mb)


def huge_binary_source(size_bytes):
    return f'asm(".data\\n.space {size_bytes},1\\n");\nint main() {{}}\n'


class CompileLimitTests(unittest.TestCase):
    def test_normal_program_compiles_and_runs(self):
        source = "#include <iostream>\nint main() { int a, b; std::cin >> a >> b; std::cout << a + b; }\n"
        compiled = compile_in_docker("cpp", source)
        self.assertTrue(compiled["ok"], compiled["output"])

        result = run_code_in_docker(source, "2 3\n", 3000, 256, language = "cpp", binary = compiled["binary"])
        self.assertEqual(result["exit_code"], 0)
        self.assertEqual(result["stdout"], "5")

    def test_large_uninitialized_array_is_not_rejected(self):
        compiled = compile_in_docker("cpp", "int a[50000000];\nint main() { return a[0]; }\n")
        self.assertTrue(compiled["ok"], compiled["output"])

    def test_tiny_source_cannot_produce_a_huge_binary(self):
        for size_bytes in (400_000_000, 1_200_000_000):
            with self.subTest(size_bytes = size_bytes):
                compiled = compile_in_docker("cpp", huge_binary_source(size_bytes))
                self.assertFalse(compiled["ok"])
                self.assertIsNone(compiled["binary"])

    def test_compiler_output_flood_is_cut_off(self):
        message = "x" * 1000
        source = f'#pragma message "{message}"\n#include __FILE__\n#include __FILE__\nint main() {{}}\n'
        compiled = compile_in_docker("cpp", source)
        self.assertFalse(compiled["ok"])
        self.assertIsNone(compiled["binary"])
        # Running into the time limit would mean the output was never cut off.
        self.assertNotIn("longer than", compiled["output"])
        self.assertLess(len(compiled["output"]), COMPILE_OUTPUT_LIMIT_CHARS + 100)


class RunLimitTests(unittest.TestCase):
    def test_input_reaches_the_program(self):
        result = run_python("print(int(input()) * 2)", "21\n")
        self.assertEqual(result["exit_code"], 0)
        self.assertEqual(result["stdout"], "42")

    def test_runs_as_nobody(self):
        result = run_python("import os; print(os.getuid(), os.getgid())")
        self.assertEqual(result["stdout"], "65534 65534")

    def test_has_no_network(self):
        code = (
            "import socket\n"
            "try:\n"
            "    socket.create_connection(('1.1.1.1', 53), timeout = 1)\n"
            "    print('connected')\n"
            "except OSError:\n"
            "    print('blocked')\n"
        )
        self.assertEqual(run_python(code)["stdout"], "blocked")

    def test_cannot_see_the_test_data(self):
        result = run_python("import os; print(os.path.exists('/data'))")
        self.assertEqual(result["stdout"], "False")

    def test_cannot_write_outside_the_tmpfs(self):
        code = (
            "try:\n"
            "    open('/usr/local/bin/planted', 'w')\n"
            "    print('written')\n"
            "except OSError:\n"
            "    print('denied')\n"
        )
        self.assertEqual(run_python(code)["stdout"], "denied")

    def test_tmpfs_size_is_limited(self):
        code = (
            "written = 0\n"
            "try:\n"
            "    with open('/tmp/fill', 'wb') as file:\n"
            "        for _ in range(100):\n"
            "            file.write(b'x' * 1024 * 1024)\n"
            "            file.flush()\n"
            "            written += 1\n"
            "except OSError:\n"
            "    pass\n"
            "print(written)\n"
        )
        result = run_python(code)
        self.assertEqual(result["exit_code"], 0)
        self.assertLessEqual(int(result["stdout"]), 64)

    def test_infinite_loop_times_out(self):
        result = run_python("while True: pass", time_limit_ms = 1000)
        self.assertTrue(result["timed_out"])

    def test_memory_hog_is_killed(self):
        code = "chunks = []\nwhile True: chunks.append(bytearray(10 * 1024 * 1024))"
        result = run_python(code, time_limit_ms = 5000, memory_limit_mb = 64)
        self.assertTrue(result["is_oom"])
        self.assertFalse(result["timed_out"])

    def test_output_flood_is_stopped(self):
        result = run_python("while True: print('x' * 4096)", time_limit_ms = 5000)
        self.assertTrue(result["output_limit_exceeded"])

    def test_fork_bomb_is_contained(self):
        code = (
            "import os, time\n"
            "children = 0\n"
            "try:\n"
            "    while True:\n"
            "        if os.fork() == 0:\n"
            "            time.sleep(60)\n"
            "            os._exit(0)\n"
            "        children += 1\n"
            "except OSError:\n"
            "    print(children)\n"
        )
        result = run_python(code, time_limit_ms = 5000)
        self.assertEqual(result["exit_code"], 0)
        self.assertLess(int(result["stdout"]), 50)


if __name__ == "__main__":
    unittest.main()
