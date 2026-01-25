CREATE TYPE "public"."asset_category" AS ENUM('CASH', 'STOCK', 'FUND', 'BOND', 'REAL_ESTATE', 'LIABILITY', 'CRYPTO', 'VEHICLE', 'PRECIOUS_METAL', 'COLLECTIBLE');
--> statement-breakpoint
CREATE TABLE "account" (
    "id" text PRIMARY KEY NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp,
    "refreshTokenExpiresAt" timestamp,
    "scope" text,
    "password" text,
    "createdAt" timestamp NOT NULL,
    "updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_account" (
    "id" uuid PRIMARY KEY NOT NULL,
    "userId" text NOT NULL,
    "name" text NOT NULL,
    "category" "asset_category" NOT NULL,
    "currency" text NOT NULL,
    "isArchived" boolean DEFAULT false NOT NULL,
    "autoConfig" jsonb,
    "ticker" text,
    "market" text,
    "quantity" numeric(19, 6) DEFAULT '0',
    "costBasis" numeric(19, 4),
    "createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exchange_rate" (
    "currencyCode" text PRIMARY KEY NOT NULL,
    "rateToCny" numeric(19, 6) NOT NULL,
    "lastUpdated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
    "id" text PRIMARY KEY NOT NULL,
    "expiresAt" timestamp NOT NULL,
    "token" text NOT NULL,
    "createdAt" timestamp NOT NULL,
    "updatedAt" timestamp NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL,
    CONSTRAINT "session_token_unique" UNIQUE ("token")
);
--> statement-breakpoint
CREATE TABLE "snapshot_item" (
    "id" uuid PRIMARY KEY NOT NULL,
    "snapshotId" uuid NOT NULL,
    "assetAccountId" uuid NOT NULL,
    "originalAmount" numeric(19, 4) NOT NULL,
    "exchangeRate" numeric(19, 4) NOT NULL,
    "valuation" numeric(19, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshot" (
    "id" uuid PRIMARY KEY NOT NULL,
    "userId" text NOT NULL,
    "snapDate" date NOT NULL,
    "totalNetWorth" numeric(19, 4) NOT NULL,
    "totalAssets" numeric(19, 4) DEFAULT '0',
    "totalLiabilities" numeric(19, 4) DEFAULT '0',
    "note" text,
    "createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "emailVerified" boolean NOT NULL,
    "image" text,
    "createdAt" timestamp NOT NULL,
    "updatedAt" timestamp NOT NULL,
    "password" text,
    "baseCurrency" text DEFAULT 'CNY',
    CONSTRAINT "user_email_unique" UNIQUE ("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
    "id" text PRIMARY KEY NOT NULL,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expiresAt" timestamp NOT NULL,
    "createdAt" timestamp,
    "updatedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "asset_account" ADD CONSTRAINT "asset_account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "snapshot_item" ADD CONSTRAINT "snapshot_item_snapshotId_snapshot_id_fk" FOREIGN KEY ("snapshotId") REFERENCES "public"."snapshot"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "snapshot_item" ADD CONSTRAINT "snapshot_item_assetAccountId_asset_account_id_fk" FOREIGN KEY ("assetAccountId") REFERENCES "public"."asset_account"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;