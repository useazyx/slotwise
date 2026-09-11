/**
 * CancelAppointmentService.ts - Cancela um agendamento
 * # Pra que serve?
 * - Cliente cancela até 2 horas antes; prestador cancela quando precisar
 * - Só dá pra cancelar o que ainda está marcado (cancelado ou concluído não volta)
 * - O horário volta a ficar livre na hora, porque a constraint só olha agendamento SCHEDULED
 * - Os lembretes que ainda não saíram são cancelados junto
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 * - v1.1.0 (2026-09-11): Cancela os lembretes pendentes
 */

import type { UserRole } from "@prisma/client"
import { CLIENT_CANCEL_NOTICE_MINUTES } from "../../config/bookingRules.js"
import { prisma } from "../../config/prisma.js"
import { CancelRemindersService } from "../reminders/CancelRemindersService.js"
import { APPOINTMENT_NOT_FOUND, GetAppointmentService } from "./GetAppointmentService.js"

export const APPOINTMENT_NOT_ACTIVE = "Agendamento não está mais marcado"
export const TOO_LATE_TO_CHANGE = "Muito em cima da hora pra mudar o agendamento"

// O que a gente precisa pra cancelar:
interface CancelAppointmentRequest {
  appointment_id: string
  user_id: string
  role: UserRole
  reason?: string
}

export class CancelAppointmentService {
  async execute({ appointment_id, user_id, role, reason }: CancelAppointmentRequest) {
    const appointment = await this.findForParticipant(appointment_id, user_id)

    if (appointment.status !== "SCHEDULED") throw new Error(APPOINTMENT_NOT_ACTIVE)
    if (role === "CLIENT") this.ensureClientNotice(appointment.starts_at)

    await this.markAsCanceled(appointment_id, reason)

    const cancelRemindersService = new CancelRemindersService()
    await cancelRemindersService.execute(appointment_id)

    const getAppointmentService = new GetAppointmentService()
    return getAppointmentService.execute(appointment_id, user_id)
  }

  private async findForParticipant(appointmentId: string, userId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, OR: [{ client_id: userId }, { provider_id: userId }] },
      select: { status: true, starts_at: true },
    })

    if (!appointment) throw new Error(APPOINTMENT_NOT_FOUND)
    return appointment
  }

  // Cliente precisa avisar com antecedência (pra o prestador conseguir encaixar outra pessoa)
  private ensureClientNotice(startsAt: Date) {
    const minutesUntilStart = (startsAt.getTime() - Date.now()) / 60_000
    if (minutesUntilStart < CLIENT_CANCEL_NOTICE_MINUTES) throw new Error(TOO_LATE_TO_CHANGE)
  }

  // O status no filtro evita cancelar duas vezes se dois pedidos chegarem juntos
  private async markAsCanceled(appointmentId: string, reason?: string) {
    const { count } = await prisma.appointment.updateMany({
      where: { id: appointmentId, status: "SCHEDULED" },
      data: { status: "CANCELED", canceled_at: new Date(), cancel_reason: reason ?? null },
    })

    if (count === 0) throw new Error(APPOINTMENT_NOT_ACTIVE)
  }
}
