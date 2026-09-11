/**
 * index.ts - Liga os workers da fila e os jobs que se repetem
 * # Pra que serve?
 * - Dizer qual função processa cada fila (tipo a escala de quem atende cada balcão)
 * - Agendar a agenda do dia pra sair todo dia às 07:00 no fuso do negócio
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Worker de lembretes
 * - v1.1.0 (2026-09-11): Worker e agendamento diário da agenda dos prestadores
 */

import { env } from "../config/env.js"
import { QUEUE_NAMES, queue } from "../config/queue.js"
import type { ReminderJobData } from "../services/reminders/ScheduleRemindersService.js"
import { handleDailyAgendaJobs } from "./dailyAgendaWorker.js"
import { handleReminderJobs } from "./reminderWorker.js"

// Todo dia às 07:00 (minuto hora dia mês dia-da-semana)
export const DAILY_AGENDA_CRON = "0 7 * * *"

export async function registerWorkers() {
  // Pega até 5 lembretes por vez (pra não acumular quando muita gente tem horário no mesmo minuto)
  await queue.work<ReminderJobData>(QUEUE_NAMES.REMINDERS, { batchSize: 5 }, handleReminderJobs)
  await queue.work<object>(QUEUE_NAMES.DAILY_AGENDA, handleDailyAgendaJobs)

  await scheduleRecurringJobs()
}

// O schedule fica salvo no banco; chamar de novo a cada subida só atualiza (não duplica)
export async function scheduleRecurringJobs() {
  await queue.schedule(QUEUE_NAMES.DAILY_AGENDA, DAILY_AGENDA_CRON, null, { tz: env.APP_TIMEZONE })
}
