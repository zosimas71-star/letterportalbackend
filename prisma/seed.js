/**
 * Idempotent seed: permission catalogue, 3 roles, root directory, first admin
 * (and optional demo users). Safe to run many times.
 * Run: npm run db:seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prismaPkg from '@prisma/client';

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

const isProd = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------
// Permissions (every code used by the routers)
// ---------------------------------------------------------------------
const PERMISSION_CODES = [
  'announcement.create', 'announcement.delete', 'announcement.publish', 'announcement.read', 'announcement.update',
  'audit.read',
  'chat.create', 'chat.read', 'chat.send', 'chat.update',
  'directory.create', 'directory.read', 'directory.update',
  'faq.create', 'faq.delete', 'faq.read', 'faq.update',
  'inquiry.read', 'inquiry.update',
  'letter.archive', 'letter.close', 'letter.create', 'letter.delete', 'letter.read',
  'letter.receive', 'letter.sign', 'letter.update',
  'permission.create', 'permission.delete', 'permission.read', 'permission.update',
  'response.create', 'response.read', 'response.update',
  'role.create', 'role.delete', 'role.read', 'role.update',
  'role_assignment.create', 'role_assignment.read', 'role_assignment.update',
  'signature.create', 'signature.read', 'signature.update',
  'stamp.create', 'stamp.delete', 'stamp.read', 'stamp.update',
  'template.create', 'template.delete', 'template.read', 'template.update',
  'user.create', 'user.manage_status', 'user.read', 'user.reset_password', 'user.update'
];

const humanise = (code) => {
  const [entity, action] = code.split('.');
  const e = entity.replace(/_/g, ' ');
  const a = action.replace(/_/g, ' ');
  return `${a.charAt(0).toUpperCase()}${a.slice(1)} ${e}`;
};

// ---------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------
// NOTE: 'System Admin' must match isSystemAdmin() in the services (user.active_role === 'System Admin').
const ADMIN_ROLE = 'System Admin';
const DIRECTOR_ROLE = 'Director';
const OFFICER_ROLE = 'Officer';

const ROLES = {
  [ADMIN_ROLE]: {
    description: 'Full access to every module.',
    permissions: 'ALL'
  },

  [DIRECTOR_ROLE]: {
    description: 'Heads a directorate: signs, sends, responds to and closes letters.',
    permissions: [
      // letters & responses
      'letter.create', 'letter.read', 'letter.update', 'letter.receive',
      'letter.sign', 'letter.close', 'letter.archive',
      'response.create', 'response.read', 'response.update',
      // own signature (required to send a letter) + directory stamps & templates
      'signature.create', 'signature.read', 'signature.update',
      'stamp.create', 'stamp.read', 'stamp.update',
      'template.create', 'template.read', 'template.update',
      // people & org
      'directory.read', 'user.read', 'role_assignment.read',
      // chat & website content (read only)
      'chat.create', 'chat.read', 'chat.send', 'chat.update',
      'announcement.read', 'faq.read'
    ]
  },

  [OFFICER_ROLE]: {
    description: 'Drafts and handles day-to-day correspondence.',
    permissions: [
      // letters & responses (no close / archive / delete)
      'letter.create', 'letter.read', 'letter.update', 'letter.receive', 'letter.sign',
      'response.create', 'response.read',
      // an officer needs their own signature: createLetter requires signature_id owned by the caller
      'signature.create', 'signature.read', 'signature.update',
      'stamp.read', 'template.read',
      'directory.read',
      'chat.create', 'chat.read', 'chat.send',
      'announcement.read', 'faq.read'
    ]
  }
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
async function upsertUser({ email, first_name, last_name, employee_number, password }) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      first_name,
      last_name,
      employee_number: employee_number ?? null,
      account_status: 'active',
      password_hash: await bcrypt.hash(password, 12)
    }
  });
}

async function assignRole(userId, roleId, directoryId, assignedBy) {
  return prisma.userRoleAssignment.upsert({
    where: {
      user_id_role_id_directory_id: { user_id: userId, role_id: roleId, directory_id: directoryId }
    },
    update: {},
    create: { user_id: userId, role_id: roleId, directory_id: directoryId, assigned_by: assignedBy }
  });
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------
async function main() {
  // 1) permissions
  for (const code of PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { permission_code: code },
      update: {},
      create: { permission_code: code, permission_name: humanise(code) }
    });
  }
  const permissions = await prisma.permission.findMany({
    select: { permission_id: true, permission_code: true }
  });
  const idByCode = new Map(permissions.map((p) => [p.permission_code, p.permission_id]));

  // 2) roles + role_permissions (additive: never removes links an admin added later)
  const roleIds = new Map();
  for (const [name, def] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({
      where: { role_name: name },
      update: {},
      create: { role_name: name, description: def.description }
    });
    roleIds.set(name, role.role_id);

    const codes = def.permissions === 'ALL' ? PERMISSION_CODES : def.permissions;
    for (const code of codes) {
      const permission_id = idByCode.get(code);
      if (!permission_id) throw new Error(`Seed refers to unknown permission "${code}"`);
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: role.role_id, permission_id } },
        update: {},
        create: { role_id: role.role_id, permission_id }
      });
    }
  }

  // 3) root directory
  const hq = await prisma.directory.upsert({
    where: { directory_code: 'HQ' },
    update: {},
    create: { directory_code: 'HQ', directory_name: 'Head Office', description: 'Root directory' }
  });

  // 4) first administrator
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.gov.et').toLowerCase();
  let adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    if (isProd) throw new Error('SEED_ADMIN_PASSWORD is required in production.');
    adminPassword = 'ChangeMe#12345';
    console.warn(`! SEED_ADMIN_PASSWORD not set - using the development password "${adminPassword}"`);
  }

  const admin = await upsertUser({
    email: adminEmail,
    first_name: 'System',
    last_name: 'Admin',
    employee_number: 'EMP-0001',
    password: adminPassword
  });
  await assignRole(admin.user_id, roleIds.get(ADMIN_ROLE), hq.directory_id, admin.user_id);

  // 5) optional demo users (never in production): SEED_DEMO_USERS=true
  let demo = '';
  if (!isProd && process.env.SEED_DEMO_USERS === 'true') {
    const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'Demo#12345';

    const director = await upsertUser({
      email: 'director@example.gov.et',
      first_name: 'Demo',
      last_name: 'Director',
      employee_number: 'EMP-0002',
      password: demoPassword
    });
    await assignRole(director.user_id, roleIds.get(DIRECTOR_ROLE), hq.directory_id, admin.user_id);

    const officer = await upsertUser({
      email: 'officer@example.gov.et',
      first_name: 'Demo',
      last_name: 'Officer',
      employee_number: 'EMP-0003',
      password: demoPassword
    });
    await assignRole(officer.user_id, roleIds.get(OFFICER_ROLE), hq.directory_id, admin.user_id);

    demo = `, demo users director@/officer@example.gov.et`;
  }

  console.log(
    `Seeded ${PERMISSION_CODES.length} permissions, ${roleIds.size} roles, directory HQ, admin ${adminEmail}${demo}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());