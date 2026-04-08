#!/usr/bin/env node
/**
 * Creates an iOS Distribution certificate via the App Store Connect API,
 * imports it into the macOS keychain, exports as p12, and prints base64
 * so it can be saved as a GitHub secret for future runs.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const path = require('path');

const KEY_ID    = '3CL3588VSB';
const ISSUER_ID = 'cf8f6456-896e-47ed-a844-e20e07e7126f';
const KEY_PATH  = process.env.KEY_PATH;
const WORK_DIR  = process.env.RUNNER_TEMP || '/tmp';
const P12_PASS  = 'primomarble2024';

function generateJWT() {
  const header  = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })).toString('base64url');
  const now     = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' })).toString('base64url');
  const data    = `${header}.${payload}`;
  const pem     = fs.readFileSync(KEY_PATH, 'utf8');
  const sign    = crypto.createSign('SHA256');
  sign.update(data);
  const sig = sign.sign({ key: pem, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${data}.${sig}`;
}

function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const jwt  = generateJWT();
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.appstoreconnect.apple.com',
      path: apiPath,
      method,
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const keyFile     = path.join(WORK_DIR, 'dist_key.pem');
  const csrFile     = path.join(WORK_DIR, 'dist.csr');
  const cerFile     = path.join(WORK_DIR, 'dist.cer');
  const certPemFile = path.join(WORK_DIR, 'dist_cert.pem');
  const p12File     = path.join(WORK_DIR, 'distribution.p12');

  console.log('Generating RSA private key...');
  execSync(`openssl genrsa -out "${keyFile}" 2048`, { stdio: 'inherit' });

  console.log('Generating CSR...');
  execSync(`openssl req -new -key "${keyFile}" -out "${csrFile}" -subj "/CN=iPhone Distribution/O=Primo Marble/C=AU"`, { stdio: 'inherit' });

  let csrContent = fs.readFileSync(csrFile, 'utf8')
    .replace('-----BEGIN CERTIFICATE REQUEST-----', '')
    .replace('-----END CERTIFICATE REQUEST-----', '')
    .replace(/\n/g, '').trim();

  console.log('Creating iOS Distribution certificate via App Store Connect API...');
  const res = await apiRequest('POST', '/v1/certificates', {
    data: {
      type: 'certificates',
      attributes: { csrContent, certificateType: 'IOS_DISTRIBUTION' }
    }
  });

  if (res.status !== 201) {
    console.error('API error:', JSON.stringify(res.body, null, 2));
    process.exit(1);
  }

  const certB64 = res.body.data.attributes.certificateContent;
  fs.writeFileSync(cerFile, Buffer.from(certB64, 'base64'));
  console.log('Certificate downloaded.');

  console.log('Converting to PEM...');
  execSync(`openssl x509 -in "${cerFile}" -inform DER -out "${certPemFile}"`, { stdio: 'inherit' });

  console.log('Importing into keychain...');
  execSync(`security import "${cerFile}" -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign || true`, { stdio: 'inherit' });
  execSync(`security import "${keyFile}" -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign || true`, { stdio: 'inherit' });
  execSync(`security set-key-partition-list -S apple-tool:,apple: -k "" ~/Library/Keychains/login.keychain-db || true`, { stdio: 'inherit' });

  console.log('Exporting p12...');
  execSync(`openssl pkcs12 -export -out "${p12File}" -inkey "${keyFile}" -in "${certPemFile}" -passout pass:${P12_PASS} -legacy || openssl pkcs12 -export -out "${p12File}" -inkey "${keyFile}" -in "${certPemFile}" -passout pass:${P12_PASS}`, { stdio: 'inherit' });

  const p12B64 = execSync(`base64 -i "${p12File}"`).toString().replace(/\n/g, '');

  console.log('\n========================================================');
  console.log('SAVE THIS AS GITHUB SECRET: DISTRIBUTION_CERT_P12');
  console.log('========================================================');
  console.log(p12B64);
  console.log('========================================================');
  console.log(`P12 PASSWORD (save as DISTRIBUTION_CERT_PASSWORD): ${P12_PASS}`);
  console.log('========================================================\n');

  // Write p12 path to env for subsequent steps
  fs.appendFileSync(process.env.GITHUB_ENV, `DIST_CERT_P12=${p12File}\n`);
  fs.appendFileSync(process.env.GITHUB_ENV, `DIST_CERT_PASSWORD=${P12_PASS}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
