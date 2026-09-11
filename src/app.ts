/**
 * app.ts - Monta a aplicação Fastify com tudo plugado, mas sem abrir porta
 * # Pra que serve?
 * - Criar a instância do Fastify com o Zod cuidando da validação das rotas
 * - Plugar o tratamento de erro e as rotas
 * - Ficar separado do server.ts pra os testes conseguirem usar a API sem subir servidor
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.3.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 * - v1.1.0 (2026-09-11): Plugin de autenticação (JWT)
 * - v1.2.0 (2026-09-11): Fila de jobs e desconexão do banco ao desligar
 * - v1.3.0 (2026-09-11): helmet, cors e rate limit (opção rateLimit pros testes)
 */

import Fastify from "fastify"
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod"
import { env } from "./config/env.js"
import { prisma } from "./config/prisma.js"
import { errorHandler } from "./errors/errorHandler.js"
import { authPlugin } from "./plugins/auth.js"
import { queuePlugin } from "./plugins/queue.js"
import { securityPlugin } from "./plugins/security.js"
import { routes } from "./routes/index.js"

// O que dá pra ligar/desligar na hora de montar a API
interface BuildAppOptions {
  // Por padrão só fica desligado nos testes
  rateLimit?: boolean
}

// Log bonitinho em desenvolvimento, JSON em produção e silêncio nos testes
const getLoggerConfig = () => {
  if (env.NODE_ENV === "test") return false
  if (env.NODE_ENV === "development") {
    return { transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } } }
  }
  return true
}

export async function buildApp({ rateLimit = env.NODE_ENV !== "test" }: BuildAppOptions = {}) {
  const app = Fastify({ logger: getLoggerConfig() }).withTypeProvider<ZodTypeProvider>()

  // O Zod valida o que entra e formata o que sai
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.setErrorHandler(errorHandler)

  // Rota que não existe também responde no nosso formato (e não no padrão do Fastify)
  app.setNotFoundHandler((req, rep) => {
    rep.status(404).send({
      error: "RouteNotFound",
      message: `A rota ${req.method} ${req.url} não existe`,
    })
  })

  // Segurança antes das rotas, senão o rate limit não enxerga elas
  await app.register(securityPlugin, { rateLimit })
  await app.register(authPlugin)
  await app.register(queuePlugin)
  await app.register(routes)

  // Quando a API desliga, fecha a conexão com o banco também
  app.addHook("onClose", async () => {
    await prisma.$disconnect()
  })

  return app
}
