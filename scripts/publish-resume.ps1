[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$Pdf,
    [switch]$Push
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$source = (Resolve-Path -LiteralPath $Pdf).Path
$bytes = [IO.File]::ReadAllBytes($source)
if ($bytes.Length -lt 100 -or [Text.Encoding]::ASCII.GetString($bytes, 0, 5) -ne '%PDF-') {
    throw 'Input must be a compiled PDF.'
}
function Invoke-RepoGit {
    & git -C $repo @args
    if ($LASTEXITCODE -ne 0) { throw "git failed: $args" }
}
if ($Push) {
    $branch = Invoke-RepoGit branch --show-current
    if ($branch -ne 'main') { throw 'Switch the website checkout to main before publishing.' }
    & git -C $repo diff --cached --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Finish or unstage existing staged changes before publishing.' }
}
if (!$PSCmdlet.ShouldProcess('website PDF copies and optional website commit/push', 'Publish resume')) { return }
foreach ($target in @('static/mayur_athavale_resume.pdf', 'mayur_athavale_resume.pdf')) {
    [IO.File]::WriteAllBytes((Join-Path $repo $target), $bytes)
}
Write-Output 'Drive is synchronized by sync-resume-to-drive.gs after its one-time Google setup; this command does not call Drive.'
if ($Push) {
    & git -C $repo diff --quiet -- static/mayur_athavale_resume.pdf mayur_athavale_resume.pdf
    if ($LASTEXITCODE -eq 1) {
        Invoke-RepoGit add -- static/mayur_athavale_resume.pdf mayur_athavale_resume.pdf
        Invoke-RepoGit commit -m 'Update canonical resume'
    } elseif ($LASTEXITCODE -ne 0) { throw 'Could not inspect PDF changes.' }
    Invoke-RepoGit push origin main
}
Write-Output 'Canonical URL: https://mayurathavale.com/mayur_athavale_resume.pdf'
Write-Output 'Website and SSH portfolio already use this URL; their links need no update.'
