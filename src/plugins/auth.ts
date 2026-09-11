/**
 * auth.ts - O porteiro da API
 * # Pra que serve?
 * - Configurar o JWT com o segredo e a validade do .env
 * - authenticate: só deixa passar quem tem token válido
 * - requireRole: só deixa passar quem tem o papel certo (tipo área restrita pra prestador)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import fastifyJwt from "@fastify/jwt"
import type { UserRole } from "@prisma/client"
import type { FastifyReply, FastifyRequest } from "fastify"
import fp from "fastify-plugin"
import { env } from "../config/env.js"

// fastify-plugin pra os decorators valerem na API toda (e não só dentro deste plugin)
export const authPlugin = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  })

  // O porteiro: confere o token do header Authorization
  app.decorate("authenticate", async (req: FastifyRequest, rep: FastifyReply) => {
    try {
      await req.jwtVerify()
    } catch {
      return rep.status(401).send({
        error: "Unauthorized",
        message: "Precisa estar logado pra isso (token ausente, inválido ou vencido)",
      })
    }
  })

  // O guard de papel: roda depois do porteiro, então o req.user já existe
  app.decorate("requireRole", (role: UserRole) => {
    return async (req: FastifyRequest, rep: FastifyReply) => {
      if (req.user.role !== role) {
        return rep.status(403).send({
          error: "Forbidden",
          message: "Seu tipo de conta não tem acesso a essa rota",
        })
      }
    }
  })
})
