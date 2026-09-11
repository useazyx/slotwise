/**
 * GetMyAvailabilityController.ts - Devolve a semana de atendimento do prestador logado
 * # Pra que serve?
 * - Mostrar pro prestador como a semana dele está configurada
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import { GetAvailabilityService } from "../../services/availability/GetAvailabilityService.js"

export class GetMyAvailabilityController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    try {
      const getAvailabilityService = new GetAvailabilityService()
      const week = await getAvailabilityService.execute(req.user.sub)

      return rep.status(200).send(week)
    } catch (error) {
      return sendUnexpectedError(rep, error, "busca da minha semana de atendimento")
    }
  }
}
