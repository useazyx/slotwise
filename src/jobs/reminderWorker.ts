/**
 * reminderWorker.ts - O worker que processa a fila de lembretes
 * # Pra que serve?
 * - Pegar os jobs que ficaram prontos e mandar cada lembrete
 * - Se der erro, o pg-boss tenta de novo sozinho (regra de retry da fila)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { Job } from "pg-boss"
import type { ReminderJobData } from "../services/reminders/ScheduleRemindersService.js"
import { SendReminderService } from "../services/reminders/SendReminderService.js"

export async function handleReminderJobs(jobs: Job<ReminderJobData>[]) {
  const sendReminderService = new SendReminderService()

  for (const job of jobs) {
    await sendReminderService.execute(job.data.reminder_id)
  }
}
