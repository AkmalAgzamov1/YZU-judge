"""Email code rules on an in-memory SQLite database, so no Postgres is needed.

Run from backend/: python -m unittest discover -s tests
"""

import unittest
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.email_code import EmailCode
from app.models.user import User
# Other tests load models with relationships to these; SQLAlchemy needs them all
# defined before it can set up any mapper.
from app.models import problem, submission, submission_result, testcase  # noqa: F401
from app.services.email_codes import (
    MAX_ATTEMPTS,
    RESET,
    VERIFY,
    CodeError,
    consume_code,
    issue_code,
)

START = datetime(2026, 11, 10, 12, 0, 0)


class EmailCodeTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://")
        Base.metadata.create_all(engine, tables=[User.__table__, EmailCode.__table__])
        self.db = sessionmaker(bind=engine)()
        self.user = User(email="s1131234@mail.yzu.edu.tw", username="akmal", password_hash="x", email_verified=False)
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_code_is_six_digits_and_stored_hashed(self):
        code = issue_code(self.db, self.user, VERIFY, now=START)
        self.assertRegex(code, r"^\d{6}$")
        stored = self.db.query(EmailCode).one()
        self.assertNotIn(code, stored.code_hash)

    def test_right_code_works_once(self):
        code = issue_code(self.db, self.user, VERIFY, now=START)
        consume_code(self.db, self.user, VERIFY, code, now=START + timedelta(minutes=1))
        self.db.commit()
        with self.assertRaises(CodeError):
            consume_code(self.db, self.user, VERIFY, code, now=START + timedelta(minutes=2))

    def test_spaces_in_the_typed_code_are_ignored(self):
        code = issue_code(self.db, self.user, VERIFY, now=START)
        consume_code(self.db, self.user, VERIFY, f" {code[:3]} {code[3:]} ", now=START)

    def test_code_expires_after_ten_minutes(self):
        code = issue_code(self.db, self.user, VERIFY, now=START)
        with self.assertRaisesRegex(CodeError, "expired"):
            consume_code(self.db, self.user, VERIFY, code, now=START + timedelta(minutes=10, seconds=1))

    def test_wrong_guesses_count_down_then_lock_the_code(self):
        code = issue_code(self.db, self.user, VERIFY, now=START)
        wrong = "000000" if code != "000000" else "111111"
        for left in range(MAX_ATTEMPTS - 1, 0, -1):
            with self.assertRaisesRegex(CodeError, f"{left} tr"):
                consume_code(self.db, self.user, VERIFY, wrong, now=START)
        with self.assertRaisesRegex(CodeError, "Too many wrong tries"):
            consume_code(self.db, self.user, VERIFY, wrong, now=START)
        # Even the right code is dead now.
        with self.assertRaisesRegex(CodeError, "expired"):
            consume_code(self.db, self.user, VERIFY, code, now=START)

    def test_resend_needs_a_minute(self):
        issue_code(self.db, self.user, VERIFY, now=START)
        with self.assertRaises(CodeError) as caught:
            issue_code(self.db, self.user, VERIFY, now=START + timedelta(seconds=20))
        self.assertEqual(caught.exception.status_code, 429)
        self.assertIn("40 seconds", caught.exception.message)

    def test_new_code_replaces_the_old_one(self):
        old = issue_code(self.db, self.user, VERIFY, now=START)
        new = issue_code(self.db, self.user, VERIFY, now=START + timedelta(minutes=1))
        if old != new:
            with self.assertRaises(CodeError):
                consume_code(self.db, self.user, VERIFY, old, now=START + timedelta(minutes=2))
        consume_code(self.db, self.user, VERIFY, new, now=START + timedelta(minutes=2))

    def test_at_most_five_codes_an_hour(self):
        for minute in range(5):
            issue_code(self.db, self.user, VERIFY, now=START + timedelta(minutes=minute * 2))
        with self.assertRaisesRegex(CodeError, "Too many codes"):
            issue_code(self.db, self.user, VERIFY, now=START + timedelta(minutes=12))
        # An hour after the first one, there is room again.
        issue_code(self.db, self.user, VERIFY, now=START + timedelta(minutes=61))

    def test_verify_and_reset_codes_do_not_mix(self):
        code = issue_code(self.db, self.user, VERIFY, now=START)
        with self.assertRaises(CodeError):
            consume_code(self.db, self.user, RESET, code, now=START)


if __name__ == "__main__":
    unittest.main()
