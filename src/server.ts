/**
 * server.ts - Liga a API de verdade, abrindo a porta
 * # Pra que serve?
 * - Pegar a aplicação montada no app.ts e colocar pra escutar na porta do .env
 * - Desligar direitinho quando mandam parar (Ctrl+C ou o deploy reiniciando)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { buildApp } from "./app.js"
import { env } from "./config/env.js"

const SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"] as const

async function start() {
  const app = await buildApp()

  // Quando mandarem parar, fecha as conexões antes de sair (pra não deixar nada pela metade)
  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, async () => {
      console.log(`🛑 Recebi ${signal}, desligando a API...`)
      await app.close()
      process.exit(0)
    })
  }

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    console.log(`🚀 API rodando em http://localhost:${env.PORT}`)
  } catch (error) {
    console.error("❌ Não deu pra subir a API:", error)
    process.exit(1)
  }
}

start()
