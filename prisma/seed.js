/**
 * Idempotent seed: permission catalogue, starter roles, root directory and the first admin.
 * Run: npm run db:seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prismaPkg from '@prisma/client';
const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();
const PERMISSION_CODES = [
  'announcement.create',
  'announcement.delete',
  'announcement.publish',
  'announcement.read',
  'announcement.update',
  'audit.read',
  'chat.create',
  'chat.read',
  'chat.send',
  'chat.update',
  'directory.create',
  'directory.read',
  'directory.update',
  'faq.create',
  'faq.delete',
  'faq.read',
  'faq.update',
  'inquiry.read',
  'inquiry.update',
  'letter.archive',
  'letter.close',
  'letter.create',
  'letter.delete',
  'letter.read',
  'letter.receive',
  'letter.sign',
  'letter.update',
  'permission.create',
  'permission.delete',
  'permission.read',
  'permission.update',
  'response.create',
  'response.read',
  'response.update',
  'role.create',
  'role.delete',
  'role.read',
  'role.update',
  'role_assignment.create',
  'role_assignment.read',
  'role_assignment.update',
  'signature.create',
  'signature.read',
  'signature.update',
  'stamp.create',
  'stamp.delete',
  'stamp.read',
  'stamp.update',
  'template.create',
  'template.delete',
  'template.read',
  'template.update',
  'user.create',
  'user.manage_status',
  'user.read',
  'user.reset_password',
  'user.update',
];
const humanise = (code) => {
  const [entity, action] = code.split('.');
  const e = entity.replace(/_/g, ' ');
  const a = action.replace(/_/g, ' ');
  return `${a.charAt(0).toUpperCase()}${a.slice(1)} ${e}`;
};
const ROLES = {
  'System Administrator': { description: 'Full access to every module.', permissions: 'ALL' },
  'Directorate Head': {
    description: 'Signs, sends and closes letters for a directorate.',
    permissions: [
      'letter.create',
      'letter.read',
      'letter.update',
      'letter.receive',
      'letter.sign',
      'letter.close',
      'letter.archive',
      'response.create',
      'response.read',
      'response.update',
      'signature.create',
      'signature.read',
      'signature.update',
      'stamp.read',
      'template.read',
      'chat.create',
      'chat.read',
      'chat.send',
      'chat.update',
      'directory.read',
      'user.read',
      'announcement.read',
      'faq.read',
    ],
  },
  Officer: {
    description: 'Drafts and handles day-to-day correspondence.',
    permissions: [
      'letter.create',
      'letter.read',
      'letter.update',
      'letter.receive',
      'response.create',
      'response.read',
      'signature.read',
      'template.read',
      'chat.create',
      'chat.read',
      'chat.send',
      'directory.read',
      'announcement.read',
      'faq.read',
    ],
  },
};
async function main() {
  // 1) permissions
  for (const code of PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { permission_code: code },
      update: {},
      create: { permission_code: code, permission_name: humanise(code) },
    });
  }
  const permissions = await prisma.permission.findMany({ select: { permission_id: true, permission_code: true } });
  const idByCode = new Map(permissions.map((p) => [p.permission_code, p.permission_id]));
  // 2) roles + role_permissions (additive: never removes links an admin added later)
  const roleIds = new Map();
  for (const [name, def] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({
      where: { role_name: name },
      update: {},
      create: { role_name: name, description: def.description },
    });
    roleIds.set(name, role.role_id);
    const codes = def.permissions === 'ALL' ? [...PERMISSION_CODES] : def.permissions;
    for (const code of codes) {
      const permission_id = idByCode.get(code);
      if (!permission_id) throw new Error(`Seed refers to unknown permission ${code}`);
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: role.role_id, permission_id } },
        update: {},
        create: { role_id: role.role_id, permission_id },
      });
    }
  }
  // 3) root directory
  const hq = await prisma.directory.upsert({
    where: { directory_code: 'HQ' },
    update: {},
    create: { directory_code: 'HQ', directory_name: 'Head Office', description: 'Root directory' },
  });
  // 4) first administrator
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.gov.et').toLowerCase();
  let password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === 'production') throw new Error('SEED_ADMIN_PASSWORD is required in production.');
    password = 'ChangeMe#12345';
    console.warn(`! SEED_ADMIN_PASSWORD not set - using the development password "${password}"`);
  }
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      first_name: 'System',
      last_name: 'Administrator',
      account_status: 'active',
      password_hash: await bcrypt.hash(password, 12),
    },
  });
  await prisma.roleAssignment.upsert({
    where: {
      user_id_role_id_directory_id: {
        user_id: admin.user_id,
        role_id: roleIds.get('System Administrator'),
        directory_id: hq.directory_id,
      },
    },
    update: {},
    create: {
      user_id: admin.user_id,
      role_id: roleIds.get('System Administrator'),
      directory_id: hq.directory_id,
      assigned_by: admin.user_id,
    },
  });
  console.log(`Seeded ${PERMISSION_CODES.length} permissions, ${roleIds.size} roles, directory HQ, admin ${email}`);
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
