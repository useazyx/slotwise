/**
 * queue.ts - Liga a fila de jobs junto com a API
 * # Pra que serve?
 * - Iniciar o pg-boss (ele cria as próprias tabelas na primeira vez)
 * - Criar as filas com a regra de nova tentativa de cada uma
 * - Parar a fila direitinho quando a API desliga (sem largar job pela metade)
 * - Por que fila e não setTimeout? Se o servidor reiniciar, o setTimeout some; o job no banco não
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import fp from "fastify-plugin"
import { QUEUE_NAMES, queue } from "../config/queue.js"

// Lembrete tenta de novo até 5 vezes, esperando cada vez mais (1 min, 2 min, 4 min...)
const QUEUE_SETTINGS = [
  { name: QUEUE_NAMES.REMINDERS, options: { retryLimit: 5, retryDelay: 60, retryBackoff: true } },
  { name: QUEUE_NAMES.DAILY_AGENDA, options: { retryLimit: 2, retryDelay: 300 } },
]

export const queuePlugin = fp(async (app) => {
  // Erro da fila não derruba a API, mas precisa aparecer no log
  queue.on("error", (error) => app.log.error(error, "Deu ruim na fila de jobs"))

  await queue.start()
  await ensureQueues()

  app.addHook("onClose", async () => {
    await queue.stop({ graceful: true, timeout: 10_000 })
  })
})

// Cria só as filas que ainda não existem (a API sobe várias vezes e não pode dar erro na segunda)
async function ensureQueues() {
  for (const { name, options } of QUEUE_SETTINGS) {
    const existing = await queue.getQueue(name)
    if (!existing) await queue.createQueue(name, options)
  }
}
