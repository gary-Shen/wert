CREATE TABLE "asset_price" (
	"id" uuid PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"assetType" text NOT NULL,
	"price" numeric(19, 4) NOT NULL,
	"currency" text NOT NULL,
	"priceDate" date NOT NULL,
	"source" text NOT NULL,
	"updatedAt" timestamp DEFAULT now()
);
