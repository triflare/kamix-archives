<div align="center">

<img src="public/logo.svg" width="75" alt="The Kamix Archives logo" style="padding-bottom: 20px;"/>

# Kamix Archives

</div>

## Overview

Kamix Archives is an internal tool used by Triflare for the [Kamix Archives website](https://kamix.sdisk.us). Note that this repository does not contain the source code for Kamix.

This serves a file-powered website meant to archive versions of Kamix 1, Kamix 2, Silica PR, Solara PR, and Kamix 3. The design is inspired by [Triflare Marketplace](https://marketplace.sdisk.us).

## Installation

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:a7340f1609804a3476189781d96b3ad3db4aac2a39b32f7566259b52a38e1af3 -->

You need Docker Engine with Compose v2.

For password sign-in, export `ADMIN_PASSWORD` and `SESSION_SECRET` in the shell
that runs Compose before starting the service. Use a strong, unique password
and a separate, randomly generated signing secret (for example, generate the
secret with `openssl rand -hex 32`). Supply the values from your secret manager
or shell environment and keep the signing secret stable across restarts.
Changing it signs out existing administrators. Compose passes these values
through without defaults. If password sign-in is disabled, omit
`ADMIN_PASSWORD`; OpenID Connect still requires `SESSION_SECRET`.

```bash
docker compose up -d
```

Password sign-in waits one second before checking a password. The server accepts
at most four concurrent password checks per process. Each client, identified by
the first `X-Forwarded-For` address (falling back to `X-Real-IP`), may hold at
most two of those slots, so one client cannot occupy the shared capacity and
make another client's request fail. Requests above either limit get HTTP 429.
A request with neither header is treated as its own client and counts only
against the process-wide limit, so run the service behind a proxy that sets one
of them. If you run multiple instances, configure a shared rate limit at the
ingress for password login requests, including React Router's
`/admin/login.data` requests, to limit attempts across all instances.

<!-- /coderabbit-ai-generated:v1 -->

## Feedback and Contributing

Open an [issue](https://github.com/triflare/kamix-archives/issues) for a bug or feature request, or send a [pull request](https://github.com/triflare/kamix-archives/pulls) with your change.
