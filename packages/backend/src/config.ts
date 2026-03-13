import dotenv from "dotenv";

dotenv.config();

export type AppConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  avgDays: number;
  safetyMultiplier: number;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

export const config: AppConfig = {
  port: parseNumber(process.env.PORT, 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  avgDays: parseNumber(process.env.AVG_DAYS, 30),
  safetyMultiplier: parseNumber(process.env.SAFETY_MULTIPLIER, 2)
};

if (!config.databaseUrl || !config.redisUrl) {
  throw new Error("DATABASE_URL and REDIS_URL must be set");
}
