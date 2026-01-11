CREATE TYPE "public"."asset_category" AS ENUM('CASH', 'STOCK', 'REAL_ESTATE', 'LIABILITY');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "asset_account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "asset_category" NOT NULL,
	"currency" text NOT NULL,
	"isArchived" boolean DEFAULT false NOT NULL,
	"autoConfig" jsonb,
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
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL
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
	"userId" uuid NOT NULL,
	"snapDate" date NOT NULL,
	"totalNetWorth" numeric(19, 4) NOT NULL,
	"totalAssets" numeric(19, 4) DEFAULT '0',
	"totalLiabilities" numeric(19, 4) DEFAULT '0',
	"note" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"baseCurrency" text DEFAULT 'CNY',
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_account" ADD CONSTRAINT "asset_account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_item" ADD CONSTRAINT "snapshot_item_snapshotId_snapshot_id_fk" FOREIGN KEY ("snapshotId") REFERENCES "public"."snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_item" ADD CONSTRAINT "snapshot_item_assetAccountId_asset_account_id_fk" FOREIGN KEY ("assetAccountId") REFERENCES "public"."asset_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;