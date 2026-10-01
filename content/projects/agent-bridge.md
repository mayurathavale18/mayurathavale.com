---
title: "Agent Bridge"
date: 2026-10-02T00:00:00+05:30
description: "An open-source bridge for driving Command Code, Codex and Claude Code from WhatsApp, with a shared event contract, session resume and native permission controls."
tags: ["TypeScript", "AI Agents", "WhatsApp", "Open Source", "Kubernetes"]
github: "https://github.com/mayurathavale18/agent-bridge"
---

Agent Bridge connects an existing OpenWA WhatsApp session to a coding agent on your
own machine or server. Send an `@me` prompt in your self-chat, receive progress and
a labelled answer, and continue the same harness session with the next message.

![WhatsApp self-chat to command execution](/images/agent-bridge/whatsapp-workflow.svg)

The bridge normalizes each CLI's output into one event contract. Command Code,
Codex and Claude Code use the same channel and configuration dashboard; the
[Hermes OpenWA companion](https://github.com/mayurathavale18/hermes-openwa) reuses
the same gateway through its own adapter. Only one webhook receives new turns.
Each harness retains its own history.

Control the bridge directly from the self-chat: `@me /models` lists the active
harness's catalog, `/model <id>` verifies a model before applying it, and
`/harness <id>` verifies and switches adapters. Named threads use `/new <name>`,
`/threads` and `/use <name>`; each harness keeps its own thread history.

Images and documents can be attached with an `@me` caption. Use `/send <path>`
to retrieve a workspace file. Private context can include selected ChatGPT,
Claude and CLI transcript exports, while clarification options use numbered
text replies where a harness exposes a reply transport. See the
[chat controls guide](https://github.com/mayurathavale18/agent-bridge/blob/main/docs/chat-controls.md)
for supported transports and limits.

Codex starts in a read-only sandbox, and Claude Code starts in plan mode with
unanswered permission requests denied. Command Code also supports tool approvals
through WhatsApp. The new adapters have been checked with real model replies and
session resume, alongside deterministic tests for their event streams.

## Try it locally

```sh
git clone https://github.com/mayurathavale18/agent-bridge.git
cd agent-bridge
npm ci
npm install -g @openai/codex
codex login
node src/index.ts --harness codex "Describe this repository"
```

No cluster or WhatsApp pairing is needed for the first CLI run. The
[minimal setup guide](https://github.com/mayurathavale18/agent-bridge/blob/main/docs/quickstart.md)
covers Windows executable paths, Claude Code, permissions and connecting an
existing OpenWA session.

The project runs on my Contabo k3s cluster. Its dashboard is an operator interface
protected by authentication. Source, editable technical diagrams and contribution
instructions are available in the [repository](https://github.com/mayurathavale18/agent-bridge).

