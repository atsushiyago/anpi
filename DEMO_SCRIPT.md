# Demo video script (~3 min)

For the CALL-E hackathon submission. English narration (spoken or as captions).
Mask the phone number (and email, if using a real one) in post-production.

**Before recording:**

- Reset/clear real recipient data (or only show freshly-created demo entries)
- Register the demo recipient with a placeholder name ("Demo User"), your real phone
  number (needed to receive the call), and a placeholder email like `demo@example.com`
- Have the dashboard open at https://call-e-anpi.vercel.app/dashboard, logged in / ready
- Have your phone nearby, ringer on

---

## 0:00–0:30 — The problem and the idea (30s)

**Visual:** Talking head, or a simple title card / the dashboard's empty state.

**Narration:**

> Checking in on an elderly family member every day, by phone, doesn't scale — especially
> if you live far away, or you're juggling work and your own family.
>
> WellRing is a phone-based wellness check-in agent built on CALL-E. Every day, it
> calls the person, asks three simple questions — how they're feeling, whether they're
> eating properly, and whether they need anything — and classifies the answer into three
> levels: no concern, mild concern, or needs follow-up. Then it emails a summary to their
> family. It's not a medical device — just a reliable, automated check-in.

---

## 0:30–2:00 — Live call demo (90s)

**Visual:** Screen recording of the dashboard.

1. **(0:30–0:50) Register the demo recipient**
   - Click "+ Add someone"
   - Fill in name ("Demo User"), phone number (blur later), email, language (English)
   - Submit

   **Narration:**

   > Let's register someone to check on. Just a name, phone number, notification email,
   > and the language for the call — I'll use English here.

2. **(0:50–1:10) Trigger the call**
   - Click "Call now"
   - Cut to phone ringing / answering

   **Narration:**

   > Now I'll trigger a check-in call right now instead of waiting for the daily schedule.
   > That's my phone ringing.

3. **(1:10–1:55) The actual call, on speaker or phone screen recording**
   - Let CALL-E ask the 3 questions, answer naturally (can choose an "ok" scenario, or a
     "mild concern" one — e.g. mention feeling a little tired — for a more interesting demo)

   **Narration (over/after the call, if not narrating live):**

   > CALL-E asks how I'm feeling, whether I've been eating properly, and whether there's
   > anything I need — then wraps up politely. The whole call takes under a minute.

---

## 2:00–3:00 — Results and family view (60s)

**Visual:** Back to the dashboard.

1. **(2:00–2:25) Call history**
   - Show the new entry appearing with its classification badge, summary, and reasons

   **Narration:**

   > Back on the dashboard, the call shows up immediately with its result — here it's
   > [ok / mild concern], along with why, and a one-line summary of the conversation.

2. **(2:25–2:40) Family notification**
   - Show the notification email (masked email address) in an inbox

   **Narration:**

   > The family contact also gets an email with the same summary, so they know the check
   > actually happened — even when everything's fine.

3. **(2:40–2:55) Quick feature tour**
   - Toggle EN/JA language switch
   - Point at "Call everyone now" button

   **Narration:**

   > The dashboard supports English and Japanese — useful since the people we're actually
   > checking on are Japanese-speaking family. And if there's more than one person to check
   > on, one button calls everyone.

4. **(2:55–3:00) Close**

   **Narration:**

   > That's WellRing — links to the source and the live demo are in the description.
   > Thanks for watching.

---

## Description text (for YouTube/Vimeo)

```
WellRing: a phone-based wellness check-in agent for elderly people living alone,
built on CALL-E for the CALL-E hackathon.

Source: https://github.com/atsushiyago/anpi
Live demo: https://call-e-anpi.vercel.app
```
