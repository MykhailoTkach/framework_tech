import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.js"],
    pool: "forks",
    maxWorkers: 1,
    minWorkers: 1,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["services/**", "routes/**", "controllers/**", "utils/**"],
      exclude: [
        "server.js",
        "constants/**",
        "config/**",
        "schemas/**",
        "data/**",
        "db/**",
        "utils/atomicWrite.js",
        "utils/backup.js",
        "utils/fetchWithRetry.js",
        "controllers/github.controller.js",
        "controllers/books.controller.js",
        "routes/github.routes.js",
        "routes/ws.routes.js",
        "routes/health.routes.js",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
