import "dotenv/config";

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT ?? 5000),
  // DATABASE_URL is required at runtime for DB operations but not for prisma generate.
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-jwt-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30m",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  cookieSecure: process.env.COOKIE_SECURE === "true" || isProduction,
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "",
  // Max unauthorized route attempts before a temporary auth lock.
  maxUnauthorizedAttempts: 3,
  authLockDurationMinutes: 5,
} as const;
