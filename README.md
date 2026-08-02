# Mimamori-Call

A phone-based wellness check-in agent for elderly people living alone, built on [CALL-E](https://docs.heycall-e.com/) for the *CALL-E: Your Code Is Calling* hackathon.

Mimamori-Call places a short daily call, asks a few simple questions about health, meals, and any concerns, classifies the answers into three levels (no concern / mild concern / needs follow-up), and emails a summary to a registered family member. A companion dashboard lets a family manage the people being checked on, trigger calls on demand, and review call history.

**This is not a medical device.** It never gives medical advice or a diagnosis — it's a check-in and messenger, nothing more.

Live demo: https://call-e-anpi.vercel.app

## Features

- **Automated wellness calls** — CALL-E asks three questions (how are you feeling / are you eating properly / is there anything you need), phrased to keep the conversation short and to always move forward rather than loop on a hard question.
- **Three-tier classification** — each call's structured result is classified as `ok`, `mild_concern`, or `escalate` based on reported concerns, meal status, and keyword cues in the health answer. No answer at all is always treated as `escalate`.
- **Family notification by email** — a summary is emailed after every call, including "ok" results, so family knows the check actually happened.
- **Dashboard** — register/edit/delete the people being checked on, call anyone on demand (individually or all at once), and browse call history with the classification and reasoning for each call.
- **English and Japanese** — the UI defaults to English (a toggle switches to Japanese) and each person has their own call/notification language, independent of the UI language. See [Localization](#localization) for a real constraint this ran into.

## How it works

```
Dashboard / Cron ──▶ runWellnessCheck(recipient)
                        │
                        ├─▶ CALL-E: places the call, waits for a structured result
                        ├─▶ classifyWellnessResult(): ok / mild_concern / escalate
                        ├─▶ Redis: saves the call record
                        └─▶ Resend: emails the family contact
```

All four steps are called from one function (`src/lib/wellness-service.ts`) so the single-call button, the "call everyone" button, and the (currently unused) daily Cron job can't drift out of sync.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + React
- [CALL-E SDK](https://www.npmjs.com/package/@call-e/calle) (`@call-e/calle`) for placing and retrieving calls
- [Upstash Redis](https://upstash.com/) (REST API) for storage — a serverless-friendly free tier that works out of the box on Vercel, where the filesystem isn't writable
- [Resend](https://resend.com/) for notification emails
- Deployed on [Vercel](https://vercel.com/)

## Project structure

```
src/lib/
  calle/
    client.ts           CalleClient singleton (env: CALLE_API_KEY, CALLE_BASE_URL)
    wellness-call.ts     Call placement/result wrapper (placeCall, placeCallAndWait, getCallResult)
    wellness-script.ts   The 3-question call script + result schema (English/Japanese)
    classify.ts          ok / mild_concern / escalate classification logic
  notify/
    email.ts             Resend notification email (English/Japanese)
  locale.ts               Locale type + CALL-E locale/region mapping + phone/locale validation
  store.ts                 Upstash Redis-backed storage (recipients, call history)
  wellness-service.ts       runWellnessCheck() — the shared call → classify → save → notify flow
src/app/
  dashboard/
    page.tsx              Dashboard: manage recipients, place calls, view history
  api/
    recipients/route.ts          GET list / POST create
    recipients/[id]/route.ts     PATCH update / DELETE remove
    calls/route.ts                GET history / POST single call
    calls/call-all/route.ts       POST call everyone
    cron/daily-wellness-check/route.ts  Vercel Cron endpoint (not currently scheduled)
scripts/
  test-call.mts            Places one real call — connectivity check (npm run test:call)
  test-notify.mts           Places a call and sends the notification email end-to-end
  inspect-call.mts          Looks up a past call by ID for debugging
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Accounts you'll need

| Service | What it's for | Free tier? |
| --- | --- | --- |
| [CALL-E](https://docs.heycall-e.com/) | Placing the wellness calls | Requires an API key + call credits |
| [Upstash](https://console.upstash.com/) | Redis storage (create a database, region doesn't matter much at this scale) | Yes |
| [Resend](https://resend.com/) | Notification emails | Yes, but without a verified domain it can only send to your own account email — see [Known limitations](#known-limitations) |

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` (gitignored, never committed):

| Variable | Description |
| --- | --- |
| `CALLE_API_KEY` | CALL-E API key |
| `CALLE_BASE_URL` | CALL-E API base URL. Required — an empty value causes an "Invalid URL" error when placing calls. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | From the Upstash console → your database → REST API section |
| `RESEND_API_KEY` | Resend API key |
| `CRON_SECRET` | Shared secret for the Cron route's `Authorization` header. Low priority while Cron is unused. |
| `CALLE_TEST_PHONE`, `CALLE_TEST_RECIPIENT_NAME`, `CALLE_TEST_LOCALE`, `FAMILY_TEST_EMAIL` | Only used by the `scripts/*.mts` test scripts below |

### 4. Try a real call (connectivity check)

```bash
npm run test:call
```

Places one real call through CALL-E using `CALLE_TEST_PHONE` and prints the result. This uses real call credits — only point it at a number you're authorized to call.

```bash
npm run test:notify   # same, plus sends the notification email to FAMILY_TEST_EMAIL
```

### 5. Run the dashboard

```bash
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

## Deployment

Deployed on Vercel with the same environment variables set in the project's Environment Variables settings (Production + Preview). Because storage is Upstash Redis rather than a local file, this works on Vercel's serverless functions without any filesystem workaround.

## Localization

The dashboard defaults to English with a toggle to Japanese, and each recipient has their own call/notification language (`en` or `ja`) — independent of the UI language, since the actual people being called are Japanese-speaking family members while the app itself defaults to English.

**Known constraint:** CALL-E currently rejects English-language calls to phone numbers it recognizes as Japan (`"English is not supported for calls to Japan"`). The dashboard and API both validate this up front — a Japan-recognized phone number can only be set to Japanese — so a bad combination is caught at registration time instead of wasting a call. This isn't Japan-specific; other reported issues suggest the same "region × language not yet supported" limitation applies to other countries too. Reported to the CALL-E team via Discord.

## Known limitations

- **Not a medical device.** The call script and every notification explicitly avoid medical advice or diagnosis.
- **Resend test mode.** Without a verified sending domain, Resend can only deliver to the account owner's own email — notification emails to other addresses will fail in this demo. A failed notification doesn't affect the call result; it's just reported as `notified: false` and shown as such on the dashboard.
- **CALL-E region/language coverage** — see [Localization](#localization) above.
- **Best-effort classification.** The `mild_concern` / `escalate` split is a coarse heuristic over CALL-E's structured result, not a clinical judgment. It only decides how quickly family should be notified, never what's medically wrong.

## Safety & privacy

- Use dummy data during development. Only place real calls to numbers whose owner has consented — never an actual elderly person without their and their family's explicit agreement.
- The demo environment's recipient data (names, phone numbers, call summaries) should be cleared before sharing the live URL publicly.
