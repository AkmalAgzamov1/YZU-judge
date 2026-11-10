import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func

from ..database import get_db
from ..models.user import User
from ..schemas.user import (
    CodeSent,
    EmailOnly,
    ResetPassword,
    Token,
    UserCreate,
    UserLogin,
    UserOut,
    VerifyEmail,
)
from ..security import hash_password, verify_password, create_access_token
from ..dependencies import get_current_user
from ..services import mailer
from ..services.email_codes import RESET, VERIFY, CodeError, check_ip_limit, consume_code, issue_code


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix = "/users",
    tags = ["Users"]
)

EMAIL_FAILED = "We could not send the email right now. Try again in a minute."


def _find_by_email(db, email: str) -> User | None:
    # Older accounts may have capitals in their email, so compare in lower case.
    return db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()


def _token_response(user: User) -> dict:
    access_token = create_access_token({
        "user_id": user.id,
        "username": user.username,
        "tv": user.token_version,
    })
    return {"access_token": access_token, "token_type": "bearer"}


def _client_ip(request: Request) -> str | None:
    # Behind Caddy, uvicorn's --proxy-headers puts the real address here.
    return request.client.host if request.client else None


def _send_code(db, user: User, purpose: str) -> None:
    """Raises CodeError (too soon, too many) or mailer.EmailNotSent."""
    code = issue_code(db, user, purpose)
    if purpose == VERIFY:
        mailer.send_verification_code(user.email, user.username, code)
    else:
        mailer.send_reset_code(user.email, user.username, code)


def _http_error(error: CodeError) -> HTTPException:
    return HTTPException(status_code = error.status_code, detail = error.message)


@router.post("/register", response_model = CodeSent)
def register(user: UserCreate, request: Request, db = Depends(get_db)):
    """Creates an unverified account and emails it a code. No token until it is verified."""
    username = user.username.strip()
    email = user.email.strip().lower()

    by_email = _find_by_email(db, email)
    if by_email is not None and by_email.email_verified:
        raise HTTPException(
            status_code = 400,
            detail = "An account with this email already exists. Sign in, or reset your password."
        )

    by_name = db.query(User).filter(User.username == username).first()
    if by_name is not None and by_name is not by_email:
        raise HTTPException(status_code = 400, detail = "That username is taken.")

    try:
        check_ip_limit(_client_ip(request))
    except CodeError as error:
        raise _http_error(error)

    # Nobody proved they own an unverified email, so signing up again simply takes it over.
    # That way a fake sign up cannot block the real owner.
    if by_email is not None:
        account = by_email
        account.username = username
        account.password_hash = hash_password(user.password)
    else:
        account = User(
            email = email,
            username = username,
            password_hash = hash_password(user.password),
            email_verified = False,
        )
        db.add(account)

    db.commit()
    db.refresh(account)

    try:
        _send_code(db, account, VERIFY)
    except CodeError:
        pass  # A code went out moments ago; the verify page can ask for another.
    except mailer.EmailNotSent:
        raise HTTPException(status_code = 503, detail = EMAIL_FAILED)

    return {"email": account.email}


@router.post("/verify-email", response_model = Token)
def verify_email(data: VerifyEmail, db = Depends(get_db)):
    account = _find_by_email(db, data.email)

    if account is None:
        raise HTTPException(status_code = 400, detail = "No account is waiting for this email. Sign up again.")
    if account.email_verified:
        raise HTTPException(status_code = 400, detail = "This email is already verified. Sign in instead.")

    try:
        consume_code(db, account, VERIFY, data.code)
    except CodeError as error:
        raise _http_error(error)

    account.email_verified = True
    db.commit()

    return _token_response(account)


@router.post("/resend-code", response_model = CodeSent)
def resend_code(data: EmailOnly, request: Request, db = Depends(get_db)):
    account = _find_by_email(db, data.email)

    if account is None or account.email_verified:
        return {"email": data.email}

    try:
        check_ip_limit(_client_ip(request))
        _send_code(db, account, VERIFY)
    except CodeError as error:
        raise _http_error(error)
    except mailer.EmailNotSent:
        raise HTTPException(status_code = 503, detail = EMAIL_FAILED)

    return {"email": account.email}


@router.post("/password/forgot", response_model = CodeSent)
def forgot_password(data: EmailOnly, request: Request, db = Depends(get_db)):
    """Always answers the same way, so it cannot be used to find out who has an account."""
    try:
        check_ip_limit(_client_ip(request))
    except CodeError as error:
        raise _http_error(error)

    account = _find_by_email(db, data.email)

    if account is not None:
        try:
            _send_code(db, account, RESET)
        except CodeError:
            pass
        except mailer.EmailNotSent:
            logger.error("Password reset email to user %s was not sent", account.id)

    return {"email": data.email}


@router.post("/password/reset", response_model = Token)
def reset_password(data: ResetPassword, db = Depends(get_db)):
    account = _find_by_email(db, data.email)

    if account is None:
        raise HTTPException(status_code = 400, detail = "This code has expired. Ask for a new one.")

    try:
        consume_code(db, account, RESET, data.code)
    except CodeError as error:
        raise _http_error(error)

    account.password_hash = hash_password(data.password)
    # The code came to their inbox, so the email is theirs.
    account.email_verified = True
    # Signs out every other device, including whoever knew the old password.
    account.token_version += 1
    db.commit()

    return _token_response(account)


@router.post("/login", response_model = Token)
def login(user: UserLogin, db = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.username == user.username)
    ).first()

    if not existing_user or not verify_password(user.password, existing_user.password_hash):
        raise HTTPException(
            status_code = 401,
            detail = "Invalid username or password"
        )

    if not existing_user.email_verified:
        # The password was right, so it is fine to tell them where the code goes.
        try:
            _send_code(db, existing_user, VERIFY)
        except CodeError:
            pass
        except mailer.EmailNotSent:
            logger.error("Verification email to user %s was not sent", existing_user.id)

        raise HTTPException(
            status_code = 403,
            detail = {
                "code": "email_not_verified",
                "message": "Verify your email to sign in. We sent you a code.",
                "email": existing_user.email,
            }
        )

    return _token_response(existing_user)


@router.get("/me", response_model = UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/refresh", response_model = Token)
def refresh_token(current_user: User = Depends(get_current_user)):
    """Trades a still valid token for a fresh one, so active users are never signed out."""
    return _token_response(current_user)
