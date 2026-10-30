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

type ProblemInput = components["schemas"]["ProblemCreate"];

type ProblemStats = components["schemas"]["ProblemStats"];

type TestCaseAdmin = components["schemas"]["TestCaseAdminOut"];

type TestCaseInput = components["schemas"]["TestCaseCreate"];

type CpePaperInput = components["schemas"]["CpePaperCreate"];

export const SESSION_EXPIRED_EVENT = "yzu-judge:session-expired";

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

  // A rejected token means the session is over. Tell AuthContext so the app
  // signs out cleanly instead of failing request after request.
  if (response.status === 401 && token && path !== "/users/login") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

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

  refresh(): Promise<LoginResponse> {
    return request<LoginResponse>("/users/refresh", { method: "POST" });
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

// Everything here needs an admin token; the backend checks it.
export const adminApi = {
  createProblem(data: ProblemInput): Promise<Problem> {
    return request<Problem>("/problems/", { method: "POST", body: JSON.stringify(data) });
  },

  updateProblem(id: number, data: ProblemInput): Promise<Problem> {
    return request<Problem>(`/problems/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  deleteProblem(id: number): Promise<unknown> {
    return request(`/problems/${id}`, { method: "DELETE" });
  },

  publish(id: number): Promise<Problem> {
    return request<Problem>(`/problems/${id}/publish`, { method: "POST" });
  },

  unpublish(id: number): Promise<Problem> {
    return request<Problem>(`/problems/${id}/unpublish`, { method: "POST" });
  },

  stats(): Promise<ProblemStats[]> {
    return request<ProblemStats[]>("/problems/admin/stats");
  },

  tests(problemId: number): Promise<TestCaseAdmin[]> {
    return request<TestCaseAdmin[]>(`/problems/${problemId}/testcases/admin`);
  },

  addTests(problemId: number, tests: TestCaseInput[]): Promise<TestCaseAdmin[]> {
    return request<TestCaseAdmin[]>(`/problems/${problemId}/testcases/bulk`, {
      method: "POST",
      body: JSON.stringify(tests),
    });
  },

  setSample(problemId: number, testId: number, isSample: boolean, order: number | null): Promise<TestCaseAdmin> {
    return request<TestCaseAdmin>(`/problems/${problemId}/testcases/${testId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_sample: isSample, sample_order: order }),
    });
  },

  deleteTest(problemId: number, testId: number): Promise<unknown> {
    return request(`/problems/${problemId}/testcases/${testId}`, { method: "DELETE" });
  },

  createPaper(data: CpePaperInput): Promise<CpePaper> {
    return request<CpePaper>("/cpe-papers/", { method: "POST", body: JSON.stringify(data) });
  },

  updatePaper(id: number, data: CpePaperInput): Promise<CpePaper> {
    return request<CpePaper>(`/cpe-papers/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  deletePaper(id: number): Promise<unknown> {
    return request(`/cpe-papers/${id}`, { method: "DELETE" });
  },
};

export type {
  CpePaper,
  CpePaperInput,
  ProblemInput,
  ProblemStats,
  TestCaseAdmin,
  TestCaseInput,
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
