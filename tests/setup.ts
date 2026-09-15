import "dotenv/config";

// Ensure test environment variables are set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set for tests");
}
