const fs = require('fs');
const crypto = require('crypto');
const s = crypto.randomBytes(48).toString('base64url');
const e = `SESSION_SECRET=${s}
ADMIN_API_TOKEN=
RP_ID=boards.devonlabs.space
RP_ORIGIN=https://boards.devonlabs.space
HOSTNAME=127.0.0.1
PORT=3000
`;
fs.writeFileSync('.env', e);
console.log('wrote .env');
