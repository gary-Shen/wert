'use server'

import { auth } from "@/auth";
import { db } from "@/db";
import { assetAccounts, assetCategoryEnum } from "@/db/schema"; // Ensure assetCategoryEnum is exported, or use raw string if driver handles it
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AssetFormData = {
  name: string;
  type: "CASH" | "STOCK" | "REAL_ESTATE" | "LIABILITY"; // Changed from fixed to real_estate/stock per schema
  currency: string;
  metadata?: any;
};

// Helper: protect routes
async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");
  return session.user.id;
}

export async function createAsset(data: AssetFormData) {
  const userId = await getAuthUser();
  
  await db.insert(assetAccounts).values({
    userId,
    name: data.name,
    category: data.type as any, // Enum mapping needs care
    currency: data.currency,
    autoConfig: data.metadata,
    isArchived: false,
  });
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function archiveAsset(id: string) { // UUID
  const userId = await getAuthUser();
  await db.update(assetAccounts)
    .set({ isArchived: true })
    .where(and(eq(assetAccounts.id, id), eq(assetAccounts.userId, userId))); // Ensure ownership
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function deleteAsset(id: string) {
    const userId = await getAuthUser();
    await db.delete(assetAccounts)
        .where(and(eq(assetAccounts.id, id), eq(assetAccounts.userId, userId)));
    revalidatePath("/settings");
}

export async function getAssets() {
  const session = await auth();
  if (!session?.user?.id) return []; // Return empty on server component load if not auth
  
  return db.select()
    .from(assetAccounts)
    .where(eq(assetAccounts.userId, session.user.id))
    .orderBy(desc(assetAccounts.createdAt));
}
