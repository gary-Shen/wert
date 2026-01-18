import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  uuid,
  jsonb,
  decimal,
  date,
  pgEnum
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// --- Enums ---
export const assetCategoryEnum = pgEnum("asset_category", ["CASH", "STOCK", "FUND", "BOND", "REAL_ESTATE", "LIABILITY", "CRYPTO", "VEHICLE", "PRECIOUS_METAL", "COLLECTIBLE"]);

// --- Auth Core (NextAuth) ---
export const users = pgTable("user", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Custom Fields
  password: text("password"), // For Credentials Provider
  baseCurrency: text("baseCurrency").default("CNY"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

// --- App Business Logic ---

export const assetAccounts = pgTable("asset_account", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: assetCategoryEnum("category").notNull(),
  currency: text("currency").notNull(), // e.g. "USD"
  isArchived: boolean("isArchived").default(false).notNull(),
  autoConfig: jsonb("autoConfig"), // { tyoe: 'depreciation', ... }
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
});

export const snapshots = pgTable("snapshot", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  snapDate: date("snapDate").notNull(), // YYYY-MM-DD
  // Redundant Totals (Stored as Decimal/Numeric string)
  totalNetWorth: decimal("totalNetWorth", { precision: 19, scale: 4 }).notNull(),
  totalAssets: decimal("totalAssets", { precision: 19, scale: 4 }).default("0"),
  totalLiabilities: decimal("totalLiabilities", { precision: 19, scale: 4 }).default("0"),
  note: text("note"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
});

export const snapshotItems = pgTable("snapshot_item", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  snapshotId: uuid("snapshotId")
    .notNull()
    .references(() => snapshots.id, { onDelete: "cascade" }),
  assetAccountId: uuid("assetAccountId")
    .notNull()
    .references(() => assetAccounts.id, { onDelete: "cascade" }),
  originalAmount: decimal("originalAmount", { precision: 19, scale: 4 }).notNull(),
  exchangeRate: decimal("exchangeRate", { precision: 19, scale: 4 }).notNull(), // Locked rate
  valuation: decimal("valuation", { precision: 19, scale: 4 }).notNull(), // CNY Value
});

// Cache for Exchange Rates (Global, not per user) -> Should this use Text ID?
export const exchangeRates = pgTable("exchange_rate", {
  currencyCode: text("currencyCode").primaryKey(),
  rateToCny: decimal("rateToCny", { precision: 19, scale: 6 }).notNull(),
  lastUpdated: timestamp("lastUpdated", { mode: "date" }).defaultNow(),
});
