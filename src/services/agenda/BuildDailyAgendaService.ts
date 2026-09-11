/**
 * BuildDailyAgendaService.ts - Monta a agenda do dia de cada prestador
 * # Pra que serve?
 * - Juntar os horários marcados do dia, separados por prestador e em ordem de hora
 * - Entregar o resumo pra cada prestador logo cedo (hoje é log; e-mail ou WhatsApp entra no deliver)
 * - Roda todo dia às 07:00 pela fila, mas dá pra chamar pra qualquer data
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { env } from "../../config/env.js"
import { prisma } from "../../config/prisma.js"
import { addDaysToDate, getZonedDate, getZonedTime, zonedDateTimeToUtc } from "../../utils/timezone.js"

// Como fica a agenda de um prestador:
interface ProviderAgenda {
  provider_id: string
  provider_name: string
  appointments: { local_time: string; client_name: string; service_name: string }[]
}

export class BuildDailyAgendaService {
  async execute(date: string = getZonedDate(new Date(), env.APP_TIMEZONE)) {
    const appointments = await this.findScheduledForDay(date)
    const agendas = this.groupByProvider(appointments)

    for (const agenda of agendas) this.deliver(date, agenda)

    return { date, agendas }
  }

  // Só o que continua marcado (cancelado não entra na agenda)
  private async findScheduledForDay(date: string) {
    const timeZone = env.APP_TIMEZONE

    return prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        starts_at: {
          gte: zonedDateTimeToUtc(date, 0, timeZone),
          lt: zonedDateTimeToUtc(addDaysToDate(date, 1), 0, timeZone),
        },
      },
      select: {
        starts_at: true,
        provider: { select: { id: true, name: true } },
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: [{ provider_id: "asc" }, { starts_at: "asc" }],
    })
  }

  // Separa por prestador mantendo a ordem de horário (a busca já veio ordenada)
  private groupByProvider(appointments: Awaited<ReturnType<BuildDailyAgendaService["findScheduledForDay"]>>) {
    const agendas = new Map<string, ProviderAgenda>()

    for (const appointment of appointments) {
      const agenda = agendas.get(appointment.provider.id) ?? {
        provider_id: appointment.provider.id,
        provider_name: appointment.provider.name,
        appointments: [],
      }

      agenda.appointments.push({
        local_time: getZonedTime(appointment.starts_at, env.APP_TIMEZONE),
        client_name: appointment.client.name,
        service_name: appointment.service.name,
      })

      agendas.set(appointment.provider.id, agenda)
    }

    return [...agendas.values()]
  }

  private deliver(date: string, agenda: ProviderAgenda) {
    if (env.NODE_ENV === "test") return

    const [, month, day] = date.split("-")
    const lines = agenda.appointments.map((item) => `${item.local_time} ${item.service_name} com ${item.client_name}`)
    console.log(`📅 Agenda de ${day}/${month} - ${agenda.provider_name} (${agenda.appointments.length}): ${lines.join("; ")}`)
  }
}
