"""The Celery task module must see every judge helper its tasks call.

A missing import stays invisible until a worker picks up that job, and then the
job fails in production. This exact import broke submissions once, so keep a
cheap check around it.
"""

import unittest

from app import tasks
from app.services import judge_service


class TaskImportTests(unittest.TestCase):
    def test_judge_task_can_load_testcases(self):
        self.assertIs(tasks.load_testcases, judge_service.load_testcases)

    def test_run_task_can_load_sample_testcases(self):
        self.assertIs(tasks.load_sample_testcases, judge_service.load_sample_testcases)

    def test_random_run_can_load_hidden_testcases(self):
        self.assertIs(tasks.load_random_hidden_testcases, judge_service.load_random_hidden_testcases)


if __name__ == "__main__":
    unittest.main()
