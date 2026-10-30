import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Account from "./pages/Account";
import Landing from "./pages/Landing";
import Legal from "./pages/Legal";
import Login from "./pages/Login";
import MockHome from "./pages/MockHome";
import NotFound from "./pages/NotFound";
import Problems from "./pages/Problems";
import Register from "./pages/Register";
import Submissions from "./pages/Submissions";

// The editor and Markdown renderer are heavy, so load them only here.
const ProblemPage = lazy(() => import("./pages/ProblemPage"));
const SubmissionDetail = lazy(() => import("./pages/SubmissionDetail"));
const MockExamPage = lazy(() => import("./pages/MockExamPage"));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/problems" element={<Problems />} />
          <Route
            path="/problems/:id"
            element={
              <Suspense fallback={<div className="min-h-svh bg-ink-0" />}>
                <ProblemPage />
              </Suspense>
            }
          />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route element={<RequireAuth />}>
            <Route path="/account" element={<Account />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/mock" element={<MockHome />} />
            <Route
              path="/mock/:id"
              element={
                <Suspense fallback={<div className="min-h-svh bg-ink-0" />}>
                  <MockExamPage />
                </Suspense>
              }
            />
            <Route
              path="/submissions/:id"
              element={
                <Suspense fallback={<div className="min-h-svh bg-ink-0" />}>
                  <SubmissionDetail />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
