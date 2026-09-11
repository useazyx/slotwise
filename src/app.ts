/**
 * app.ts - Monta a aplicação Fastify com tudo plugado, mas sem abrir porta
 * # Pra que serve?
 * - Criar a instância do Fastify com o Zod cuidando da validação das rotas
 * - Plugar o tratamento de erro e as rotas
 * - Ficar separado do server.ts pra os testes conseguirem usar a API sem subir servidor
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 * - v1.1.0 (2026-09-11): Plugin de autenticação (JWT)
 */

import Fastify from "fastify"
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod"
import { env } from "./config/env.js"
import { errorHandler } from "./errors/errorHandler.js"
import { authPlugin } from "./plugins/auth.js"
import { routes } from "./routes/index.js"

// Log bonitinho em desenvolvimento, JSON em produção e silêncio nos testes
const getLoggerConfig = () => {
  if (env.NODE_ENV === "test") return false
  if (env.NODE_ENV === "development") {
    return { transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } } }
  }
  return true
}

export async function buildApp() {
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

  await app.register(authPlugin)
  await app.register(routes)

  return app
}
