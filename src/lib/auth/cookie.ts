/**
 * The name of the session cookie, shared between the server session module
 * (which pulls in `server-only` and Node crypto) and the Edge middleware
 * (which must not). Keeping it here means middleware can check for the
 * cookie's presence without dragging the full server session surface — and
 * its node-only imports — into the Edge runtime bundle.
 */
export const SESSION_COOKIE = "fondeks_session";
