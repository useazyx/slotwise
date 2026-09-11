/**
 * sendUnexpectedError.ts - A resposta padrão pra erro que ninguém previu
 * # Pra que serve?
 * - Logar o erro completo (pra gente debugar depois)
 * - Devolver pro cliente só uma mensagem genérica, sem vazar detalhe interno
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyReply } from "fastify"

export function sendUnexpectedError(rep: FastifyReply, error: unknown, context: string) {
  rep.log.error(error, `Deu ruim: ${context}`)

  return rep.status(500).send({
    error: "InternalServerError",
    message: "Opa, deu um erro inesperado! Tenta de novo ou fala com o suporte",
  })
}
