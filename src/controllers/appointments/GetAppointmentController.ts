/**
 * GetAppointmentController.ts - Devolve um agendamento específico
 * # Pra que serve?
 * - Mostrar os detalhes pra quem participa (cliente ou prestador), 404 pro resto
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { IdParams } from "../../schemas/commonSchemas.js"
import { APPOINTMENT_NOT_FOUND, GetAppointmentService } from "../../services/appointments/GetAppointmentService.js"

export class GetAppointmentController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const { id } = req.params as IdParams

    try {
      const getAppointmentService = new GetAppointmentService()
      const appointment = await getAppointmentService.execute(id, req.user.sub)

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
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "busca de agendamento")
  }
}
