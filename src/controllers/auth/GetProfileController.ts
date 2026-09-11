/**
 * GetProfileController.ts - Devolve quem é o dono do token
 * # Pra que serve?
 * - Ler o id do usuário que o porteiro já validou e buscar os dados dele
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import { GetProfileService, USER_NOT_FOUND } from "../../services/auth/GetProfileService.js"

export class GetProfileController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    try {
      const getProfileService = new GetProfileService()
      const user = await getProfileService.execute(req.user.sub)

      return rep.status(200).send(user)
    } catch (error) {
      return this.handleServiceError(error, rep)
    }
  }

  private handleServiceError(error: unknown, rep: FastifyReply) {
    const errorMappings = [
      {
        message: USER_NOT_FOUND,
        handler: () =>
          rep.status(404).send({
            error: "UserNotFound",
            message: "Essa conta não existe mais",
          }),
      },
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "busca do perfil")
  }
}
