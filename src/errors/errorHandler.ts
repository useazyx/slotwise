/**
 * errorHandler.ts - A última rede de proteção: todo erro que escapar das rotas cai aqui
 * # Pra que serve?
 * - Responder erro de validação do Zod com 400 e a lista do que tá errado
 * - Repassar os erros "conhecidos" do Fastify (404, 401, 429...) no formato { error, message }
 * - Esconder qualquer detalhe interno quando for erro de verdade (500)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyError, FastifyReply, FastifyRequest } from "fastify"
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod"

export function errorHandler(error: FastifyError, req: FastifyRequest, rep: FastifyReply) {
  // Veio dado errado do cliente (o schema da rota barrou)
  if (hasZodFastifySchemaValidationErrors(error)) {
    return rep.status(400).send({
      error: "ValidationError",
      message: "Tem campo inválido na requisição, confere os detalhes",
      issues: error.validation.map((issue) => ({
        // "/body/email" vira "body.email", que é mais fácil de ler no front
        field: `${error.validationContext ?? "body"}${issue.instancePath.replaceAll("/", ".")}`,
        message: issue.message,
      })),
    })
  }

  // Erros que o próprio Fastify ou os plugins já sabem classificar (tipo 401 do JWT, 429 do rate limit)
  if (error.statusCode && error.statusCode < 500) {
    return rep.status(error.statusCode).send({
      error: error.code ?? "RequestError",
      message: error.message,
    })
  }

  // Daqui pra baixo é bug ou coisa fora do ar: loga tudo e devolve genérico
  req.log.error(error, "Deu ruim numa requisição")

  return rep.status(500).send({
    error: "InternalServerError",
    message: "Opa, deu um erro inesperado! Tenta de novo ou fala com o suporte",
  })
}
