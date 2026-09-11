/**
 * ListAppointmentsService.ts - A agenda de quem está logado, com filtro e paginação
 * # Pra que serve?
 * - Cliente vê os horários que marcou; prestador vê os horários que vai atender
 * - Filtrar por status e por período (dias no fuso do negócio)
 * - Dividir em páginas (pra não mandar a agenda do ano inteiro de uma vez)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { AppointmentStatus, Prisma, UserRole } from "@prisma/client"
import { env } from "../../config/env.js"
import { prisma } from "../../config/prisma.js"
import { addDaysToDate, zonedDateTimeToUtc } from "../../utils/timezone.js"
import { APPOINTMENT_SELECT, presentAppointment } from "./appointmentPresenter.js"

export const INVALID_DATE_RANGE = "Período com início depois do fim"

// O que a gente precisa pra fazer a busca:
interface ListAppointmentsRequest {
  user_id: string
  role: UserRole
  status?: AppointmentStatus
  from?: string
  to?: string
  page: number
  page_size: number
}

export class ListAppointmentsService {
  async execute(params: ListAppointmentsRequest) {
    const { page, page_size } = params

    if (params.from && params.to && params.from > params.to) throw new Error(INVALID_DATE_RANGE)

    const where = this.buildWhereClause(params)

    // Busca em paralelo: a página e o total (pra ser mais rápido)
    const [appointments, total] = await Promise.all([
      this.fetchAppointments(where, page, page_size),
      prisma.appointment.count({ where }),
    ])

    return {
      appointments: appointments.map(presentAppointment),
      total,
      current_page: page,
      total_pages: Math.ceil(total / page_size),
    }
  }

  // Monta o filtro: de quem é a agenda, status e período
  private buildWhereClause(params: ListAppointmentsRequest): Prisma.AppointmentWhereInput {
    const timeZone = env.APP_TIMEZONE
    const owner = params.role === "PROVIDER" ? { provider_id: params.user_id } : { client_id: params.user_id }

    return {
      ...owner,
      ...(params.status && { status: params.status }),
      starts_at: {
        // "to" é inclusivo: vai até a meia-noite do dia seguinte
        ...(params.from && { gte: zonedDateTimeToUtc(params.from, 0, timeZone) }),
        ...(params.to && { lt: zonedDateTimeToUtc(addDaysToDate(params.to, 1), 0, timeZone) }),
      },
    }
  }

  private async fetchAppointments(where: Prisma.AppointmentWhereInput, page: number, pageSize: number) {
    // Calcula quantos pular (tipo "pula os 20 primeiros pra pegar a página 2")
    const skip = (page - 1) * pageSize

    return prisma.appointment.findMany({
      where,
      skip,
      take: pageSize,
      select: APPOINTMENT_SELECT,
      orderBy: { starts_at: "asc" },
    })
  }
}
