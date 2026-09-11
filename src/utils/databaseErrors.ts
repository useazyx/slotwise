/**
 * databaseErrors.ts - Reconhece os erros do Postgres que a agenda precisa tratar
 * # Pra que serve?
 * - Saber quando a constraint de horário sobreposto barrou um insert
 * - Saber quando duas marcações simultâneas travaram uma na outra (deadlock)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

// Nome da constraint criada na migration prevent_double_booking
const NO_OVERLAP_CONSTRAINT = "appointments_no_overlap"

// Código do Postgres pra "deadlock detected"
const DEADLOCK_CODE = "40P01"

// O Prisma não tem código próprio pra esses dois, então a gente reconhece pela mensagem que ele repassa
export const isOverlapViolation = (error: unknown): boolean =>
  error instanceof Error && error.message.includes(NO_OVERLAP_CONSTRAINT)

export const isDeadlock = (error: unknown): boolean => error instanceof Error && error.message.includes(DEADLOCK_CODE)
