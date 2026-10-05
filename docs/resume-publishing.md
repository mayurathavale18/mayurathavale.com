# Publish the master resume once

Public resume URL: https://mayurathavale.com/resume

The website viewer button and SSH portfolio use `/resume`, a GitHub Pages redirect page that opens the existing Drive viewer. The download button uses Drive’s download URL. The hosted PDF at `/mayur_athavale_resume.pdf` remains the source for the optional Drive-sync script below. Pushing main triggers Pages.

## Publish an approved PDF

From this website checkout:

```powershell
./scripts/publish-resume.ps1 -Pdf "$HOME/Downloads/mayur_athavale_resume.pdf" -Push
```

Use `-WhatIf` to validate and preview. Omit `-Push` for local review. The publisher rejects non-PDF inputs, staged unrelated changes and publishing outside main. Inspect the PDF's layout and claims first; it does not compile LaTeX or establish ATS compatibility.

## Automatic Drive copy without a desktop client

Existing Drive PDF: https://drive.google.com/file/d/1xBZrOwoQ__H34YFiSfwYG16gFu6iQAQo/view

`scripts/sync-resume-to-drive.gs` fetches the website PDF, checks its signature/size and compares its MD5 with the existing Drive file. It replaces the bytes only when different, preserving the file ID, folder and permissions, then verifies the checksum. A lock prevents overlapping runs. There is no public endpoint or stored token.

**Prepared, not installed or scheduled.** One-time setup:

1. Create a private project at https://script.google.com/ and paste the `.gs` file into Code.gs.
2. Under Services, add Drive API, version v3.
3. Run `syncResumeToDrive` and review Google's authorization request. The Advanced Drive service requests Drive access; approve only after reviewing the code/account. Its OAuth permission is broader than the one file the code targets. Do not publish this as a web app.
4. Verify the existing Drive URL opens the expected PDF.
5. For automatic hourly checks, run `installResumeSync` once. It reuses an existing matching trigger. Google controls scheduling; updates can lag deployment by approximately one polling interval.

Inspect failures under Executions. Failed downloads, invalid PDFs and non-PDF destinations stop before upload. Delete the time trigger to stop syncing. Until setup is complete the publisher updates the website only.

Official references: [Advanced Drive service](https://developers.google.com/apps-script/advanced/drive) and [time-driven triggers](https://developers.google.com/apps-script/guides/triggers/installable#time-driven_triggers).

## Routine flow

Edit/compile in Overleaf -> inspect/download PDF -> run publisher -> Pages updates the hosted PDF -> configured Apps Script updates the same Drive file -> `/resume` opens that Drive file.

Job portals keep their own uploads. Jobwatch's tailored application resumes remain separate from this public master.
