import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Booking tests hit the same (remote) database; run serially.
    fileParallelism: false,
    // Each booking write is several round-trips to a hosted Postgres, so the
    // 5s default aborts healthy tests before the database has answered.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
