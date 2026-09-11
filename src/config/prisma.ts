/**
 * prisma.ts - A conexão com o banco, uma só pra API inteira
 * # Pra que serve?
 * - Criar o PrismaClient uma vez e reaproveitar em todo service (pra não abrir mil conexões)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { PrismaClient } from "@prisma/client"
import { env } from "./env.js"

// Em desenvolvimento mostra os avisos também; no resto, só erro
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
})
