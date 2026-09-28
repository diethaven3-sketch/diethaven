// Creates an APPROVED DIETITIAN account with a generated password and appends
// the login to dietitian-logins.txt at the repo root (gitignored).
//
//   bun run --filter database db:create-dietitian
//   bun run --filter database db:create-dietitian -- dietitian@example.com "Jane Doe"
//
// With no email, a unique dietitian+<random>@diethaven.test address is used.
// DATABASE_URL comes from the environment, falling back to the repo-root .env,
// so run it from your machine to provision whichever database that points at.
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/client";

// Matches SALT_ROUNDS in apps/api/src/auth/auth.service.ts.
const SALT_ROUNDS = 10;

const repoRoot = resolve(__dirname, "../../..");
const rootEnv = resolve(repoRoot, ".env");
const loginsFile = resolve(repoRoot, "dietitian-logins.txt");

if (!process.env.DATABASE_URL && existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const prisma = new PrismaClient();

async function main() {
  const [rawEmail, ...nameParts] = process.argv.slice(2);
  const suffix = randomBytes(3).toString("hex");
  const email = rawEmail?.trim() || `dietitian+${suffix}@diethaven.test`;
  const name = nameParts.join(" ").trim() || `Test Dietitian ${suffix}`;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: db:create-dietitian -- [email] ["Full Name"]');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`A ${existing.role} account already exists for ${email}; nothing changed.`);
  }

  // 18 random bytes → 24 base64url chars, comfortably above any password policy.
  const password = randomBytes(18).toString("base64url");
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const licenseNumber = `TEST-${suffix.toUpperCase()}`;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name, role: "DIETITIAN", passwordHash },
    });
    await tx.dietitianProfile.create({
      data: {
        userId: user.id,
        licenseNumber,
        specialty: "Clinical Nutrition",
        facility: "DietHaven Test Clinic",
        approvalStatus: "APPROVED",
      },
    });
  });

  const entry = [
    `# ${new Date().toISOString()}`,
    `name:     ${name}`,
    `email:    ${email}`,
    `password: ${password}`,
    `license:  ${licenseNumber}`,
    "",
    "",
  ].join("\n");
  appendFileSync(loginsFile, entry);

  console.log(`\nCreated approved dietitian account\n  email:    ${email}\n  name:     ${name}\n  password: ${password}\n`);
  console.log(`Login appended to ${loginsFile}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
