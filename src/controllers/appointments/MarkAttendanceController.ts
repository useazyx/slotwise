/**
 * MarkAttendanceController.ts - Recebe do prestador se o cliente veio ou faltou
 * # Pra que serve?
 * - Mandar o status (DONE ou NO_SHOW) pro service fechar o agendamento
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { MarkAttendanceBody } from "../../schemas/appointmentSchemas.js"
import type { IdParams } from "../../schemas/commonSchemas.js"
import { APPOINTMENT_NOT_ACTIVE } from "../../services/appointments/CancelAppointmentService.js"
import { APPOINTMENT_NOT_FOUND } from "../../services/appointments/GetAppointmentService.js"
import { ATTENDANCE_TOO_EARLY, MarkAttendanceService } from "../../services/appointments/MarkAttendanceService.js"

export class MarkAttendanceController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const { id } = req.params as IdParams
    const { status } = req.body as MarkAttendanceBody

    try {
      const markAttendanceService = new MarkAttendanceService()
      const appointment = await markAttendanceService.execute({
        appointment_id: id,
        provider_id: req.user.sub,
        status,
      })

      return rep.status(200).send(appointment)
    } catch (error) {
      return this.handleServiceError(error, rep)
    }
  }

  private handleServiceError(error: unknown, rep: FastifyReply) {
    const errorMappings = [
      {
        message: APPOINTMENT_NOT_FOUND,
        handler: () =>
          rep.status(404).send({ error: "AppointmentNotFound", message: "Não achei esse agendamento na sua agenda" }),
      },
      {
        message: APPOINTMENT_NOT_ACTIVE,
        handler: () =>
          rep.status(409).send({
            error: "AppointmentNotActive",
            message: "Esse agendamento já foi cancelado ou fechado",
          }),
      },
      {
        message: ATTENDANCE_TOO_EARLY,
        handler: () =>
          rep.status(409).send({
            error: "AttendanceTooEarly",
            message: "Só dá pra marcar presença ou falta depois que o horário começa",
          }),
      },
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "registro de presença")
  }
}
