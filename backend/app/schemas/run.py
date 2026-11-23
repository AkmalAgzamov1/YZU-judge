from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator

RunLanguage = Literal["python", "c_gcc", "c_msvc", "java8", "java11"]
RunMode = Literal["samples", "random", "custom"]
RunStatus = Literal["pending", "running", "finished", "error"]
RunVerdict = Literal[
    "accepted",
    "wrong_answer",
    "presentation_error",
    "time_limit_exceeded",
    "memory_limit_exceeded",
    "output_limit_exceeded",
    "runtime_error",
    "compilation_error",
]

# Same ceilings as a submission, plus a smaller cap for the custom input.
MAX_CODE_BYTES = 65_536
MAX_INPUT_BYTES = 16_384
MAX_RANDOM_CASES = 10


class RunCreate(BaseModel):
    problem_id: int
    language: RunLanguage
    mode: RunMode = "samples"
    code: Annotated[str, Field(max_length=MAX_CODE_BYTES)]
    custom_input: Annotated[str, Field(max_length=MAX_INPUT_BYTES)] | None = None
    random_count: Annotated[int, Field(ge=1, le=MAX_RANDOM_CASES)] | None = None

    @field_validator("code")
    @classmethod
    def code_must_fit_argv(cls, code: str) -> str:
        if len(code.encode("utf-8")) > MAX_CODE_BYTES:
            raise ValueError("code must be at most 64 KiB when UTF-8 encoded")
        return code

    @field_validator("custom_input")
    @classmethod
    def custom_input_must_fit(cls, value: str | None) -> str | None:
        if value is not None and len(value.encode("utf-8")) > MAX_INPUT_BYTES:
            raise ValueError("custom_input must be at most 16 KiB when UTF-8 encoded")
        return value


class RunCaseOut(BaseModel):
    index: int
    input: str | None = None
    expected_output: str | None = None
    stdout: str = ""
    stderr: str = ""
    exit_code: int | None = None
    verdict: RunVerdict
    time_taken_ms: int
    memory_used_mb: int | None = None


class RunOut(BaseModel):
    id: int
    problem_id: int
    language: RunLanguage
    mode: RunMode
    status: RunStatus
    verdict: RunVerdict | None = None
    compile_output: str | None = None
    results: list[RunCaseOut] | None = None
    created_at: datetime
