# ADR 0005: Apple Sign In Deferred Pending Credentials

## Status
Accepted (2026-03-09)

## Context
Federated auth scope includes Google now and Apple later. Apple requires external Apple Developer credentials and signing setup that are not currently available.

## Decision
Proceed with Google IdP implementation now and defer Apple Sign In resource creation.
- Keep Apple Terraform inputs scaffolded for future enablement.
- Do not create Apple Cognito IdP resources until credentials are available.

## Consequences
Positive:
- Delivers current user-facing federation with available credentials.
- Preserves forward path without blocking core split-host/auth rollout.

Negative:
- Apple auth is unavailable in current release.

## Alternatives Considered
1. Block all social login until Apple is ready.
- Rejected: unnecessary delivery delay.

2. Partially configure Apple with placeholder secrets.
- Rejected: brittle and non-functional deployment state.
