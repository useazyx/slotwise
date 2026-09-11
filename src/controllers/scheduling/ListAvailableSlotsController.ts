/**
 * ListAvailableSlotsController.ts - Devolve os horários livres de um prestador num dia
 * # Pra que serve?
 * - Juntar o prestador da URL com o serviço e a data da query e mandar pro service calcular
 * - Traduzir prestador/serviço inexistente e data longe demais
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { MAX_BOOKING_DAYS_AHEAD } from "../../config/bookingRules.js"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { IdParams } from "../../schemas/commonSchemas.js"
import type { SlotsQuery } from "../../schemas/slotSchemas.js"
import { SERVICE_NOT_FOUND } from "../../services/catalog/UpdateServiceService.js"
import { PROVIDER_NOT_FOUND } from "../../services/providers/FindProviderService.js"
import {
  DATE_TOO_FAR_AHEAD,
  ListAvailableSlotsService,
} from "../../services/scheduling/ListAvailableSlotsService.js"

export class ListAvailableSlotsController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const { id } = req.params as IdParams
    const { service_id, date } = req.query as SlotsQuery

    try {
      const listAvailableSlotsService = new ListAvailableSlotsService()
      const result = await listAvailableSlotsService.execute({ provider_id: id, service_id, date })

      return rep.status(200).send(result)
    } catch (error) {
      return this.handleServiceError(error, rep)
    }
  }

  private handleServiceError(error: unknown, rep: FastifyReply) {
    const errorMappings = [
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
            message: `Só dá pra ver horários dos próximos ${MAX_BOOKING_DAYS_AHEAD} dias`,
          }),
      },
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "cálculo de horários livres")
  }
}
