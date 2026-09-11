/**
 * global-setup.ts - Prepara o banco de teste uma vez antes de todas as suítes
 * # Pra que serve?
 * - Criar o pontual_test se não existir e aplicar as migrações
 * - Reaproveitar o mesmo script do `npm run dev`, só que sem seed
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { spawnSync } from "node:child_process"

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/pontual_test?schema=public"

export default function setup() {
  const result = spawnSync("npx", ["tsx", "scripts/setup-db.ts"], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, SKIP_SEED: "true" },
    stdio: "inherit",
    shell: process.platform === "win32",
  })

  if (result.status !== 0) {
    throw new Error("Não deu pra preparar o banco de teste (o PostgreSQL tá rodando?)")
  }
}
