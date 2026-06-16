// Gera certificado SSL autoassinado em ssl/cert.pem e ssl/key.pem
// Usado pelo start.bat — não requer openssl instalado no sistema
const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const sslDir = path.join(__dirname, '../../ssl');
const certPath = path.join(sslDir, 'cert.pem');
const keyPath = path.join(sslDir, 'key.pem');

const attrs = [{ name: 'commonName', value: '192.168.1.250' }];
const pems = selfsigned.generate(attrs, {
  days: 825,
  keySize: 2048,
  extensions: [
    {
      name: 'subjectAltName',
      altNames: [
        { type: 7, ip: '192.168.1.250' },
        { type: 7, ip: '127.0.0.1' },
      ],
    },
  ],
});

fs.mkdirSync(sslDir, { recursive: true });
fs.writeFileSync(certPath, pems.cert);
fs.writeFileSync(keyPath, pems.private);
console.log('[SSL] Certificado gerado em ssl/cert.pem (valido por 825 dias).');
