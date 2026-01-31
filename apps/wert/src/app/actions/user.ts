'use server'

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// Types
export type UserSettings = {
  id: string
  name: string
  email: string
  image: string | null
  baseCurrency: string | null
  setupComplete: boolean
  locale: string | null
  region: string | null
}

// Helper: protect routes
async function getAuthUser() {
  const session = await auth.api.getSession({
    headers: await headers()
  })
  if (!session?.user?.id) redirect("/login")
  return session.user.id
}

/**
 * Get current user settings
 */
export async function getUserSettings(): Promise<UserSettings | null> {
  const session = await auth.api.getSession({
    headers: await headers()
  })
  if (!session?.user?.id) return null

  const [userData] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      baseCurrency: user.baseCurrency,
      setupComplete: user.setupComplete,
      locale: user.locale,
      region: user.region,
    })
    .from(user)
    .where(eq(user.id, session.user.id))

  return userData || null
}

/**
 * Complete initial setup (first-time currency selection)
 * This is a one-time operation - cannot be changed after
 */
export async function completeSetup(
  baseCurrency: string,
  region: 'CN' | 'OVERSEAS',
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthUser()

  // Check if already completed
  const [existing] = await db
    .select({ setupComplete: user.setupComplete })
    .from(user)
    .where(eq(user.id, userId))

  if (existing?.setupComplete) {
    return { success: false, error: '设置已完成，无法修改基准货币' }
  }

  // Update user settings
  await db
    .update(user)
    .set({
      baseCurrency,
      region,
      locale,
      setupComplete: true,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))

  revalidatePath("/")
  return { success: true }
}

/**
 * Update user profile (name only, other fields are read-only or managed elsewhere)
 */
export async function updateUserProfile(
  name: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthUser()

  if (!name || name.trim().length === 0) {
    return { success: false, error: '名称不能为空' }
  }

  await db
    .update(user)
    .set({
      name: name.trim(),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))

  revalidatePath("/")
  return { success: true }
}

/**
 * Update user locale preference
 */
export async function updateUserLocale(
  locale: string
): Promise<{ success: boolean }> {
  const userId = await getAuthUser()

  await db
    .update(user)
    .set({
      locale,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))

  revalidatePath("/")
  return { success: true }
}

/**
 * Update user settings (base currency, etc.)
 */
export async function updateUserSettings(
  settings: { baseCurrency?: string }
): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthUser()

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (settings.baseCurrency) {
    updateData.baseCurrency = settings.baseCurrency
  }

  await db
    .update(user)
    .set(updateData)
    .where(eq(user.id, userId))

  revalidatePath("/")
  return { success: true }
}

