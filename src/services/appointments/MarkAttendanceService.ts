/**
 * MarkAttendanceService.ts - O prestador diz como foi o atendimento
 * # Pra que serve?
 * - Fechar o agendamento como DONE (atendeu) ou NO_SHOW (cliente não apareceu)
 * - Só o prestador daquele agendamento, e só depois que o horário começou
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"
import { CancelRemindersService } from "../reminders/CancelRemindersService.js"
import { APPOINTMENT_NOT_ACTIVE } from "./CancelAppointmentService.js"
import { APPOINTMENT_NOT_FOUND, GetAppointmentService } from "./GetAppointmentService.js"

export const ATTENDANCE_TOO_EARLY = "Atendimento ainda não começou"

// O que a gente precisa pra registrar:
interface MarkAttendanceRequest {
  appointment_id: string
  provider_id: string
  status: "DONE" | "NO_SHOW"
}

export class MarkAttendanceService {
  async execute({ appointment_id, provider_id, status }: MarkAttendanceRequest) {
    const appointment = await this.findProviderAppointment(appointment_id, provider_id)

    if (appointment.status !== "SCHEDULED") throw new Error(APPOINTMENT_NOT_ACTIVE)

    // Não dá pra dizer que o cliente faltou antes do horário chegar
    if (appointment.starts_at.getTime() > Date.now()) throw new Error(ATTENDANCE_TOO_EARLY)

    const { count } = await prisma.appointment.updateMany({
      where: { id: appointment_id, status: "SCHEDULED" },
      data: { status },
    })
    if (count === 0) throw new Error(APPOINTMENT_NOT_ACTIVE)

    // Se sobrou algum lembrete pendente, não tem mais por que sair
    const cancelRemindersService = new CancelRemindersService()
    await cancelRemindersService.execute(appointment_id)

    const getAppointmentService = new GetAppointmentService()
    return getAppointmentService.execute(appointment_id, provider_id)
  }

  private async findProviderAppointment(appointmentId: string, providerId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, provider_id: providerId },
      select: { status: true, starts_at: true },
    })

    if (!appointment) throw new Error(APPOINTMENT_NOT_FOUND)
    return appointment
  }
}
