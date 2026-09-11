/**
 * GetAppointmentService.ts - Busca um agendamento pra quem participa dele
 * # Pra que serve?
 * - Devolver o agendamento só pro cliente que marcou ou pro prestador que atende
 * - Pra qualquer outra pessoa, é como se não existisse
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"
import { APPOINTMENT_SELECT, presentAppointment } from "./appointmentPresenter.js"

export const APPOINTMENT_NOT_FOUND = "Agendamento não encontrado"

export class GetAppointmentService {
  async execute(appointmentId: string, userId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, OR: [{ client_id: userId }, { provider_id: userId }] },
      select: APPOINTMENT_SELECT,
    })

    if (!appointment) throw new Error(APPOINTMENT_NOT_FOUND)

    return presentAppointment(appointment)
  }
}
