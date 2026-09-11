/**
 * LoginController.ts - Faz o login e entrega o token
 * # Pra que serve?
 * - Mandar e-mail e senha pro service conferir
 * - Assinar o JWT com o id e o papel do usuário (é o "crachá" pras outras rotas)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { LoginBody } from "../../schemas/authSchemas.js"
import { INVALID_CREDENTIALS, LoginService } from "../../services/auth/LoginService.js"

export class LoginController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const body = req.body as LoginBody

    try {
      const loginService = new LoginService()
      const user = await loginService.execute(body)

      const token = await this.signToken(user.id, user.role, rep)

      return rep.status(200).send({ token, user })
    } catch (error) {
      return this.handleServiceError(error, rep)
    }
  }

  // O token leva só o necessário: quem é (sub) e o que pode (role)
  private signToken(userId: string, role: "CLIENT" | "PROVIDER", rep: FastifyReply) {
    return rep.jwtSign({ sub: userId, role })
  }

  private handleServiceError(error: unknown, rep: FastifyReply) {
    const errorMappings = [
      {
        message: INVALID_CREDENTIALS,
        handler: () =>
          rep.status(401).send({
            error: "InvalidCredentials",
            message: "E-mail ou senha incorretos",
          }),
      },
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "login")
  }
}
