/**
 * dailyAgendaWorker.ts - O worker da agenda do dia
 * # Pra que serve?
 * - Quando o job das 07:00 fica pronto, montar e mandar a agenda de cada prestador
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { Job } from "pg-boss"
import { BuildDailyAgendaService } from "../services/agenda/BuildDailyAgendaService.js"

// O job não carrega dado: a agenda é sempre a de "hoje" no fuso do negócio
export async function handleDailyAgendaJobs(_jobs: Job<object>[]) {
  const buildDailyAgendaService = new BuildDailyAgendaService()
  await buildDailyAgendaService.execute()
}
