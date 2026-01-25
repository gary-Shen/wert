'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { assetAccounts } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { searchSymbols, SearchResult } from "@/lib/services/price";

// Drizzle Inferred Types
export type AssetAccount = typeof assetAccounts.$inferSelect;
export type NewAssetAccount = typeof assetAccounts.$inferInsert;

export type AssetFormData = {
  name: string;
  type: string;
  currency: string;
  symbol?: string;
  market?: string;
  quantity?: string;
  costBasis?: string;
  metadata?: Record<string, any>;
};

// Helper: protect routes
async function getAuthUser() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function createAsset(data: AssetFormData) {
  const userId = await getAuthUser();

  const newAsset: NewAssetAccount = {
    userId,
    name: data.name,
    category: data.type as NewAssetAccount['category'], // Cast strictly to schema type
    currency: data.currency,
    symbol: data.symbol || null,
    market: data.market || null,
    quantity: data.quantity || "0",
    costBasis: data.costBasis || null,
    autoConfig: data.metadata,
    isArchived: false,
  };

  await db.insert(assetAccounts).values(newAsset);
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

export async function unarchiveAsset(id: string) {
  const userId = await getAuthUser();
  await db.update(assetAccounts)
    .set({ isArchived: false })
    .where(and(eq(assetAccounts.id, id), eq(assetAccounts.userId, userId)));
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function deleteAsset(id: string) {
  const userId = await getAuthUser();
  await db.delete(assetAccounts)
    .where(and(eq(assetAccounts.id, id), eq(assetAccounts.userId, userId)));
  revalidatePath("/settings");
}

export async function getAssets(): Promise<AssetAccount[]> {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) return []; // Return empty on server component load if not auth

  return db.select()
    .from(assetAccounts)
    .where(eq(assetAccounts.userId, session.user.id))
    .orderBy(desc(assetAccounts.createdAt));
}

export async function searchAssetSymbols(query: string): Promise<SearchResult[]> {
  return await searchSymbols(query);
}
