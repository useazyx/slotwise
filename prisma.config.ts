import { config } from "dotenv"
import { defineConfig } from "prisma/config"

// Com o arquivo de config o Prisma para de ler o .env sozinho, então a gente carrega aqui
config({ quiet: true })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
})
