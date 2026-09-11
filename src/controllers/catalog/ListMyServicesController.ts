/**
 * ListMyServicesController.ts - Lista os serviços do prestador logado
 * # Pra que serve?
 * - Devolver o catálogo completo do prestador (ativos e desativados)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import { ListMyServicesService } from "../../services/catalog/ListMyServicesService.js"

export class ListMyServicesController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    try {
      const listMyServicesService = new ListMyServicesService()
      const services = await listMyServicesService.execute(req.user.sub)

      return rep.status(200).send(services)
    } catch (error) {
      return sendUnexpectedError(rep, error, "listagem dos meus serviços")
    }
  }
}
