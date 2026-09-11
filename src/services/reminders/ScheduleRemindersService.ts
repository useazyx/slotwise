/**
 * ScheduleRemindersService.ts - Agenda os lembretes de um horário marcado
 * # Pra que serve?
 * - Criar o lembrete de 24 horas antes e o de 1 hora antes
 * - Mandar cada um pra fila com startAfter: o job só fica pronto na hora de avisar
 * - Pular lembrete que já teria passado (marcou hoje pra daqui a 3 horas? só o de 1 hora)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { ReminderKind } from "@prisma/client"
import { prisma } from "../../config/prisma.js"
import { QUEUE_NAMES, queue } from "../../config/queue.js"

// O que vai dentro do job: só o id, o resto o worker busca fresquinho no banco
export interface ReminderJobData {
  reminder_id: string
}

// Quanto tempo antes do horário sai cada lembrete
const REMINDER_OFFSETS: { kind: ReminderKind; minutes_before: number }[] = [
  { kind: "DAY_BEFORE", minutes_before: 24 * 60 },
  { kind: "HOUR_BEFORE", minutes_before: 60 },
]

// O que a gente precisa pra agendar:
interface ScheduleRemindersRequest {
  appointment_id: string
  starts_at: Date
}

export class ScheduleRemindersService {
  async execute({ appointment_id, starts_at }: ScheduleRemindersRequest) {
    const scheduled: ReminderKind[] = []

    for (const offset of REMINDER_OFFSETS) {
      const scheduledFor = new Date(starts_at.getTime() - offset.minutes_before * 60_000)

      // Lembrete que já teria saído não faz sentido
      if (scheduledFor.getTime() <= Date.now()) continue

      await this.scheduleOne(appointment_id, offset.kind, scheduledFor)
      scheduled.push(offset.kind)
    }

    return scheduled
  }

  // Salva o lembrete primeiro (pra ter o id), manda o job e guarda o id do job pra poder cancelar depois
  private async scheduleOne(appointmentId: string, kind: ReminderKind, scheduledFor: Date) {
    const reminder = await prisma.reminder.create({
      data: { appointment_id: appointmentId, kind, scheduled_for: scheduledFor },
      select: { id: true },
    })

    const data: ReminderJobData = { reminder_id: reminder.id }
    const jobId = await queue.send(QUEUE_NAMES.REMINDERS, data, { startAfter: scheduledFor })

    await prisma.reminder.update({ where: { id: reminder.id }, data: { job_id: jobId } })
  }
}
