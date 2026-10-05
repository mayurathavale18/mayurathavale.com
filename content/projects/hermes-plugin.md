---
title: "Hermes Plugin"
weight: 3
date: 2026-10-06T00:00:00+05:30
description: "A Hermes Agent platform plugin that connects WhatsApp through an existing OpenWA session, with signed webhooks, duplicate filtering and operator-only self-chat controls."
tags: ["Python", "Hermes Agent", "WhatsApp", "OpenWA"]
github: "https://github.com/mayurathavale18/hermes-openwa"
---

Hermes Plugin connects Hermes Agent to an existing OpenWA WhatsApp gateway.
I can send prompts from my WhatsApp self-chat and receive responses without
pairing a separate gateway for Hermes.

OpenWA forwards messages through a signed webhook. The adapter verifies the
signature, filters duplicate messages and echoes, and restricts access to the
operator's self-chat by default. Hermes handles agent tools, skills and memory;
the plugin sends replies back through OpenWA.

It shares the gateway with [Agent Bridge](/projects/agent-bridge/). A server
selector routes new messages to one active webhook, while each harness keeps
its own history. With Hermes active, model selection is available through
WhatsApp commands.

The Python transport handles OpenWA requests; a separate adapter integrates
with the Hermes gateway. It uses Hermes' existing aiohttp dependency.

[Source and setup instructions](https://github.com/mayurathavale18/hermes-openwa).
