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