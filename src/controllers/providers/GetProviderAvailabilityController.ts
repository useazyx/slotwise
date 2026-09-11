/**
 * GetProviderAvailabilityController.ts - Devolve a semana de atendimento de um prestador
 * # Pra que serve?
 * - Rota pública pro cliente saber em que dias e horários aquele prestador atende
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { IdParams } from "../../schemas/commonSchemas.js"
import { GetAvailabilityService } from "../../services/availability/GetAvailabilityService.js"
import { PROVIDER_NOT_FOUND } from "../../services/providers/FindProviderService.js"

export class GetProviderAvailabilityController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const { id } = req.params as IdParams

    try {
      const getAvailabilityService = new GetAvailabilityService()
      const week = await getAvailabilityService.execute(id)

      return rep.status(200).send(week)
    } catch (error) {
      return this.handleServiceError(error, rep)
    }
  }

  private handleServiceError(error: unknown, rep: FastifyReply) {
    const errorMappings = [
      {
        message: PROVIDER_NOT_FOUND,
        handler: () =>
          rep.status(404).send({
            error: "ProviderNotFound",
            message: "Esse prestador não existe",
          }),
      },
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "semana pública do prestador")
  }
}
