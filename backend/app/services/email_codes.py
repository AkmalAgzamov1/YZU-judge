"""Six digit codes for email verification and password resets.

Codes are stored as an HMAC, never in plain text. A code lasts 10 minutes and
dies after 5 wrong guesses, so guessing one of a million codes is hopeless.
Asking for a new code replaces the old one.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ..config import SECRET_KEY
from ..models.email_code import EmailCode
from ..models.user import User

VERIFY = "verify"
RESET = "reset"

CODE_LIFETIME = timedelta(minutes = 10)
MAX_ATTEMPTS = 5
RESEND_COOLDOWN = timedelta(seconds = 60)
MAX_CODES_PER_HOUR = 5


class CodeError(Exception):
    """A message that is safe to show the student."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def hash_code(code: str) -> str:
    return hmac.new(SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()


def issue_code(db: Session, user: User, purpose: str, now: datetime | None = None) -> str:
    """Creates a fresh code, retiring older ones, and returns it in plain text.

    Commits. Raises CodeError when the user asks too often.
    """
    now = now or datetime.utcnow()

    recent = (
        db.query(EmailCode)
        .filter(
            EmailCode.user_id == user.id,
            EmailCode.purpose == purpose,
            EmailCode.created_at > now - timedelta(hours = 1),
        )
        .order_by(EmailCode.created_at.desc())
        .all()
    )

    if recent:
        wait = RESEND_COOLDOWN - (now - recent[0].created_at)
        if wait > timedelta(0):
            seconds = max(1, int(wait.total_seconds()))
            raise CodeError(f"Wait {seconds} seconds before asking for a new code.", 429)

    if len(recent) >= MAX_CODES_PER_HOUR:
        raise CodeError("Too many codes in the last hour. Try again later.", 429)

    db.query(EmailCode).filter(
        EmailCode.user_id == user.id,
        EmailCode.purpose == purpose,
        EmailCode.used_at.is_(None),
    ).update({EmailCode.used_at: now}, synchronize_session = False)

    code = f"{secrets.randbelow(10 ** 6):06d}"
    db.add(EmailCode(
        user_id = user.id,
        purpose = purpose,
        code_hash = hash_code(code),
        created_at = now,
        expires_at = now + CODE_LIFETIME,
    ))
    db.commit()

    return code


def consume_code(db: Session, user: User, purpose: str, code: str, now: datetime | None = None) -> None:
    """Marks the code used if it is right. The caller commits.

    Raises CodeError otherwise; a wrong guess is committed right away.
    """
    now = now or datetime.utcnow()
    code = "".join(code.split())

    active = (
        db.query(EmailCode)
        .filter(
            EmailCode.user_id == user.id,
            EmailCode.purpose == purpose,
            EmailCode.used_at.is_(None),
        )
        .order_by(EmailCode.created_at.desc())
        .first()
    )

    if active is None or active.expires_at <= now or active.attempts >= MAX_ATTEMPTS:
        raise CodeError("This code has expired. Ask for a new one.")

    if not hmac.compare_digest(active.code_hash, hash_code(code)):
        active.attempts += 1
        db.commit()

        left = MAX_ATTEMPTS - active.attempts
        if left == 0:
            raise CodeError("Too many wrong tries. Ask for a new code.")
        raise CodeError(f"That code is not right. {left} {'try' if left == 1 else 'tries'} left.")

    active.used_at = now
