/**
 * commonSchemas.ts - Pedaços de schema que várias rotas usam
 * # Pra que serve?
 * - Validar id nos parâmetros da URL (pra não ir pro banco com lixo)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { z } from "zod"

export const ID_PARAMS_SCHEMA = z.object({
  id: z.uuid("Id inválido"),
})

export type IdParams = z.infer<typeof ID_PARAMS_SCHEMA>
