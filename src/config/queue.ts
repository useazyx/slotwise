/**
 * queue.ts - A fila de jobs, uma só pra API inteira (igual o prisma.ts)
 * # Pra que serve?
 * - Criar o pg-boss, que guarda os jobs numa tabela do próprio PostgreSQL (sem Redis, sem Docker)
 * - Deixar o nome das filas num lugar só
 * - O plugin liga e desliga; os services só usam pra mandar e cancelar job
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { PgBoss } from "pg-boss"
import { env } from "./env.js"

export const QUEUE_NAMES = {
  REMINDERS: "appointment-reminders",
  DAILY_AGENDA: "daily-agenda",
} as const

// O pg-boss fala com o banco pelo driver pg, que não entende o "?schema=public" que o Prisma usa
const getQueueConnectionString = (): string => {
  const url = new URL(env.DATABASE_URL)
  url.searchParams.delete("schema")
  return url.toString()
}

// As tabelas da fila ficam no schema "pgboss", separadas das tabelas da aplicação
export const queue = new PgBoss({ connectionString: getQueueConnectionString(), schema: "pgboss" })
