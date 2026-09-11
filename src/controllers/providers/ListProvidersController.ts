/**
 * ListProvidersController.ts - Devolve a vitrine de prestadores
 * # Pra que serve?
 * - Rota pública pro cliente escolher com quem quer marcar
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import { ListProvidersService } from "../../services/providers/ListProvidersService.js"

export class ListProvidersController {
  async handle(_req: FastifyRequest, rep: FastifyReply) {
    try {
      const listProvidersService = new ListProvidersService()
      const providers = await listProvidersService.execute()

      return rep.status(200).send(providers)
    } catch (error) {
      return sendUnexpectedError(rep, error, "listagem de prestadores")
    }
  }
}
