import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/pontual_test?schema=public",
      JWT_SECRET: "test-secret-pontual",
      APP_TIMEZONE: "America/Sao_Paulo",
    },
    hookTimeout: 120_000,
    testTimeout: 30_000,
    // Todas as suítes usam o mesmo banco de teste, então não podem rodar ao mesmo tempo
    fileParallelism: false,
  },
})
