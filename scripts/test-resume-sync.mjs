import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';

let bytes = [...Buffer.from('%PDF-' + 'x'.repeat(150))], checksum = '', updates = 0, unlocked = 0;
const hash = () => createHash('md5').update(Buffer.from(bytes)).digest('hex');
const blob = {getBytes: () => bytes, setContentType: () => blob};
const api = {
  LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock: () => unlocked++})},
  Drive: {Files: {
    get: () => ({mimeType: 'application/pdf', md5Checksum: checksum}),
    update: (_, id) => {assert.equal(id, '1xBZrOwoQ__H34YFiSfwYG16gFu6iQAQo'); updates++; checksum = hash();}
  }},
  UrlFetchApp: {fetch: () => ({getResponseCode: () => 200, getBlob: () => blob})},
  Utilities: {DigestAlgorithm: {MD5: 'md5'}, computeDigest: (_, b) => [...createHash('md5').update(Buffer.from(b)).digest()]}
};
runInNewContext(readFileSync(new URL('./sync-resume-to-drive.gs', import.meta.url), 'utf8'), api);
assert.equal(api.syncResumeToDrive(), 'Updated existing Drive PDF');
assert.equal(api.syncResumeToDrive(), 'Already current');
assert.equal(updates, 1);
bytes = [...Buffer.from('<html>' + 'x'.repeat(150))];
assert.throws(() => api.syncResumeToDrive(), /acceptable PDF/);
assert.equal(updates, 1);
assert.equal(unlocked, 3);
console.log('Resume sync: changed PDF updates once; unchanged PDF skips; HTML is rejected; locks release.');
