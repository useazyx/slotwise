/**
 * fastify.d.ts - Ensina pro TypeScript o que a gente pendurou no Fastify
 * # Pra que serve?
 * - Dizer o formato do token (quem é o usuário e qual o papel dele)
 * - Tipar o porteiro (authenticate) e o guard de papel (requireRole)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import "@fastify/jwt"
import type { FastifyReply, FastifyRequest } from "fastify"
import type { UserRole } from "@prisma/client"

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: UserRole }
    user: { sub: string; role: UserRole }
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void>
    requireRole: (role: UserRole) => (req: FastifyRequest, rep: FastifyReply) => Promise<void>
  }
}
