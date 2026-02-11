import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load env from project root
dotenv.config({ path: '../.env' });
dotenv.config(); // Also try current directory

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create organization
    const org = await prisma.organization.upsert({
        where: { id: 'default-org' },
        update: {},
        create: {
            id: 'default-org',
            name: '961.kz',
            timezone: 'Asia/Almaty',
        },
    });
    console.log('✅ Organization created:', org.name);

    // Read admin password from env or generate a secure one
    let adminPasswordRaw = process.env.ADMIN_PASSWORD;
    let generated = false;

    if (!adminPasswordRaw) {
        adminPasswordRaw = crypto.randomBytes(16).toString('base64url').slice(0, 20);
        generated = true;
    }

    const adminPassword = await bcrypt.hash(adminPasswordRaw, 12);
    await prisma.user.upsert({
        where: { email: 'admin@961.kz' },
        update: { passwordHash: adminPassword },
        create: {
            organizationId: org.id,
            email: 'admin@961.kz',
            passwordHash: adminPassword,
            name: 'Администратор',
            role: 'admin',
        },
    });
    console.log('✅ Admin user created: admin@961.kz');

    // Create settings
    await prisma.settings.upsert({
        where: { organizationId: org.id },
        update: {},
        create: {
            organizationId: org.id,
            smsProvider: 'smsc',
            smsSenderName: '961kz',
        },
    });
    console.log('✅ Settings created');

    console.log('🎉 Seeding complete!');
    console.log('');
    console.log('📧 Login: admin@961.kz');
    if (generated) {
        console.log(`🔑 Generated password: ${adminPasswordRaw}`);
        console.log('⚠️  Save this password! Add ADMIN_PASSWORD to your .env file.');
    } else {
        console.log('🔑 Password: (from ADMIN_PASSWORD env variable)');
    }
}

main()
    .catch((e) => {
        console.error('❌ Seeding error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

