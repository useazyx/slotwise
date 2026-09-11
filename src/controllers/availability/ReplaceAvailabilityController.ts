/**
 * ReplaceAvailabilityController.ts - Recebe a semana de atendimento nova do prestador
 * # Pra que serve?
 * - Mandar as faixas pro service trocar a semana
 * - Explicar direitinho quando a faixa é inválida ou encavalada
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { ReplaceAvailabilityBody } from "../../schemas/availabilitySchemas.js"
import {
  INVALID_TIME_RANGE,
  OVERLAPPING_AVAILABILITY,
  ReplaceAvailabilityService,
} from "../../services/availability/ReplaceAvailabilityService.js"

export class ReplaceAvailabilityController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const { slots } = req.body as ReplaceAvailabilityBody

    try {
      const replaceAvailabilityService = new ReplaceAvailabilityService()
      const week = await replaceAvailabilityService.execute({ provider_id: req.user.sub, slots })

      return rep.status(200).send(week)
    } catch (error) {
      return this.handleServiceError(error, rep)
    }
  }

  private handleServiceError(error: unknown, rep: FastifyReply) {
    const errorMappings = [
      {
        message: INVALID_TIME_RANGE,
        handler: () =>
          rep.status(400).send({
            error: "InvalidTimeRange",
            message: "Tem faixa terminando antes (ou na mesma hora) de começar",
          }),
      },
      {
        message: OVERLAPPING_AVAILABILITY,
        handler: () =>
          rep.status(400).send({
            error: "OverlappingAvailability",
            message: "Tem duas faixas passando uma por cima da outra no mesmo dia",
          }),
      },
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "troca da semana de atendimento")
  }
}
