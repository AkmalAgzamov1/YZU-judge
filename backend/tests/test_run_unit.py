"""Test runs (the editor's Run button) with a fake sandbox, no Docker needed."""

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.services.judge_service import load_random_hidden_testcases, run_tests

SAMPLES = [
    {"id": 1, "input": "1 2\n", "output": "3\n"},
    {"id": 2, "input": "5 5\n", "output": "10\n"},
]


def fake_runner(outputs, calls):
    def run_code(code, input_data, time_limit_ms, memory_limit_mb, **options):
        calls.append(input_data)
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


class RunTestsTests(unittest.TestCase):
    def test_all_samples_pass(self):
        calls = []
        result = run_tests(fake_runner(["3\n", "10\n"], calls), "code", SAMPLES, 1000, 64)
        self.assertEqual(result["verdict"], "accepted")
        self.assertEqual(len(result["results"]), 2)
        self.assertEqual(calls, ["1 2\n", "5 5\n"])

    def test_keeps_going_after_a_wrong_answer(self):
        calls = []
        result = run_tests(fake_runner(["4\n", "10\n"], calls), "code", SAMPLES, 1000, 64)
        self.assertEqual(result["verdict"], "wrong_answer")
        self.assertEqual(len(result["results"]), 2)
        self.assertEqual(result["results"][0]["verdict"], "wrong_answer")
        self.assertEqual(result["results"][1]["verdict"], "accepted")
        # Both samples ran; unlike a submission, a test run shows every result.
        self.assertEqual(len(calls), 2)

    def test_stops_after_a_time_limit(self):
        calls = []

        def run_code(code, input_data, time_limit_ms, memory_limit_mb, **options):
            calls.append(input_data)
            return {
                "stdout": "",
                "stderr": "",
                "exit_code": None,
                "timed_out": True,
                "is_oom": False,
                "time_taken_ms": 1000,
                "memory_used_mb": 4,
            }

        result = run_tests(run_code, "code", SAMPLES, 1000, 64)
        self.assertEqual(result["verdict"], "time_limit_exceeded")
        self.assertEqual(len(result["results"]), 1)
        self.assertEqual(len(calls), 1)

    def test_custom_input_without_expected_output_is_accepted(self):
        result = run_tests(
            fake_runner(["anything\n"], []),
            "code",
            [{"id": None, "input": "hello\n", "output": None}],
            1000,
            64,
        )
        self.assertEqual(result["verdict"], "accepted")
        self.assertEqual(result["results"][0]["stdout"], "anything\n")

    def test_nonzero_exit_is_a_runtime_error_even_without_expected_output(self):
        def run_code(code, input_data, time_limit_ms, memory_limit_mb, **options):
            return {
                "stdout": "",
                "stderr": "Traceback...",
                "exit_code": 1,
                "timed_out": False,
                "is_oom": False,
                "time_taken_ms": 5,
                "memory_used_mb": 4,
            }

        result = run_tests(
            run_code,
            "code",
            [{"id": None, "input": "", "output": None}],
            1000,
            64,
        )
        self.assertEqual(result["verdict"], "runtime_error")

    def test_compilation_error_stops_before_running(self):
        calls = []

        def compile_code(language, code):
            return {"ok": False, "output": "expected ';'", "binary": None}

        result = run_tests(
            fake_runner([], calls),
            "code",
            SAMPLES,
            1000,
            64,
            language="c_gcc",
            compile_code=compile_code,
        )
        self.assertEqual(result["verdict"], "compilation_error")
        self.assertEqual(result["compile_output"], "expected ';'")
        self.assertEqual(result["results"], [])
        self.assertEqual(calls, [])

    def test_compiled_language_compiles_once(self):
        calls = []
        compiles = []

        def compile_code(language, code):
            compiles.append(language)
            return {"ok": True, "output": "", "binary": b"binary"}

        result = run_tests(
            fake_runner(["3\n", "10\n"], calls),
            "code",
            SAMPLES,
            1000,
            64,
            language="c_gcc",
            compile_code=compile_code,
        )
        self.assertEqual(result["verdict"], "accepted")
        self.assertEqual(compiles, ["c_gcc"])
        self.assertEqual(len(calls), 2)

    def test_without_testcases_raises(self):
        with self.assertRaises(ValueError):
            run_tests(fake_runner([], []), "code", [], 1000, 64)


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, *args, **kwargs):
        return self

    def all(self):
        return self.rows


class FakeDB:
    def __init__(self, rows):
        self.rows = rows

    def query(self, model):
        return FakeQuery(self.rows)


class HiddenTestcaseSelectionTests(unittest.TestCase):
    def rows(self, count):
        return [
            SimpleNamespace(id=index, input_path=f"in-{index}", output_path=f"out-{index}")
            for index in range(1, count + 1)
        ]

    def test_picks_at_most_the_requested_number(self):
        with patch("app.services.judge_service.read_file", side_effect=lambda path: path):
            picked = load_random_hidden_testcases(FakeDB(self.rows(4)), 7, count=2)

        self.assertEqual(len(picked), 2)
        self.assertEqual(len({case["id"] for case in picked}), 2)
        self.assertTrue(all(case["input"].startswith("in-") for case in picked))

    def test_returns_everything_when_the_request_is_larger(self):
        with patch("app.services.judge_service.read_file", side_effect=lambda path: path):
            picked = load_random_hidden_testcases(FakeDB(self.rows(3)), 7, count=10)

        self.assertEqual(len(picked), 3)

    def test_without_hidden_tests_returns_empty(self):
        with patch("app.services.judge_service.read_file", side_effect=lambda path: path):
            self.assertEqual(load_random_hidden_testcases(FakeDB([]), 7, count=10), [])


if __name__ == "__main__":
    unittest.main()
