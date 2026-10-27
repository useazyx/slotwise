/**
 * password.ts - Guarda e confere senha sem nunca salvar a senha de verdade
 * # Pra que serve?
 * - Transformar a senha em hash com bcrypt antes de ir pro banco
 * - Comparar a senha digitada com o hash salvo
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import bcrypt from "bcryptjs"

const SALT_ROUNDS = 10

// Hash de mentira pra comparar quando o e-mail nem existe (assim o login demora igual nos dois casos)
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync("slotwise-senha-que-ninguem-usa", SALT_ROUNDS)

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS)

export const comparePassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash)
