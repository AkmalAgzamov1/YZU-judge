"""Sends the few emails the site needs: verification and password reset codes."""

import html
import logging

import requests

from ..config import EMAIL_FROM, RESEND_API_KEY

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


class EmailNotSent(Exception):
    pass


def send_email(to: str, subject: str, text: str, html_body: str) -> None:
    """Raises EmailNotSent when the provider refuses or cannot be reached."""
    if not RESEND_API_KEY:
        # Local development: no provider, so print it where the developer can see it.
        logger.warning("RESEND_API_KEY is not set, so this email was not sent.\nTo: %s\nSubject: %s\n\n%s", to, subject, text)
        return

    try:
        response = requests.post(
            RESEND_URL,
            headers = {"Authorization": f"Bearer {RESEND_API_KEY}"},
            json = {"from": EMAIL_FROM, "to": [to], "subject": subject, "text": text, "html": html_body},
            timeout = 10,
        )
    except requests.RequestException as error:
        logger.error("Could not reach Resend: %s", error)
        raise EmailNotSent() from error

    if response.status_code >= 300:
        logger.error("Resend refused an email (%s): %s", response.status_code, response.text[:500])
        raise EmailNotSent()


def _code_email(code: str, intro: str, ignore_note: str) -> tuple[str, str]:
    text = (
        f"{intro}\n\n"
        f"    {code}\n\n"
        "The code works for 10 minutes.\n\n"
        f"{ignore_note}\n\n"
        "YZU Judge, https://yzujudge.com\n"
    )
    html_body = f"""\
<div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
  <p style="font-size: 16px; line-height: 1.5;">{html.escape(intro)}</p>
  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: Menlo, Consolas, monospace; margin: 24px 0;">{code}</p>
  <p style="font-size: 14px; color: #555;">The code works for 10 minutes.</p>
  <p style="font-size: 14px; color: #555;">{html.escape(ignore_note)}</p>
  <p style="font-size: 12px; color: #888; margin-top: 32px;">YZU Judge &middot; <a href="https://yzujudge.com" style="color: #888;">yzujudge.com</a></p>
</div>"""
    return text, html_body


def send_verification_code(to: str, username: str, code: str) -> None:
    text, html_body = _code_email(
        code,
        f"Hi {username}, here is the code to finish creating your YZU Judge account:",
        "If you did not sign up for YZU Judge, ignore this email and the account will be removed.",
    )
    # The code in the subject lets students read it straight from the notification.
    send_email(to, f"{code} is your YZU Judge code", text, html_body)


def send_reset_code(to: str, username: str, code: str) -> None:
    text, html_body = _code_email(
        code,
        f"Hi {username}, here is the code to reset your YZU Judge password:",
        "If you did not ask for this, ignore this email. Your password stays the same.",
    )
    send_email(to, f"{code} is your YZU Judge password reset code", text, html_body)
