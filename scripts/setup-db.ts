/**
 * setup-db.ts - Deixa o .env e o banco prontos sozinhos, antes da API subir
 * # Pra que serve?
 * - Criar o .env a partir do .env.example (com um JWT_SECRET aleatório) se ele não existir
 * - Criar o banco no PostgreSQL se ele ainda não existir
 * - Aplicar as migrações pendentes e rodar o seed, quando eles já existirem
 * - Assim o `npm run dev` basta: ninguém precisa lembrar de comando nenhum na mão
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Primeira versão
 * - v1.1.0 (2026-09-11): SKIP_SEED=true pula o seed (o banco de teste começa vazio)
 *
 * Como rodar:
 *   npm run db:setup
 * O `npm run dev` já chama ele automaticamente.
 */

import { spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import dotenv from "dotenv"

const ENV_FILE = ".env"
const ENV_EXAMPLE_FILE = ".env.example"
const MIGRATIONS_DIR = "prisma/migrations"
const SEED_FILE = "prisma/seed.ts"

// Primeira vez rodando o projeto: copia o modelo e troca o segredo por um de verdade
function ensureEnvFile() {
  if (existsSync(ENV_FILE)) return

  copyFileSync(ENV_EXAMPLE_FILE, ENV_FILE)

  const secret = randomBytes(32).toString("hex")
  const content = readFileSync(ENV_FILE, "utf8").replace(/^JWT_SECRET=.*$/m, `JWT_SECRET="${secret}"`)
  writeFileSync(ENV_FILE, content)

  console.log("📝 Criei o .env a partir do .env.example (com um JWT_SECRET novo)")
  console.log("👉 Se o seu PostgreSQL não usa postgres/postgres, ajuste o DATABASE_URL lá")
}

// Roda um comando do Prisma CLI e devolve o que ele falou, sem derrubar o processo na hora
function runPrisma(args: string[], input?: string) {
  const result = spawnSync("npx", ["prisma", ...args], {
    input,
    encoding: "utf8",
    shell: process.platform === "win32",
  })

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`
  return { ok: result.status === 0, output }
}

// Separa a URL em duas: a do banco do projeto e a do banco "postgres",
// que é onde a gente precisa estar conectado pra conseguir criar um banco novo.
function splitDatabaseUrl(rawUrl: string) {
  const url = new URL(rawUrl)
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""))

  const serverUrl = new URL(rawUrl)
  serverUrl.pathname = "/postgres"
  serverUrl.search = ""

  return { databaseName, serverUrl: serverUrl.toString() }
}

// Cria o banco se ele ainda não existe. Se já existe, o Prisma reclama e a gente ignora.
function ensureDatabaseExists(databaseName: string, serverUrl: string) {
  const { ok, output } = runPrisma(
    ["db", "execute", "--url", serverUrl, "--stdin"],
    `CREATE DATABASE "${databaseName}";`
  )

  if (ok) {
    console.log(`🗄️  Banco "${databaseName}" criado`)
    return
  }

  if (/already exists|P1009/i.test(output)) {
    console.log(`🗄️  Banco "${databaseName}" já existia`)
    return
  }

  // Qualquer outro erro aqui é problema de verdade: servidor fora do ar, senha errada etc.
  console.error("\n❌ Não deu pra falar com o PostgreSQL.\n")
  console.error("   Confira se o serviço está rodando e se o DATABASE_URL do .env está certo.")
  console.error(`   Resposta do Prisma:\n${output.trim()}\n`)
  process.exit(1)
}

// Aplica as migrações que ainda não foram pro banco (se já tiver alguma)
function applyMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.log("📐 Ainda não tem migração, pulando")
    return
  }

  const { ok, output } = runPrisma(["migrate", "deploy"])

  if (!ok) {
    console.error("\n❌ As migrações falharam.\n")
    console.error(output.trim())
    console.error("\n   Pra começar o banco do zero: npx prisma migrate reset")
    process.exit(1)
  }

  console.log("📐 Migrações aplicadas")
}

// Roda o seed, que precisa ser idempotente (upsert) pra rodar em todo `npm run dev`
function runSeed() {
  if (process.env.SKIP_SEED === "true") {
    console.log("🌱 SKIP_SEED ligado, pulando o seed")
    return
  }

  if (!existsSync(SEED_FILE)) {
    console.log("🌱 Ainda não tem seed, pulando")
    return
  }

  const result = spawnSync("npx", ["prisma", "db", "seed"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  })

  if (result.status !== 0) {
    console.error("\n❌ O seed falhou.\n")
    process.exit(1)
  }
}

function main() {
  ensureEnvFile()
  dotenv.config({ quiet: true })

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error("\n❌ Falta o DATABASE_URL no .env.\n")
    process.exit(1)
  }

  const { databaseName, serverUrl } = splitDatabaseUrl(databaseUrl)

  ensureDatabaseExists(databaseName, serverUrl)
  applyMigrations()
  runSeed()
}

main()
