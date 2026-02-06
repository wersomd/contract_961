import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    await prisma.user.upsert({
        where: { email: 'admin@961.kz' },
        update: {},
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
    console.log('🔑 Password: admin123');
}

main()
    .catch((e) => {
        console.error('❌ Seeding error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
