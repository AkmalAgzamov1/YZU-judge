from pydantic import BaseModel, ConfigDict

class TestCaseCreate(BaseModel):
    input_content: str
    output_content: str
    is_sample: bool = False
    sample_order: int | None = None


class TestCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    problem_id: int
    input_path: str
    output_path: str
    is_sample: bool
    sample_order: int | None    


class TestCaseUpdate(BaseModel):
    input_content: str
    output_content: str
    is_sample: bool = False
    sample_order: int | None = None


class SampleOut(BaseModel):
    order: int
    input: str
    output: str


class TestCaseFlags(BaseModel):
    is_sample: bool
    sample_order: int | None = None


class TestCaseAdminOut(BaseModel):
    """What the admin panel lists: sizes and the first characters, not whole files."""
    id: int
    problem_id: int
    is_sample: bool
    sample_order: int | None
    input_size: int
    output_size: int
    input_preview: str
    output_preview: str
