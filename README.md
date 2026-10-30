# NegotiateThis

Practice the negotiation you are actually about to have. Describe your real situation (the numbers, the history, who is across the table), then have the conversation with Claude playing the other side. When you end it, you get a straight debrief on how you handled it.

It is not generic negotiation advice. The counterparty reacts to your actual stakes, and the debrief points at the exact lines you said.

## What's in it

**Setup**
- Scenario chips: Salary, Rent, Freelance rate, Purchase, Contract terms, Other
- Your situation, your target and your walk-away point. The last two never go to the counterparty, so it has to find your limits like a real person would
- Who is across the table, plus how hard they push (Flexible, Realistic, Tough)
- Who speaks first. A landlord announcing a rent increase usually opens, a candidate asking for more usually does
- Ready made example for each scenario type (a Pro feature when limits are on)

**Live practice**
- Streaming chat, the counterparty stays in character until you end it
- Your target and walk-away pinned in the sidebar as a reminder
- Capped at 14 exchanges so the debrief stays focused
- Ending asks how it went (deal, no deal, walked away, paused) and the final terms

**Debrief**
- Overall score and an honest read on how this would go in the real conversation
- A deal zone bar showing your walk-away, your target, their opening and where it landed
- Skill scores for anchoring, discovery, concessions and composure
- Value left on the table
- What worked and what cost you
- "Say this instead": your weakest line next to a rewrite you can copy
- Tactics you used (with the turn they happened in) and tactics used on you, with how well you handled each
- Concrete things to do before the real one
- "Run it again" starts a fresh session with the same setup

**History and settings**
- Every session with its outcome and score, filterable by scenario
- Score trend, skill averages and your most used tactics (Pro)
- Plan card, display name, delete all data

## Stack

Next.js 14 (App Router), TypeScript strict, Supabase (Postgres + RLS + Google OAuth), Claude via `@anthropic-ai/sdk`, Tailwind CSS. Deploys on Vercel.

## Running it locally

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in the Supabase and Anthropic keys
3. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor
4. In Supabase, enable the Google provider and add `http://localhost:3000/auth/callback` as a redirect URL
5. `npm run dev`

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From your Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Reserved for billing webhooks later. Not used by the app yet |
| `ANTHROPIC_API_KEY` | Claude API key |
| `CLAUDE_MODEL` | Optional, defaults to `claude-sonnet-5-5` |
| `ENFORCE_PRO` | `true` turns on the free plan limits (3 sessions a month, latest 5 in history, no templates) |

## Scripts

- `npm run dev` / `npm run build` / `npm start`
- `npm run typecheck`
- `npm run lint`
- `npm test` runs the unit tests for the transcript helpers, deal bar maths and debrief normalisation

## How it works

- `lib/claude/counterparty-roleplay.ts` builds the counterparty's system prompt. It gets the situation, its own role and its stance, but never your target or walk-away.
- `app/api/negotiations/[id]/message` streams the reply as plain text and saves your message and their reply together once the stream finishes. If anything goes wrong it sends an `[[error]]` marker and the client puts your message back in the box.
- When the counterparty opens, the client asks for their first line with no content, and the API puts a short cue in front so the conversation starts with a user turn.
- `lib/claude/negotiation-analyzer.ts` runs the debrief as a forced tool call, so the shape is guaranteed. The result is normalised before it is saved, so a bad turn number or a number written as text can't break the page.
- RLS scopes every row to its owner. Plan changes can't be made from the browser.

Practice tool only. Nothing here is legal or financial advice.
