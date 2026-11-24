from fastapi import HTTPException


def check_no_null_characters(*texts: str | None):
    """PostgreSQL text columns cannot store U+0000, so saving one would fail with a 500.

    Students get one by loading a UTF-16 file (an old Notepad "Unicode" save) as code or input.
    """
    if any(text is not None and "\x00" in text for text in texts):
        raise HTTPException(
            status_code = 400,
            detail = "The text contains a null character. Save the file as UTF-8 and try again."
        )
