/**
 * DeactivateServiceController.ts - Recebe o pedido pra tirar um serviço do ar
 * # Pra que serve?
 * - Desativar o serviço do prestador logado e responder sem corpo (204)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { IdParams } from "../../schemas/commonSchemas.js"
import { DeactivateServiceService } from "../../services/catalog/DeactivateServiceService.js"
import { SERVICE_NOT_FOUND } from "../../services/catalog/UpdateServiceService.js"

export class DeactivateServiceController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const { id } = req.params as IdParams

    try {
      const deactivateServiceService = new DeactivateServiceService()
      await deactivateServiceService.execute(id, req.user.sub)

      return rep.status(204).send()
    } catch (error) {
      return this.handleServiceError(error, rep)
    }
  }

  private handleServiceError(error: unknown, rep: FastifyReply) {
    const errorMappings = [
      {
        message: SERVICE_NOT_FOUND,
        handler: () =>
          rep.status(404).send({
            error: "ServiceNotFound",
            message: "Não achei esse serviço entre os seus",
          }),
      },
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "desativação de serviço")
  }
}
