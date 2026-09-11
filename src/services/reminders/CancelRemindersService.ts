/**
 * CancelRemindersService.ts - Cancela os lembretes que ainda não saíram
 * # Pra que serve?
 * - Tirar da fila os jobs de um agendamento cancelado ou remarcado
 * - Marcar os lembretes como cancelados (pra ninguém receber aviso de horário que não existe mais)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"
import { QUEUE_NAMES, queue } from "../../config/queue.js"

export class CancelRemindersService {
  async execute(appointmentId: string) {
    const pending = await prisma.reminder.findMany({
      where: { appointment_id: appointmentId, status: "PENDING" },
      select: { job_id: true },
    })

    const jobIds = pending.map((reminder) => reminder.job_id).filter((jobId): jobId is string => Boolean(jobId))

    // Cancela na fila primeiro; mesmo se algum job escapar, o worker confere o status antes de avisar
    if (jobIds.length > 0) await queue.cancel(QUEUE_NAMES.REMINDERS, jobIds)

    const { count } = await prisma.reminder.updateMany({
      where: { appointment_id: appointmentId, status: "PENDING" },
      data: { status: "CANCELED" },
    })

    return count
  }
}
