"""Judge logic with a fake runner, so these run in milliseconds without Docker.

Run from backend/: python -m unittest discover -s tests
"""

import unittest

from app.services.judge_service import judge_submission

TESTS = [
    {"id": 1, "input": "1 2\n", "output": "3\n"},
    {"id": 2, "input": "5 5\n", "output": "10\n"},
]


def fake_runner(outputs, calls):
    """Returns preset stdout per call and records what the judge passed in."""
    def run_code(code, input_data, time_limit_ms, memory_limit_mb, **options):
        calls.append(options)
        return {
            "stdout": outputs[len(calls) - 1],
            "stderr": "",
            "exit_code": 0,
            "timed_out": False,
            "is_oom": False,
            "time_taken_ms": 5,
            "memory_used_mb": 4,
        }
    return run_code


class PythonJudgeTests(unittest.TestCase):
    def test_accepted_without_compiling(self):
        calls = []
        result = judge_submission(fake_runner(["3", "10"], calls), "code", TESTS, 1000, 64)
        self.assertEqual(result["verdict"], "accepted")
        self.assertEqual(calls, [{}, {}])

    def test_stops_at_first_wrong_answer(self):
        calls = []
        result = judge_submission(fake_runner(["4", "10"], calls), "code", TESTS, 1000, 64)
        self.assertEqual(result["verdict"], "wrong_answer")
        self.assertEqual(len(calls), 1)


class CompiledJudgeTests(unittest.TestCase):
    def test_compile_error_skips_every_test(self):
        calls = []
        result = judge_submission(
            fake_runner([], calls), "int main(", TESTS, 1000, 64,
            language="cpp",
            compile_code=lambda language, code: {"ok": False, "output": "error: expected ')'", "binary": None},
        )
        self.assertEqual(result["verdict"], "compilation_error")
        self.assertEqual(result["results"], [])
        self.assertIn("expected", result["compile_output"])
        self.assertEqual(calls, [])

    def test_compiles_once_and_runs_the_binary_on_every_test(self):
        calls, compiles = [], []

        def compile_code(language, code):
            compiles.append(language)
            return {"ok": True, "output": "", "binary": b"ELF"}

        result = judge_submission(
            fake_runner(["3", "10"], calls), "src", TESTS, 1000, 64,
            language="cpp", compile_code=compile_code,
        )
        self.assertEqual(result["verdict"], "accepted")
        self.assertEqual(compiles, ["cpp"])
        self.assertEqual(calls, [{"language": "cpp", "binary": b"ELF"}] * 2)

    def test_compiled_language_requires_a_compiler(self):
        with self.assertRaises(ValueError):
            judge_submission(fake_runner([], []), "src", TESTS, 1000, 64, language="cpp")


if __name__ == "__main__":
    unittest.main()
