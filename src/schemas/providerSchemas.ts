/**
 * providerSchemas.ts - O formato do que o cliente vê dos prestadores
 * # Pra que serve?
 * - Descrever a vitrine de prestadores (quem atende e quantos serviços tem no ar)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { z } from "zod"

export const PROVIDER_SUMMARY_SCHEMA = z.object({
  id: z.string(),
  name: z.string(),
  active_services: z.number().int(),
})
