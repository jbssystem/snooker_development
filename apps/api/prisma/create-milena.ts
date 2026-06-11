/**
 * One-off: создаёт аккаунт игрока Milena Boiko (email нерабочий — emailVerifiedAt
 * ставится напрямую). Идемпотентен.
 *
 * Запуск из корня репозитория:
 *   pnpm --filter @snooker/api exec ts-node --project tsconfig.json prisma/create-milena.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient, RoleType, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const NEW_EMAIL = 'mboiko@gmail.com';
// Пароль передаётся через окружение, чтобы не хранить секреты в репозитории:
//   MILENA_PASSWORD=... pnpm --filter @snooker/api exec ts-node --project tsconfig.json prisma/create-milena.ts
// Нужен только при первом создании аккаунта; для существующего не используется.
const NEW_PASSWORD = process.env.MILENA_PASSWORD ?? '';
const NEW_DISPLAY_NAME = 'Milena Boiko';

loadEnvironment();
const prisma = new PrismaClient();

async function main(): Promise<void> {
  let user = await prisma.user.findUnique({ where: { email: NEW_EMAIL } });
  if (!user) {
    if (!NEW_PASSWORD) {
      throw new Error('Задайте MILENA_PASSWORD в окружении для создания нового аккаунта.');
    }
    const passwordHash = await argon2.hash(NEW_PASSWORD, { type: argon2.argon2id });
    user = await prisma.user.create({
      data: {
        email: NEW_EMAIL,
        passwordHash,
        displayName: NEW_DISPLAY_NAME,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Создан пользователь ${NEW_EMAIL} (${user.id})`);
  } else {
    console.log(`Пользователь ${NEW_EMAIL} уже существует (${user.id})`);
  }

  const role = await prisma.role.findFirst({ where: { userId: user.id, roleType: RoleType.PLAYER } });
  if (!role) {
    await prisma.role.create({ data: { userId: user.id, roleType: RoleType.PLAYER } });
    console.log('Добавлена роль PLAYER');
  }

  let profile = await prisma.playerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.playerProfile.create({
      data: { userId: user.id, firstName: 'Milena', lastName: 'Boiko' },
    });
    console.log(`Создан профиль игрока (${profile.id})`);
  }
  console.log(`Готово. Логин: ${NEW_EMAIL} (пароль — из MILENA_PASSWORD, в лог не выводится)`);
}

function loadEnvironment(): void {
  const repoRoot = resolve(__dirname, '../../..');
  loadEnvFile(resolve(repoRoot, '.env'));
  loadEnvFile(resolve(__dirname, '../.env'));
  if (!process.env.DATABASE_URL) {
    const host = process.env.POSTGRES_HOST ?? 'localhost';
    const port = process.env.POSTGRES_PORT ?? '5433';
    const database = process.env.POSTGRES_DB ?? 'snooker_os';
    const user = process.env.POSTGRES_USER ?? 'snooker';
    const password = process.env.POSTGRES_PASSWORD ?? 'snooker_password';
    process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }
}

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    if (process.env[key] !== undefined) continue;
    let v = trimmed.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[key] = v;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
