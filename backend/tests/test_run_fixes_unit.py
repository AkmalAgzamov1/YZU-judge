"""Null characters and deleting a problem that has test runs, without a database."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.models.testcase import TestCase
from app.routers.problems import delete_problem
from app.text_checks import check_no_null_characters


class NullCharacterTests(unittest.TestCase):
    def test_null_character_is_a_400(self):
        with self.assertRaises(HTTPException) as raised:
            check_no_null_characters("print(1)", "1\x002")
        self.assertEqual(raised.exception.status_code, 400)

    def test_normal_and_missing_text_passes(self):
        check_no_null_characters("print('\u4f60\u597d')", "", None)


def fake_db(commit_error = None):
    testcase = SimpleNamespace(input_path = "7/0.in", output_path = "7/0.out")

    def query(model):
        result = MagicMock()
        filtered = result.filter.return_value
        filtered.first.return_value = SimpleNamespace(id = 7) if model.__name__ == "Problem" else None
        filtered.all.return_value = [testcase] if model is TestCase else []
        return result

    db = MagicMock()
    db.query.side_effect = query
    db.commit.side_effect = commit_error
    return db


class DeleteProblemTests(unittest.TestCase):
    def test_a_failed_delete_keeps_the_test_files(self):
        db = fake_db(commit_error = RuntimeError("foreign key"))
        with patch("app.routers.problems.delete_file") as delete_file:
            with self.assertRaises(RuntimeError):
                delete_problem(7, current_user = None, db = db)
        delete_file.assert_not_called()

    def test_a_successful_delete_removes_the_test_files(self):
        with patch("app.routers.problems.delete_file") as delete_file:
            delete_problem(7, current_user = None, db = fake_db())
        self.assertEqual([call.args[0] for call in delete_file.call_args_list], ["7/0.in", "7/0.out"])


if __name__ == "__main__":
    unittest.main()
