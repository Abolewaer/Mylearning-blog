// The unauthenticated local editor must never listen on the LAN.
process.env.BIND_HOST = '127.0.0.1';
process.env.PORT = '8081';
process.env.ORIGIN = 'http://127.0.0.1:4000';
process.chdir(require('node:path').resolve(__dirname, '..'));
require('decap-server');
