/**
 * CreateAppointmentController.ts - Recebe o pedido de marcação do cliente
 * # Pra que serve?
 * - Juntar o cliente do token com o horário escolhido e mandar pro service marcar
 * - Responder 409 quando o horário não está mais livre (inclusive na corrida entre duas pessoas)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { MAX_BOOKING_DAYS_AHEAD } from "../../config/bookingRules.js"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { CreateAppointmentBody } from "../../schemas/appointmentSchemas.js"
import {
  CreateAppointmentService,
  SLOT_TAKEN,
  SLOT_UNAVAILABLE,
} from "../../services/appointments/CreateAppointmentService.js"
import { SERVICE_NOT_FOUND } from "../../services/catalog/UpdateServiceService.js"
import { PROVIDER_NOT_FOUND } from "../../services/providers/FindProviderService.js"
import { DATE_TOO_FAR_AHEAD } from "../../services/scheduling/ListAvailableSlotsService.js"

export class CreateAppointmentController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const body = req.body as CreateAppointmentBody

    try {
      const createAppointmentService = new CreateAppointmentService()
      const appointment = await createAppointmentService.execute({ ...body, client_id: req.user.sub })

      return rep.status(201).send(appointment)
    } catch (error) {
      return this.handleServiceError(error, rep)
    }
  }

  private handleServiceError(error: unknown, rep: FastifyReply) {
    const errorMappings = [
      {
        message: SLOT_UNAVAILABLE,
        handler: () =>
          rep.status(409).send({
            error: "SlotUnavailable",
            message: "Esse horário não está livre. Consulta a lista de horários de novo",
          }),
      },
      {
        message: SLOT_TAKEN,
        handler: () =>
          rep.status(409).send({
            error: "SlotTaken",
            message: "Alguém marcou esse horário agora há pouco. Escolhe outro",
          }),
      },
      {
        message: PROVIDER_NOT_FOUND,
        handler: () => rep.status(404).send({ error: "ProviderNotFound", message: "Esse prestador não existe" }),
      },
      {
        message: SERVICE_NOT_FOUND,
        handler: () =>
          rep.status(404).send({
            error: "ServiceNotFound",
            message: "Esse serviço não existe, está desativado ou é de outro prestador",
          }),
      },
      {
        message: DATE_TOO_FAR_AHEAD,
        handler: () =>
          rep.status(400).send({
            error: "DateTooFarAhead",
            message: `Só dá pra marcar nos próximos ${MAX_BOOKING_DAYS_AHEAD} dias`,
          }),
      },
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "marcação de horário")
  }
}
