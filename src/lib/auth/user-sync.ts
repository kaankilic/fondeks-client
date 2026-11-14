import "server-only";

/**
 * POSTs the new account to the external user service at
 * `api.fondeks.com/user`. This is the ONLY persistence path for a
 * Google-initiated signup now — nothing is written locally — so the
 * caller must know whether the write succeeded. Returns `true` on a
 * 2xx response, `false` otherwise; errors log server-side.
 */
export async function syncUserToApi(payload: {
  name: string | null;
  email: string;
}): Promise<boolean> {
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
      // Short timeout so a slow upstream doesn't stall the signup page.
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      console.error(
        `[user-sync] POST /user returned ${response.status}`,
        await response.text().catch(() => ""),
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[user-sync] POST /user failed", err);
    return false;
  }
}
