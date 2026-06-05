# ADR-001: Why SES for sending the OTP

**Status:** Accepted

## Context

I need to send OTP codes by email in `generateOtp`. The volume is low and we don't want to run our own mail infrastructure.

## Decision

I chose **Amazon SES** to send the OTP because it's a good fit for this use case: it's serverless, scales without us worrying about capacity, and for this project it's way cheaper than the alternatives.

## Why SES fits here

- **Serverless** — no servers or queues to operate.
- **Scalable** — if traffic grows, SES handles it.
- **Cost** — for the volume I expect, it's the cheapest option.
