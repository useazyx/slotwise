/**
 * RescheduleAppointmentController.ts - Recebe o pedido de troca de horário do cliente
 * # Pra que serve?
 * - Mandar o horário novo pro service fazer a troca
 * - Traduzir todos os motivos de não dar pra remarcar
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { CLIENT_CANCEL_NOTICE_MINUTES, MAX_BOOKING_DAYS_AHEAD } from "../../config/bookingRules.js"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { RescheduleAppointmentBody } from "../../schemas/appointmentSchemas.js"
import type { IdParams } from "../../schemas/commonSchemas.js"
import { APPOINTMENT_NOT_ACTIVE, TOO_LATE_TO_CHANGE } from "../../services/appointments/CancelAppointmentService.js"
import { SLOT_TAKEN, SLOT_UNAVAILABLE } from "../../services/appointments/CreateAppointmentService.js"
import { APPOINTMENT_NOT_FOUND } from "../../services/appointments/GetAppointmentService.js"
import { RescheduleAppointmentService, SAME_TIME } from "../../services/appointments/RescheduleAppointmentService.js"
import { SERVICE_NOT_FOUND } from "../../services/catalog/UpdateServiceService.js"
import { DATE_TOO_FAR_AHEAD } from "../../services/scheduling/ListAvailableSlotsService.js"

export class RescheduleAppointmentController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const { id } = req.params as IdParams
    const { starts_at } = req.body as RescheduleAppointmentBody

    try {
      const rescheduleAppointmentService = new RescheduleAppointmentService()
      const appointment = await rescheduleAppointmentService.execute({
        appointment_id: id,
        client_id: req.user.sub,
        starts_at,
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
            message: `Só dá pra remarcar até ${CLIENT_CANCEL_NOTICE_MINUTES / 60} horas antes`,
          }),
      },
      {
        message: SAME_TIME,
        handler: () => rep.status(400).send({ error: "SameTime", message: "O horário novo é igual ao atual" }),
      },
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
          rep.status(409).send({ error: "SlotTaken", message: "Alguém marcou esse horário agora há pouco. Escolhe outro" }),
      },
      {
        message: SERVICE_NOT_FOUND,
        handler: () =>
          rep.status(409).send({
            error: "ServiceNotAvailable",
            message: "Esse serviço foi desativado, então não dá pra remarcar. Dá pra cancelar",
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

    return sendUnexpectedError(rep, error, "remarcação de agendamento")
  }
}
