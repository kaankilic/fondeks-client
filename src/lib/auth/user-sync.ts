import "server-only";

/**
 * Fire-and-forget sync to the external user service at
 * `api.fondeks.com/user`. The local DB insert is still what powers the
 * session (`sessions` FKs to `users.id`), so this call never blocks the
 * signup — a non-2xx response or a thrown fetch is logged and swallowed.
 *
 * Called from `completeGoogleSignupAction` after a Google-initiated
 * signup. If the external service grows more responsibilities (auth
 * tokens, ownership of the users table), promote this from a fire-and-
 * forget sync into the real integration path.
 */
export async function syncUserToApi(payload: {
  name: string | null;
  email: string;
}): Promise<void> {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "https://api.fondeks.com").replace(
    /\/$/,
    "",
  );

  try {
    const response = await fetch(`${base}/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name ?? "",
        email: payload.email,
      }),
      // Keep the request short — this must never slow signup down.
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      console.error(
        `[user-sync] POST /user returned ${response.status}`,
        await response.text().catch(() => ""),
      );
    }
  } catch (err) {
    console.error("[user-sync] POST /user failed", err);
  }
}
