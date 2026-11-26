---
name: quota-and-cost
description: "Keep Hazy inside free-tier and budget limits: Open-Meteo call quotas, Netlify Free plan usage, and Claude API spend. Use when adding API calls, caching, background jobs or anything that multiplies requests or tokens."
metadata:
  owner: netlify-engineer
  shared_with: [api-integration-expert, agent-console-engineer]
---
# Quota and cost

| Resource | Limit | Control |
|---|---|---|
| Open-Meteo (free, non-commercial) | 600/min, 5,000/h, 10,000/day, 300,000/month | browser-direct calls or CDN cache by coordinates rounded to 2 decimals (15 min) |
| NWS | "generous", User-Agent required | 120 s CDN cache per rounded point |
| Netlify Free plan | monthly allowances (invocations, build minutes, bandwidth) | review usage monthly; batch small agent changes into one proposal (each approve = one build) |
| Netlify rate-limit rules | 2 code-based rules | login + agent-chat; everything else app-level |
| Claude API | your spend | `AGENT_DAILY_TOKEN_BUDGET` counter in Blobs; `max_tokens` caps; tool-loop iteration cap; prompt caching; Anthropic Console spend limit |

## Rules
- Any new external call must state its cache key, cache TTL and worst-case calls per day.
- Log `usage.input_tokens`, `usage.output_tokens` and `cache_read_input_tokens` per console turn into the daily counter.
- Refuse a new console turn when the daily budget is exhausted, with a clear message.
