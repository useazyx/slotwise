/**
 * RegisterUserController.ts - Recebe o cadastro de uma conta nova
 * # Pra que serve?
 * - Pegar os dados já validados pelo schema e mandar pro service criar a conta
 * - Traduzir os erros do service pra resposta HTTP certa
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply, FastifyRequest } from "fastify"
import { sendUnexpectedError } from "../../errors/sendUnexpectedError.js"
import type { RegisterBody } from "../../schemas/authSchemas.js"
import { EMAIL_ALREADY_USED, RegisterUserService } from "../../services/auth/RegisterUserService.js"

export class RegisterUserController {
  async handle(req: FastifyRequest, rep: FastifyReply) {
    const body = req.body as RegisterBody

    try {
      const registerUserService = new RegisterUserService()
      const user = await registerUserService.execute(body)

      return rep.status(201).send(user)
    } catch (error) {
      return this.handleServiceError(error, rep)
    }
  }

  // Cada mensagem conhecida do service vira uma resposta; o resto é erro inesperado
  private handleServiceError(error: unknown, rep: FastifyReply) {
    const errorMappings = [
      {
        message: EMAIL_ALREADY_USED,
        handler: () =>
          rep.status(409).send({
            error: "EmailAlreadyUsed",
            message: "Esse e-mail já tem conta. Faz login ou usa outro e-mail",
          }),
      },
    ]

    const message = error instanceof Error ? error.message : ""
    const mapping = errorMappings.find((item) => item.message === message)
    if (mapping) return mapping.handler()

    return sendUnexpectedError(rep, error, "cadastro de usuário")
  }
}
