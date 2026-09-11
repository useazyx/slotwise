-- Garante no próprio banco que um prestador nunca tem dois agendamentos ativos se cruzando.
-- A checagem da API pega o caso comum; esta constraint pega a corrida entre duas requisições.

-- btree_gist deixa usar "=" (provider_id) junto com "&&" (intervalo) no mesmo índice GiST
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "provider_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" = 'SCHEDULED');

-- E nenhum agendamento termina antes de começar
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_ends_after_start" CHECK ("ends_at" > "starts_at");
