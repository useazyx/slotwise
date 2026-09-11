/**
 * index.ts - O mapa de rotas da API
 * # Pra que serve?
 * - Registrar todos os grupos de rota num lugar só (tipo o índice de um livro)
 * - Ter a rota de saúde, que serve pra saber se a API tá de pé
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial com o /health
 * - v1.1.0 (2026-09-11): Rotas de autenticação em /auth
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { authRoutes } from "./authRoutes.js"

const HEALTH_RESPONSE_SCHEMA = z.object({
  status: z.literal("ok"),
})

export const routes: FastifyPluginAsyncZod = async (app) => {
  // Rota de saúde: se respondeu, a API tá viva
  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Confere se a API está de pé",
        response: { 200: HEALTH_RESPONSE_SCHEMA },
      },
    },
    async () => ({ status: "ok" as const })
  )

  await app.register(authRoutes, { prefix: "/auth" })
}
