"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Add the fund to the current user's watch list, or remove it if already there.
 * The fund-detail and watchlist buttons both bind the code and call this.
 * A logged-out caller is sent to the login screen (the UI normally routes them
 * there first, so this is a guard, not the usual path).
 */
export async function toggleWatch(code: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");

  const [existing] = await db
    .select({ id: watchlist.id })
    .from(watchlist)
    .where(and(eq(watchlist.userId, user.id), eq(watchlist.fundCode, code)))
    .limit(1);

  if (existing) {
    await db.delete(watchlist).where(eq(watchlist.id, existing.id));
  } else {
    await db
      .insert(watchlist)
      .values({ userId: user.id, fundCode: code })
      .onConflictDoNothing();
  }

  // The fund page re-renders on its own after the action; refresh the list page
  // so the change is there the next time it is opened.
  revalidatePath("/izleme");
}
