/**
 * seed.ts - Dados de demonstração pra API abrir já com algo pra testar
 * # Pra que serve?
 * - Criar dois prestadores (barbearia e manicure), uma cliente, os serviços e a semana de atendimento
 * - Rodar em todo `npm run dev` sem duplicar nada (tudo é upsert ou troca completa)
 * - Todas as contas usam a senha DEMO_PASSWORD (ela também está no README)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 *
 * Como rodar:
 *   npx prisma db seed
 * O `npm run dev` já chama ele automaticamente.
 */

import { pathToFileURL } from "node:url"
import type { UserRole } from "@prisma/client"
import { prisma } from "../src/config/prisma.js"
import { hashPassword } from "../src/utils/password.js"
import { timeToMinutes } from "../src/utils/time.js"

export const DEMO_PASSWORD = "pontual123"

// Quem existe na demonstração, com os serviços e a semana de cada prestador
const DEMO_PROVIDERS = [
  {
    name: "Barbearia do Zé",
    email: "ze@pontual.dev",
    services: [
      { name: "Corte masculino", duration_minutes: 30, price_cents: 4500 },
      { name: "Barba", duration_minutes: 20, price_cents: 3000 },
      { name: "Corte e barba", duration_minutes: 50, price_cents: 7000 },
    ],
    // Terça a sábado, com pausa pro almoço
    week: [2, 3, 4, 5, 6].flatMap((weekday) => [
      { weekday, start: "09:00", end: "12:00" },
      { weekday, start: "13:30", end: "19:00" },
    ]),
  },
  {
    name: "Studio Bela",
    email: "bela@pontual.dev",
    services: [
      { name: "Manicure", duration_minutes: 45, price_cents: 3500 },
      { name: "Pedicure", duration_minutes: 45, price_cents: 4000 },
      { name: "Design de sobrancelha", duration_minutes: 30, price_cents: 3000 },
    ],
    // Segunda a sexta, direto
    week: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: "10:00", end: "18:00" })),
  },
]

const DEMO_CLIENTS = [{ name: "Ana Souza", email: "ana@pontual.dev" }]

export async function seed() {
  const passwordHash = await hashPassword(DEMO_PASSWORD)

  for (const provider of DEMO_PROVIDERS) {
    const user = await upsertUser(provider.name, provider.email, "PROVIDER", passwordHash)

    for (const service of provider.services) await upsertService(user.id, service)

    await replaceWeek(user.id, provider.week)
  }

  for (const client of DEMO_CLIENTS) await upsertUser(client.name, client.email, "CLIENT", passwordHash)
}

// Pelo e-mail: se já existe, só garante nome, papel e a senha de demonstração
async function upsertUser(name: string, email: string, role: UserRole, passwordHash: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role, password_hash: passwordHash },
    create: { name, email, role, password_hash: passwordHash },
    select: { id: true },
  })
}

// Serviço não tem campo único além do id, então procura pelo nome dentro do prestador
async function upsertService(
  providerId: string,
  service: { name: string; duration_minutes: number; price_cents: number }
) {
  const existing = await prisma.service.findFirst({
    where: { provider_id: providerId, name: service.name },
    select: { id: true },
  })

  if (existing) {
    await prisma.service.update({ where: { id: existing.id }, data: { ...service, active: true } })
    return
  }

  await prisma.service.create({ data: { ...service, provider_id: providerId } })
}

// A semana é trocada inteira (igual o PUT /availability faz)
async function replaceWeek(providerId: string, week: { weekday: number; start: string; end: string }[]) {
  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { provider_id: providerId } }),
    prisma.availability.createMany({
      data: week.map((slot) => ({
        provider_id: providerId,
        weekday: slot.weekday,
        start_minute: timeToMinutes(slot.start),
        end_minute: timeToMinutes(slot.end),
      })),
    }),
  ])
}

// Só roda sozinho quando chamado direto (o teste importa a função sem disparar o seed)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .then(() => {
      console.log(`🌱 Seed pronto. Logins com a senha "${DEMO_PASSWORD}":`)
      console.log("   prestadores: ze@pontual.dev, bela@pontual.dev | cliente: ana@pontual.dev")
    })
    .catch((error) => {
      console.error("❌ Deu ruim no seed:", error)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
