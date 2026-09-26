// Creates an ADMIN account with a generated password, printed once.
//
//   bun run --filter database db:create-admin -- admin@example.com "Jane Doe"
//
// DATABASE_URL comes from the environment, falling back to the repo-root .env,
// so run it from your machine to provision whichever database that points at.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/client";

// Matches SALT_ROUNDS in apps/api/src/auth/auth.service.ts.
const SALT_ROUNDS = 10;

const rootEnv = resolve(__dirname, "../../../.env");
if (!process.env.DATABASE_URL && existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const prisma = new PrismaClient();

async function main() {
  const [rawEmail, ...nameParts] = process.argv.slice(2);
  const email = rawEmail?.trim();
  const name = nameParts.join(" ").trim() || "Admin";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: db:create-admin -- <email> ["Full Name"]');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`A ${existing.role} account already exists for ${email}; nothing changed.`);
  }

  // 18 random bytes → 24 base64url chars, comfortably above any password policy.
  const password = randomBytes(18).toString("base64url");
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await prisma.user.create({
    data: { email, name, role: "ADMIN", passwordHash },
  });

  console.log(`\nCreated admin account\n  email:    ${email}\n  name:     ${name}\n  password: ${password}\n`);
  console.log("Save this password now; it is not stored anywhere in plain text.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
