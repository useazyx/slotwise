/**
 * CancelAppointmentController.ts - Recebe o cancelamento de um agendamento
 * # Pra que serve?
 * - Mandar quem está pedindo (e o papel) pro service aplicar a regra de antecedência
 * - Explicar quando não dá mais pra cancelar
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { CLIENT_CANCEL_NOTICE_MINUTES } from "../../config/bookingRules.js"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { CancelAppointmentBody } from "../../schemas/appointmentSchemas.js"
import type { IdParams } from "../../schemas/commonSchemas.js"
import {
  APPOINTMENT_NOT_ACTIVE,
  CancelAppointmentService,
  TOO_LATE_TO_CHANGE,
} from "../../services/appointments/CancelAppointmentService.js"
import { APPOINTMENT_NOT_FOUND } from "../../services/appointments/GetAppointmentService.js"

export class CancelAppointmentController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const { id } = req.params as IdParams
    // Sem corpo chega null, então o motivo fica undefined
    const reason = (req.body as CancelAppointmentBody)?.reason

    try {
      const cancelAppointmentService = new CancelAppointmentService()
      const appointment = await cancelAppointmentService.execute({
        appointment_id: id,
        user_id: req.user.sub,
        role: req.user.role,
        reason,
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
            message: "Esse agendamento já foi cancelado ou concluído",
          }),
      },
      {
        message: TOO_LATE_TO_CHANGE,
        handler: () =>
          rep.status(409).send({
            error: "TooLateToChange",
            message: `Cliente só cancela até ${CLIENT_CANCEL_NOTICE_MINUTES / 60} horas antes. Fala direto com o prestador`,
          }),
      },
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "cancelamento de agendamento")
  }
}
