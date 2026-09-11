/**
 * env.ts - Lê e valida as variáveis de ambiente antes de qualquer coisa subir
 * # Pra que serve?
 * - Garantir que o .env tem tudo que a API precisa (se faltar algo, nem sobe)
 * - Entregar as variáveis já convertidas (porta como número etc.) pro resto do código
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 * - v1.1.0 (2026-09-11): QUEUE_WORKERS_ENABLED pra ligar/desligar os workers da fila
 */

import { config } from "dotenv"
import { z } from "zod"

// Carrega o .env (nos testes o vitest já manda as variáveis, e o dotenv não sobrescreve)
config({ quiet: true })

// O formato que a gente espera de cada variável
const ENV_SCHEMA = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3335),
  HOST: z.string().default("0.0.0.0"),
  APP_TIMEZONE: z.string().default("America/Sao_Paulo"),
  DATABASE_URL: z.string().min(1, "Falta o DATABASE_URL"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET muito curto, usa pelo menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  // Nos testes fica desligado: a fila aceita job, mas ninguém processa (os testes chamam o worker direto)
  QUEUE_WORKERS_ENABLED: z.stringbool().default(true),
})

const parsed = ENV_SCHEMA.safeParse(process.env)

// Se tiver algo errado, mostra exatamente o quê e para tudo (melhor que quebrar lá na frente)
if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:")
  console.error(z.prettifyError(parsed.error))
  console.error("👉 Confere o .env (o modelo tá no .env.example)")
  process.exit(1)
}

export const env = parsed.data
