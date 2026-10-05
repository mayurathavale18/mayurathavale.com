---
title: "Jobwatch"
weight: 2
date: 2026-10-06T00:00:00+05:30
description: "My self-hosted job-search tool: Go polls job boards, Python generates tailored resumes and scores role fit, and a React dashboard and Telegram share a SQLite event queue."
tags: ["Go", "Python", "React", "SQLite", "LLM", "k3s"]
github: "https://github.com/mayurathavale18/jobwatch"
---

I built Jobwatch to collect job postings, compare them with my experience and
preferences, and prepare a resume and outreach draft for roles I want to pursue.
I review the results and manage application status through a dashboard or Telegram.

The current implementation runs on a single Contabo server with k3s. It uses Go
for polling, the HTTP API and background worker; Python for resume generation and
email tools; React for the dashboard; and SQLite for jobs, application state and
queued actions. The [source repository](https://github.com/mayurathavale18/jobwatch)
contains the implementation. The dashboard is private.

## Architecture

```text
ATS APIs and job feeds                  Manual URL / pasted JD
          |                                      |
Go poller: normalize, filter, deduplicate --------+
          |
SQLite jobs + application state <------ React dashboard / Go API
          |                                      |
30-minute tailoring CronJob            SQLite events queue
          |                                      ^
Python: JD -> resume -> PDF -> verdict            |
          |                            Telegram long-poll listener
          v                                      |
Telegram PDF + fit explanation          Go worker: four handlers
                                                 |
                           Status / notes / resume fix / outreach / run-now

Email composer / outreach -> Python email tools -> Gmail drafts
```

The dashboard, worker and scheduled jobs mount the same `jobwatch-data` persistent
volume at `/opt/jobwatch`. SQLite runs in WAL mode. There is no separate database
server or message broker. The React build is embedded in the Go binary with
`go:embed`, so the dashboard and JSON API ship together.

## Collecting and filtering jobs

The poller runs every 15 minutes. Provider adapters cover Greenhouse, Lever,
Ashby and Workday, plus RemoteOK, We Work Remotely, Remotive and web3.career.
Each adapter returns a common job structure. Polling allows five sources in
flight, with a 60-second timeout per source; one failed source does not abort
the cycle.

An exact key identifies a posting by provider, company slug and external ID.
A second check compares normalized company, title and location across providers
within a 30-day window. This catches a company-board posting that also appears
in an aggregator.

Title filters use word boundaries. Location exclusions distinguish a worldwide
remote role from a remote role restricted to a particular country. Rejected
postings remain in SQLite as `ignored`, preserving discovery history and avoiding
repeated alerts. The `refilter` command applies changed filters to queued `new`
jobs. For boards without a supported feed, I can submit a URL through Telegram
or paste the job description into the dashboard.

## Tailored resumes and role fit

Every 30 minutes, the Python pipeline processes eligible jobs, prioritizing remote
roles and then recent postings. It fetches the job description, selects resume
content, writes LaTeX and compiles it with Tectonic. It checks the PDF page count
and makes one tighter attempt if the first version fails or exceeds one page.

Automated tailoring uses recorded experience and approved skills. Keyword gaps
can appear in separate skills or familiarity lines rather than being inserted as
new experience claims. Explicit user rewrite instructions follow a separate
path, so the automated safeguards are not a guarantee for every manual edit.

An LLM compares the job description and resume with a preference profile and
returns a verdict, fit score, work mode and explanation. The configured primary
model is `kimi-k3`, with `glm-5.3` as fallback. If LLM judging is unavailable,
rule-based scoring still produces a result labelled with its source.

Batch tailored notifications are suppressed below a fit score of 45. Manual
submissions bypass that fit threshold, and a missing fit score is not treated as
a rejection. Successful tailoring sends the PDF and explanation to Telegram.
The earlier poller alerts still run separately and are not gated by this score.

## Telegram and background actions

One worker long-polls Telegram. It commits received updates and the advanced
Telegram offset in the same SQLite transaction, so a crash between those writes
cannot acknowledge an update without queuing it. Dashboard requests for manual
tailoring, outreach and scheduled-job execution write to the same `events` table.

Four handlers claim pending events with an atomic `UPDATE ... RETURNING`.
Events move through `pending`, `running`, and `done` or `failed`; the dashboard
shows their status, attempts and errors. Telegram replies can change application
status, append notes, request a resume fix or start outreach.

On shutdown, the worker stops claiming new work and lets active handlers finish
within the pod's 120-second grace period. On restart, interrupted events are
requeued until they reach three attempts. Ordinary handler errors are marked
failed without an automatic retry, since repeating an action can repeat its
external side effects. This is not an exactly-once guarantee for email or
Telegram delivery. The worker uses one replica and Kubernetes `Recreate` to
avoid competing Telegram consumers during a deployment.

## Outreach I can review

The dashboard imports LinkedIn's `Connections.csv` export and shows connections
at a job's company. Its email composer can generate or revise text, save or update
a Gmail draft, and send after confirmation. A draft can have a blank recipient
while I find the right contact.

The separate founder-outreach path combines sector classification, an Apollo
company-size lookup and a personalized Gmail draft with the resume attached.
Apollo's free tier does not provide founder emails for this setup, so that path
needs an address supplied through a dashboard override, outreach instructions
or a Telegram reply. Jobwatch does not automatically submit applications.

## Deployment and operating limits

GitHub Actions builds the frontend, copies source into the persistent volume,
builds the Go binary inside the cluster and restarts the dashboard and worker.
The runtime image supplies tools and libraries; application source is mounted
from the volume. Traefik handles HTTPS and Basic Auth for dashboard access.

Kubernetes CronJobs run polling, tailoring, a daily summary and a weekly backup.
Secrets stay in the server's environment file. SQLite backups need a WAL
checkpoint before copying the database file.

This is a personal, single-server system. The shared volume and database are
single points of failure. A failed tailoring entry is not automatically retried
by the next batch, and generated PDFs in a CronJob pod's home directory should
not be treated as persistent storage. The queue records background work, but
running an LLM pipeline still takes longer than a status update.
