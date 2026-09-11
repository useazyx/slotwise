/**
 * CreateServiceController.ts - Recebe o cadastro de um serviço
 * # Pra que serve?
 * - Pegar o prestador pelo token e mandar o serviço pro service salvar
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { CreateServiceBody } from "../../schemas/serviceSchemas.js"
import { CreateServiceService } from "../../services/catalog/CreateServiceService.js"

export class CreateServiceController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const body = req.body as CreateServiceBody

    try {
      const createServiceService = new CreateServiceService()
      const service = await createServiceService.execute({ ...body, provider_id: req.user.sub })

      return rep.status(201).send(service)
    } catch (error) {
      return sendUnexpectedError(rep, error, "cadastro de serviço")
    }
  }
}
