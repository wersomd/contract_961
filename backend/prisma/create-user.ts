/**
 * CLI script to create new users.
 * 
 * Usage:
 *   npx tsx prisma/create-user.ts --email user@961.kz --name "Менеджер" --role manager --password "SecurePass123!"
 * 
 * Options:
 *   --email     User email (required)
 *   --name      User display name (required)
 *   --password  User password (required)
 *   --role      User role: admin | manager (default: manager)
 *   --org       Organization ID (default: default-org)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config();

const prisma = new PrismaClient();

function parseArgs(): Record<string, string> {
    const args: Record<string, string> = {};
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i += 2) {
        const key = argv[i].replace(/^--/, '');
        const value = argv[i + 1];
        if (value) args[key] = value;
    }
    return args;
}

async function main() {
    const args = parseArgs();

    if (!args.email || !args.name || !args.password) {
        console.error('❌ Missing required arguments.');
        console.log('');
        console.log('Usage:');
        console.log('  npx tsx prisma/create-user.ts --email user@961.kz --name "Менеджер" --password "MyP@ss123!"');
        console.log('');
        console.log('Options:');
        console.log('  --email     User email (required)');
        console.log('  --name      Display name (required)');
        console.log('  --password  Password (required)');
        console.log('  --role      admin | manager (default: manager)');
        console.log('  --org       Organization ID (default: default-org)');
        process.exit(1);
    }

    const role = args.role === 'admin' ? 'admin' : 'manager';
    const orgId = args.org || 'default-org';

    // Check org exists
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
        console.error(`❌ Organization "${orgId}" not found. Run seed first.`);
        process.exit(1);
    }

    // Check email not taken
    const existing = await prisma.user.findUnique({ where: { email: args.email } });
    if (existing) {
        console.error(`❌ User with email "${args.email}" already exists.`);
        process.exit(1);
    }

    // Create user
    const passwordHash = await bcrypt.hash(args.password, 12);
    const user = await prisma.user.create({
        data: {
            organizationId: orgId,
            email: args.email,
            passwordHash,
            name: args.name,
            role,
        },
    });

    console.log('✅ User created successfully!');
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👤 Name: ${user.name}`);
    console.log(`   🔐 Role: ${user.role}`);
    console.log(`   🏢 Org: ${orgId}`);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
