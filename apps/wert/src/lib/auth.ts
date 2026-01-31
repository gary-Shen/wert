import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL,
  database: drizzleAdapter(db, {
    provider: "pg", // or "postgres"
  }),
  logger: {
    level: "debug",
    disabled: false,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ["user:email", "read:user"],
    },
  },
  user: {
    additionalFields: {
      password: {
        type: "string",
        required: false,
      },
      baseCurrency: {
        type: "string",
        defaultValue: "CNY",
      },
    },
  },
});