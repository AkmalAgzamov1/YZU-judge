"""Token lifetime rules, without a database.

Run from backend/: python -m unittest discover -s tests
"""

import time
import unittest

import jwt

from app.config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM, MAX_SESSION_DAYS, SECRET_KEY
from app.security import create_access_token

DAY = 24 * 60 * 60


def decode(token):
    return jwt.decode(token, SECRET_KEY, algorithms = [JWT_ALGORITHM])


class SessionLifetimeTests(unittest.TestCase):
    def test_new_sign_in_gets_the_normal_lifetime(self):
        now = int(time.time())
        payload = decode(create_access_token({"user_id": 1}))
        self.assertAlmostEqual(payload["auth_time"], now, delta = 5)
        self.assertAlmostEqual(payload["exp"], now + ACCESS_TOKEN_EXPIRE_MINUTES * 60, delta = 5)

    def test_refresh_keeps_the_original_sign_in_time(self):
        signed_in = int(time.time()) - 3 * DAY
        payload = decode(create_access_token({"user_id": 1}, auth_time = signed_in))
        self.assertEqual(payload["auth_time"], signed_in)

    def test_refresh_never_goes_past_the_session_limit(self):
        signed_in = int(time.time()) - (MAX_SESSION_DAYS - 1) * DAY
        payload = decode(create_access_token({"user_id": 1}, auth_time = signed_in))
        self.assertAlmostEqual(payload["exp"], signed_in + MAX_SESSION_DAYS * DAY, delta = 5)

    def test_a_session_past_the_limit_cannot_be_renewed(self):
        signed_in = int(time.time()) - (MAX_SESSION_DAYS + 1) * DAY
        token = create_access_token({"user_id": 1}, auth_time = signed_in)
        with self.assertRaises(jwt.ExpiredSignatureError):
            decode(token)


if __name__ == "__main__":
    unittest.main()
