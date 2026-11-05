/**
 * Finds wrong Prisma names in your source code BEFORE you deploy.
 * Put this file in: scripts/check-prisma-names.js
 * Run:  node scripts/check-prisma-names.js
 */
import fs from 'node:fs';
import path from 'node:path';
import prismaPkg from '@prisma/client';

const { Prisma } = prismaPkg;

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// valid client names, e.g. User -> user, UserRoleAssignment -> userRoleAssignment
const models = Prisma.dmmf.datamodel.models;
const validModels = new Set(models.map((m) => lowerFirst(m.name)));

// every relation field name that exists in the schema
const validRelations = new Set();
for (const m of models) for (const f of m.fields) if (f.kind === 'object') validRelations.add(f.name);

// names that are known mistakes for this project
const KNOWN_WRONG = ['role_permissions', 'role_assignments', 'userRoles', 'userRole'];

const METHODS =
  'findMany|findUnique|findUniqueOrThrow|findFirst|findFirstOrThrow|create|createMany|update|updateMany|upsert|delete|deleteMany|count|aggregate|groupBy';
const CALL = new RegExp(`\\b(prisma|tx|db|client)\\.([A-Za-z_]+)\\.(${METHODS})\\b`, 'g');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.js')) out.push(full);
  }
  return out;
}

let problems = 0;
for (const file of [...walk('src'), ...(fs.existsSync('prisma') ? walk('prisma') : [])]) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(CALL)) {
      if (!validModels.has(m[2])) {
        problems++;
        const guess = [...validModels].find((v) => v.toLowerCase().includes(m[2].toLowerCase().replace(/s$/, '')));
        console.log(`${file}:${i + 1}  ${m[1]}.${m[2]} does not exist${guess ? `  -> did you mean "${guess}"?` : ''}`);
      }
    }
    for (const bad of KNOWN_WRONG) {
      if (new RegExp(`\\b${bad}\\b`).test(line) && !validRelations.has(bad)) {
        problems++;
        console.log(`${file}:${i + 1}  "${bad}" is not a relation in the schema`);
      }
    }
    if (/\broleAssignment\b/.test(line)) {
      problems++;
      console.log(`${file}:${i + 1}  "roleAssignment" -> use "userRoleAssignment" (client) or "roleAssignments" (relation on User)`);
    }
  });
}

console.log(problems ? `\n${problems} problem(s) found.` : 'No wrong Prisma names found.');
process.exit(problems ? 1 : 0);