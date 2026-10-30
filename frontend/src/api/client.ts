import type { components, paths } from "./schema";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type LoginRequest =
  paths["/users/login"]["post"]["requestBody"]["content"]["application/json"];

type LoginResponse =
  paths["/users/login"]["post"]["responses"][200]["content"]["application/json"];

type RegisterRequest =
  paths["/users/register"]["post"]["requestBody"]["content"]["application/json"];

type CurrentUser =
  paths["/users/me"]["get"]["responses"][200]["content"]["application/json"];

type Problem = components["schemas"]["ProblemOut"];

type Submission = components["schemas"]["SubmissionOut"];

type SubmissionCreate = components["schemas"]["SubmissionCreate"];

type SubmissionResult = components["schemas"]["SubmissionResultOut"];

type Sample = components["schemas"]["SampleOut"];

type CpePaper = components["schemas"]["CpePaperOut"];

type MockExam = components["schemas"]["MockExamOut"];

type MockExamSummary = components["schemas"]["MockExamSummary"];

export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
function getErrorMessage(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "detail" in payload
  ) {
    const detail = payload.detail;

    if (typeof detail === "string") {
      return detail;
    }
  }

  return fallback;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const token = localStorage.getItem("access_token");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(0, "Cannot connect to the server. Is the backend running?");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload, `Request failed (${response.status})`),
    );
  }

  return payload as T;
}

export const authApi = {
  login(data: LoginRequest): Promise<LoginResponse> {
    return request<LoginResponse>("/users/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  register(data: RegisterRequest): Promise<CurrentUser> {
    return request<CurrentUser>("/users/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  me(): Promise<CurrentUser> {
    return request<CurrentUser>("/users/me");
  },
};

export const problemsApi = {
  list(): Promise<Problem[]> {
    return request<Problem[]>("/problems/");
  },

  get(id: number): Promise<Problem> {
    return request<Problem>(`/problems/${id}`);
  },

  samples(id: number): Promise<Sample[]> {
    return request<Sample[]>(`/problems/${id}/samples`);
  },
};

export const submissionsApi = {
  // Only the signed in user's submissions; the backend filters by token.
  list(): Promise<Submission[]> {
    return request<Submission[]>("/submissions/");
  },

  create(data: SubmissionCreate): Promise<Submission> {
    return request<Submission>("/submissions/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  get(id: number): Promise<Submission> {
    return request<Submission>(`/submissions/${id}`);
  },

  results(id: number): Promise<SubmissionResult[]> {
    return request<SubmissionResult[]>(`/submissions/${id}/results`);
  },
};

export const cpePapersApi = {
  list(): Promise<CpePaper[]> {
    return request<CpePaper[]>("/cpe-papers/");
  },
};

export const mockExamsApi = {
  start(paperId: number): Promise<MockExam> {
    return request<MockExam>("/mock-exams/", {
      method: "POST",
      body: JSON.stringify({ paper_id: paperId }),
    });
  },

  list(): Promise<MockExamSummary[]> {
    return request<MockExamSummary[]>("/mock-exams/");
  },

  active(): Promise<MockExam | null> {
    return request<MockExam | null>("/mock-exams/active");
  },

  get(id: number): Promise<MockExam> {
    return request<MockExam>(`/mock-exams/${id}`);
  },

  finish(id: number): Promise<MockExam> {
    return request<MockExam>(`/mock-exams/${id}/finish`, { method: "POST" });
  },
};

export type {
  CpePaper,
  MockExam,
  MockExamSummary,
  CurrentUser,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  Problem,
  Sample,
  Submission,
  SubmissionResult,
};
