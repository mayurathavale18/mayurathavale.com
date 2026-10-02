// Enable the Advanced Drive service (v3) in this private Apps Script project.
const RESUME_URL = 'https://mayurathavale.com/mayur_athavale_resume.pdf';
const RESUME_FILE_ID = '1xBZrOwoQ__H34YFiSfwYG16gFu6iQAQo';

function syncResumeToDrive() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return 'Another sync is running';
  try {
    const file = Drive.Files.get(RESUME_FILE_ID, {fields: 'id,mimeType,md5Checksum'});
    if (file.mimeType !== 'application/pdf') throw new Error('Destination is not a PDF');
    const response = UrlFetchApp.fetch(RESUME_URL, {muteHttpExceptions: true});
    if (response.getResponseCode() !== 200) throw new Error('Resume download failed');
    const blob = response.getBlob();
    const bytes = blob.getBytes();
    const signature = bytes.slice(0, 5).map(b => String.fromCharCode(b)).join('');
    if (signature !== '%PDF-' || bytes.length < 100 || bytes.length > 10 * 1024 * 1024) {
      throw new Error('Downloaded content is not an acceptable PDF');
    }
    const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, bytes)
      .map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
    if (file.md5Checksum === hash) return 'Already current';
    Drive.Files.update({}, RESUME_FILE_ID, blob.setContentType('application/pdf'), {fields: 'id'});
    const updated = Drive.Files.get(RESUME_FILE_ID, {fields: 'md5Checksum'});
    if (updated.md5Checksum !== hash) throw new Error('Drive readback checksum differs');
    return 'Updated existing Drive PDF';
  } finally {
    lock.releaseLock();
  }
}

// Run once after reviewing/authorizing syncResumeToDrive. No public web endpoint.
function installResumeSync() {
  syncResumeToDrive();
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'syncResumeToDrive')) {
    ScriptApp.newTrigger('syncResumeToDrive').timeBased().everyHours(1).create();
  }
}
