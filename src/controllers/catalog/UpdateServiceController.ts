/**
 * UpdateServiceController.ts - Recebe a alteração de um serviço
 * # Pra que serve?
 * - Mandar só o que mudou pro service, junto com quem está pedindo
 * - Responder 404 se o serviço não existe ou é de outro prestador
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { IdParams } from "../../schemas/commonSchemas.js"
import type { UpdateServiceBody } from "../../schemas/serviceSchemas.js"
import { SERVICE_NOT_FOUND, UpdateServiceService } from "../../services/catalog/UpdateServiceService.js"

export class UpdateServiceController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const { id } = req.params as IdParams
    const changes = req.body as UpdateServiceBody

    try {
      const updateServiceService = new UpdateServiceService()
      const service = await updateServiceService.execute({ id, provider_id: req.user.sub, changes })

      return rep.status(200).send(service)
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

    return sendUnexpectedError(rep, error, "alteração de serviço")
  }
}
