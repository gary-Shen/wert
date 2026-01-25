import { z } from "zod";

export const StandardRateSchema = z.object({
  base: z.string().length(3),
  rates: z.record(z.string().length(3), z.number()),
  timestamp: z.number(),
  provider: z.string(),
  weight: z.number().min(1).max(10), // 权重：1-10
});

export type StandardRate = z.infer<typeof StandardRateSchema>;