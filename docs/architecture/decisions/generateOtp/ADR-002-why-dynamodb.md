# ADR-002: Why DynamoDB for storing the OTP

**Status:** Accepted

## Context

I need to persist OTP codes in `generateOtp`. The data is simple — mostly a code, an email, and a TTL — and I don't want the operational overhead of running a relational database.

## Decision

I chose **DynamoDB** because it's a fully managed, serverless NoSQL database that fits this use case. It cuts down the operational overhead that RDS, Aurora, or even DocumentDB would bring.

In DynamoDB I just create an item from the Lambda and that's it. I don't need structured relational data like RDS would give me. On top of that, I get DynamoDB's serverless model, and for this project the cost stays low.

## Why DynamoDB fits here

- **Serverless** — no instances or clusters to manage.
- **Simple writes** — create an item from Lambda and done.
- **NoSQL** — no relational schema for data that doesn't need it.
- **Cost** — for the volume I expect, it stays cheap.
