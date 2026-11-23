const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2] || 'postgresql';
if (!['postgresql', 'sqlite'].includes(target)) {
  console.error('Usage: node scripts/switch-db.js [postgresql|sqlite]');
  process.exit(1);
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

schema = schema.replace(
  /provider\s*=\s*"(sqlite|postgresql)"/,
  `provider = "${target}"`
);

fs.writeFileSync(schemaPath, schema);
console.log(`Updated prisma/schema.prisma provider to: ${target}`);

try {
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (err) {
  console.error('Failed to regenerate prisma client:', err);
}
