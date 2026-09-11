/**
 * SendReminderService.ts - Manda um lembrete quando o job fica pronto
 * # Pra que serve?
 * - Buscar o lembrete e o agendamento no banco na hora de avisar (e não quando o job foi criado)
 * - Não avisar se o horário foi cancelado ou se o lembrete já saiu (job repetido não manda duas vezes)
 * - Montar a mensagem e entregar. Hoje a entrega é um log estruturado; trocar por e-mail ou
 *   WhatsApp é mexer só no deliver
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { ReminderKind } from "@prisma/client"
import { env } from "../../config/env.js"
import { prisma } from "../../config/prisma.js"
import { getZonedDate, getZonedTime } from "../../utils/timezone.js"

// Os dados que a mensagem precisa
interface ReminderDetails {
  kind: ReminderKind
  starts_at: Date
  client_name: string
  provider_name: string
  service_name: string
}

export class SendReminderService {
  async execute(reminderId: string) {
    const reminder = await this.findReminder(reminderId)

    // Já saiu, foi cancelado ou nem existe mais: nada a fazer (e não é erro, senão a fila tenta de novo)
    if (!reminder || reminder.status !== "PENDING") return { sent: false as const }

    if (reminder.appointment.status !== "SCHEDULED") {
      await prisma.reminder.update({ where: { id: reminderId }, data: { status: "CANCELED" } })
      return { sent: false as const }
    }

    const message = this.buildMessage({
      kind: reminder.kind,
      starts_at: reminder.appointment.starts_at,
      client_name: reminder.appointment.client.name,
      provider_name: reminder.appointment.provider.name,
      service_name: reminder.appointment.service.name,
    })

    this.deliver(reminder.appointment.client.email, message)

    await prisma.reminder.update({ where: { id: reminderId }, data: { status: "SENT", sent_at: new Date() } })

    return { sent: true as const, message }
  }

  private async findReminder(reminderId: string) {
    return prisma.reminder.findUnique({
      where: { id: reminderId },
      select: {
        kind: true,
        status: true,
        appointment: {
          select: {
            status: true,
            starts_at: true,
            client: { select: { name: true, email: true } },
            provider: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
      },
    })
  }

  // "Oi, Ana! Lembrete: Corte com Barbearia do Zé amanhã (18/09) às 10:00."
  private buildMessage(details: ReminderDetails): string {
    const timeZone = env.APP_TIMEZONE
    const [, month, day] = getZonedDate(details.starts_at, timeZone).split("-")
    const time = getZonedTime(details.starts_at, timeZone)
    const when = details.kind === "DAY_BEFORE" ? `amanhã (${day}/${month}) às ${time}` : `daqui a 1 hora, às ${time}`
    const firstName = details.client_name.split(" ")[0]

    return `Oi, ${firstName}! Lembrete: ${details.service_name} com ${details.provider_name} ${when}.`
  }

  private deliver(email: string, message: string) {
    if (env.NODE_ENV === "test") return
    console.log(`📨 Lembrete para ${email}: ${message}`)
  }
}
