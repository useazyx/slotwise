/**
 * index.ts - Liga os workers da fila
 * # Pra que serve?
 * - Dizer qual função processa cada fila (tipo a escala de quem atende cada balcão)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Worker de lembretes
 */

import { QUEUE_NAMES, queue } from "../config/queue.js"
import type { ReminderJobData } from "../services/reminders/ScheduleRemindersService.js"
import { handleReminderJobs } from "./reminderWorker.js"

export async function registerWorkers() {
  // Pega até 5 lembretes por vez (pra não acumular quando muita gente tem horário no mesmo minuto)
  await queue.work<ReminderJobData>(QUEUE_NAMES.REMINDERS, { batchSize: 5 }, handleReminderJobs)
}
