/**
 * Seed do usuário administrador.
 * Executado uma única vez na inicialização do container.
 * Variáveis ADMIN_EMAIL e ADMIN_PASSWORD obrigatórias no .env.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórios");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Administrador já existe: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: { email, passwordHash },
  });

  console.log(`Administrador criado: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
