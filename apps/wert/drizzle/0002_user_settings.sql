-- Migration: Add user settings fields
-- Add setupComplete, locale, and region fields to user table

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "setupComplete" boolean DEFAULT false NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "locale" text DEFAULT 'zh-CN';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "region" text;
