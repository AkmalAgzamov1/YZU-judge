import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, ApiError, type AdminUser } from "../../api/client";
import Message from "../../components/Message";
import { buttonSecondary, focusRing } from "../../components/ui";
import { formatDateTime, formatRelative } from "../../lib/format";
import AdminLayout from "./AdminLayout";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; users: AdminUser[] };

const columns = "md:grid-cols-[1fr_120px_96px_80px_128px]";

export default function AdminUsers() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [verifyError, setVerifyError] = useState("");

  async function verify(id: number) {
    setVerifyingId(id);
    setVerifyError("");

    try {
      await adminApi.verifyUser(id);
      setState((current) =>
        current.kind === "ready"
          ? { ...current, users: current.users.map((user) => (user.id === id ? { ...user, email_verified: true } : user)) }
          : current,
      );
    } catch (error) {
      setVerifyError(error instanceof ApiError ? error.message : "The user could not be verified.");
    } finally {
      setVerifyingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    adminApi.users().then(
      (users) => {
        if (!cancelled) setState({ kind: "ready", users });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ kind: "error", message: error instanceof ApiError ? error.message : "Users could not be loaded." });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const totalSubmissions = state.kind === "ready" ? state.users.reduce((sum, user) => sum + user.submissions, 0) : 0;

  return (
    <AdminLayout
      title="Users"
      description={
        state.kind === "ready"
          ? `${state.users.length} ${state.users.length === 1 ? "account" : "accounts"}, ${totalSubmissions} ${totalSubmissions === 1 ? "submission" : "submissions"} in total. Open a user to see their submissions.`
          : "Everyone with an account, and how much they practice."
      }
    >
      {state.kind === "loading" && (
        <div aria-busy="true" aria-label="Loading users" className="flex animate-pulse flex-col gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-14 rounded-lg bg-ink-1" />
          ))}
        </div>
      )}

      {state.kind === "error" && (
        <Message
          title="Users could not be loaded"
          body={state.message}
          action={
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => {
                setState({ kind: "loading" });
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </button>
          }
        />
      )}

      {state.kind === "ready" && state.users.length === 0 && (
        <Message title="No accounts yet" body="Users show up here as soon as they register." />
      )}

      {state.kind === "ready" && state.users.some((user) => !user.email_verified) && (
        <section aria-labelledby="unverified-heading" className="mb-12">
          <h2 id="unverified-heading" className="font-mono text-xs text-neutral-500">
            Waiting for email verification
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            They cannot sign in yet and are deleted a day after signing up. Verify one by hand only if you know the
            email is theirs, for example when the code never arrives.
          </p>
          <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {state.users
              .filter((user) => !user.email_verified)
              .map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-4 px-3 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-base font-medium text-white">{user.username}</span>
                    <span className="block truncate text-sm text-neutral-500">
                      {user.email}
                      {user.created_at && ` · signed up ${formatRelative(user.created_at)}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={verifyingId === user.id}
                    onClick={() => void verify(user.id)}
                    className={buttonSecondary}
                  >
                    {verifyingId === user.id ? "Verifying…" : "Mark verified"}
                  </button>
                </li>
              ))}
          </ul>
          {verifyError && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {verifyError}
            </p>
          )}
        </section>
      )}

      {state.kind === "ready" && state.users.length > 0 && (
        <>
          <div aria-hidden="true" className={`hidden gap-4 px-3 pb-3 font-mono text-xs text-neutral-500 md:grid ${columns}`}>
            <span>User</span>
            <span>Joined</span>
            <span className="text-right">Submissions</span>
            <span className="text-right">Solved</span>
            <span className="text-right">Last submit</span>
          </div>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {state.users.map((user) => (
              <li key={user.id}>
                <Link
                  to={`/admin/submissions?user=${user.id}`}
                  className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg px-3 py-4 transition duration-300 ease-soft hover:bg-ink-1 ${columns} ${focusRing}`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-base font-medium text-white">{user.username}</span>
                      {user.is_admin && (
                        <span className="rounded border border-white/10 px-1 font-mono text-xs text-neutral-400">admin</span>
                      )}
                      {!user.email_verified && (
                        <span className="rounded border border-yzu-yellow/40 px-1 font-mono text-xs text-yzu-yellow">unverified</span>
                      )}
                    </span>
                    <span className="block truncate text-sm text-neutral-500">{user.email}</span>
                  </span>
                  <span className="hidden font-mono text-sm text-neutral-400 md:block">
                    {user.created_at ? formatDateTime(user.created_at).split(",").slice(0, 2).join(",") : "—"}
                  </span>
                  <span className="row-start-1 text-right font-mono text-sm text-neutral-300 md:row-start-auto">
                    {user.submissions}
                    <span className="text-neutral-500 md:hidden"> submits</span>
                  </span>
                  <span className="hidden text-right font-mono text-sm text-emerald-400 md:block">{user.solved}</span>
                  <span
                    className="col-span-2 font-mono text-xs text-neutral-500 md:col-span-1 md:text-right md:text-sm"
                    title={user.last_submission_at ? formatDateTime(user.last_submission_at) : undefined}
                  >
                    {user.last_submission_at ? formatRelative(user.last_submission_at) : "never"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminLayout>
  );
}
