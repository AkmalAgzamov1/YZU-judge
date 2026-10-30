import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Account from "./pages/Account";
import Landing from "./pages/Landing";
import Legal from "./pages/Legal";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Problems from "./pages/Problems";
import Register from "./pages/Register";

// The editor and Markdown renderer are heavy, so load them only here.
const ProblemPage = lazy(() => import("./pages/ProblemPage"));

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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
