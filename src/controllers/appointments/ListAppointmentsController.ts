/**
 * ListAppointmentsController.ts - Devolve a agenda de quem está logado
 * # Pra que serve?
 * - Passar os filtros da query e o papel do token pro service montar a lista
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { ListAppointmentsQuery } from "../../schemas/appointmentSchemas.js"
import { INVALID_DATE_RANGE, ListAppointmentsService } from "../../services/appointments/ListAppointmentsService.js"

export class ListAppointmentsController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const query = req.query as ListAppointmentsQuery

    try {
      const listAppointmentsService = new ListAppointmentsService()
      const result = await listAppointmentsService.execute({ ...query, user_id: req.user.sub, role: req.user.role })

      return rep.status(200).send(result)
    } catch (error) {
      return this.handleServiceError(error, rep)
    }
  }

  private handleServiceError(error: unknown, rep: FastifyReply) {
    const errorMappings = [
      {
        message: INVALID_DATE_RANGE,
        handler: () =>
          rep.status(400).send({
            error: "InvalidDateRange",
            message: "O 'from' precisa ser antes (ou igual) ao 'to'",
          }),
      },
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "listagem de agendamentos")
  }
}
