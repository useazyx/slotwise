import { defineConfig } from "vitest/config"

// No CI o banco de teste vem de fora; na máquina usa o Postgres padrão
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/pontual_test?schema=public"

export default defineConfig({
  test: {
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_DATABASE_URL,
      JWT_SECRET: "test-secret-pontual",
      APP_TIMEZONE: "America/Sao_Paulo",
    },
    hookTimeout: 120_000,
    testTimeout: 30_000,
    // Todas as suítes usam o mesmo banco de teste, então não podem rodar ao mesmo tempo
    fileParallelism: false,
  },
})
