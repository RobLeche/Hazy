# Agent Console flows (v1)

Audience: Theo (builds it), Petra and Rook (test and review). Strings come from [`copy-deck.json`](copy-deck.json) under
`console.*`, `buttons.*`, `status.*` and `errors.*`. Basis: `knowledge/ux-designer-apple-hig/examples/approve-confirmation.md`,
`docs/04-agent-console-and-security.md`, decisions D-002 (Approve commits straight to `main`) and D-003 (60 s streaming, 15 min background).

The moment we design for: the project lead, on a phone, about to publish to production. Every screen must make three things
obvious: who is talking, what will change, and that Approve is irreversible without a rollback.

## 1. Structure

```
Settings ─▶ Console login ─▶ Agent list ─▶ Chat ─▶ Proposal sheet ─▶ Approve confirmation ─▶ Post-approval status
                                  │            └─▶ Paused ─▶ Continue | Run as background job ─▶ Job status
                                  └─ Sign out
```

- Route `/console`, lazy-loaded; the weather app never downloads console code.
- Inside the console the tab bar is hidden. This is a deliberate deviation from the HIG tab bar note, because the chat needs the
  keyboard area and sticky footers, and the console is a separate task entered on purpose. A back link ("Settings" on the login
  and agent list, "Agents" on chat) is always at top left.
- The console needs the network. It never caches `/api/*` responses (Rook's rule: no transcripts or proposals in the service
  worker cache). Offline: `errors.consoleOffline` with **Try again**.
- All agent and model output is rendered as text (`textContent`) or sanitised Markdown, never as HTML.

## 2. Login

Layout: back link, `h1` `console.title`, one line `console.loginIntro`, a password field with visible label `console.passwordLabel`
(`type="password"`, `autocomplete="current-password"`), a **Show password** toggle button, primary **Sign in**.

| State | What the person sees | Copy |
|---|---|---|
| Idle | Field focused on arrival, **Sign in** enabled | none |
| Submitting | Button disabled, status text | `status.signingIn` |
| Wrong password | Error text under the field, field keeps its focus, text selected | `errors.loginWrong` |
| Rate limited (Netlify rule, 5 per 60 s) | Error under the field; **Sign in** re-enabled | `errors.rateLimited` |
| Locked out (10 failures, 15 min) | Error under the field | `errors.loginLocked` |
| Offline | Error under the form | `errors.consoleOffline` |
| Success | Push to Agent list; focus moves to its `h1` | none |

Never say whether a user or password exists; there is only one password. Never show attempt counts.

Acceptance:
- LOG-1 the password field has a visible label and `autocomplete="current-password"`; the Show/Hide toggle has 44x44 px and updates its label.
- LOG-2 error text is next to the field, linked with `aria-describedby`, and announced once (`role="alert"` on the error element only).
- LOG-3 pressing Enter submits; double submit is blocked while submitting.
- LOG-4 the password is never placed in the URL, `localStorage` or logs; the field is cleared after a failure that is not a typo hint (Theo: clear on lockout, keep on wrong password so it can be fixed).
- LOG-5 a signed-in visitor going to `/console` lands on the Agent list, not the login.

## 3. Agent list

- `h1` `console.agentsTitle`, count `console.agentCount`, **Sign out** at top right.
- One card per agent from `agents.json`, in file order. A card is one link/button (whole card tappable, at least 44 px high):
  - **firstName** (headline, e.g. "Juno").
  - **Model**: a text pill from `console.models.*` ("Opus", "Sonnet"), shown as `console.modelLabel` for screen readers. Unknown or `inherit` shows `console.models.inherit`.
  - **Personality** (body text, up to 3 lines, then truncated with the full text in the chat header). If missing, use the agent's `description`.
  - Secondary caption: the agent id in a monospace style ("orchestrator"), so people can tell roles apart.
- Screen-reader name: `console.agentCardSr` ("Juno, Opus model. Calm, decisive project lead...").
- Do not show system prompts, tool lists or model IDs on the card.

| State | What the person sees | Copy |
|---|---|---|
| Loading | 4 skeleton cards | `status.loadingAgents` |
| Ready | Cards | none |
| Error | Message and **Try again** | `errors.agentsLoad` |
| Session expired | Back to login with the message above the form | `errors.sessionExpired` |

Acceptance:
- AGL-1 every card shows firstName, model text and personality; none relies on colour or an avatar alone.
- AGL-2 cards are keyboard focusable in order with a visible focus ring; Enter and Space open the chat.
- AGL-3 12 cards scroll without horizontal scroll at 320 px.
- AGL-4 **Sign out** ends the session, clears in-memory transcripts and CSRF token, and returns to login.

## 4. Chat

### 4.1 Layout

Header: back link "Agents", firstName, model pill, a caption row with the personality (collapsed to one line, tap to expand).
Transcript (scrolling), composer at the bottom: multi-line text field (label `console.composerLabel`) and **Send**.
Empty transcript shows `console.chatEmpty`.

Message bubbles: your messages right-aligned with the label "You" (visually hidden is fine, but present for screen readers);
agent messages left-aligned with the agent's firstName. Never colour alone: the speaker name is in text.

### 4.2 Streaming, Stop, completion

- On **Send**: your message appears at once, the composer clears, **Send** becomes **Stop**, the agent bubble gets `aria-busy="true"` and text streams in.
- **Stop** aborts the request (`AbortController`). The partial text is kept and followed by `status.stopped`. Focus returns to the composer.
- Do not announce tokens. When the stream ends, the status region says `status.replyDone`. While streaming, the transcript is not an `aria-live` region.
- Tool activity ("reading files") may show as a quiet one-line row in the transcript; it is plain text and not announced.
- Auto-scroll follows new text only while the person is already at the bottom; scrolling up stops it.

### 4.3 Paused (the 45 s budget in `docs/04` §5.1)

The server emits `{"type":"paused"}`. The UI shows a card under the last text:

```
Juno needs more time to finish.                 (status.paused)
Continue here, or run it as a background job    (status.pausedHelp)
(up to 15 minutes).
[ Continue ]   [ Run as background job ]
```

- **Continue** (primary) sends a new request with no new user message; the card is replaced by the continuing stream.
- **Run as background job** creates a job. The card becomes a job status row (`console.jobHeading`): Queued → "Working in the background…" → finished.
  The client polls every 2-3 s; the status region announces only changes of state, not every poll.
- A job never commits. When it creates a proposal, a proposal card (4.4) appears in the transcript.
- If the job needs more than 15 minutes: `status.jobPaused` with **Continue**. If it fails: `errors.jobFailed` with **Try again**.

### 4.4 Proposal card in the transcript

One card per proposal: monogram circle (first letter of the firstName, not the only cue), `console.proposalCardTitle`, the agent's
summary (2 lines then truncated), `console.diffStat` (e.g. "3 files · +42 −7"), and a status pill with icon and text from `console.pills.*`.
The whole card opens the Proposal sheet. Status pills: Needs review, Approving, Committed, Rejected, Not committed.

### 4.5 Chat states

| State | What the person sees | Copy |
|---|---|---|
| Empty | Prompt line | `console.chatEmpty` |
| Replying | Stop button, `aria-busy` bubble | `status.replying` |
| Finished | Status line | `status.replyDone` |
| Stopped | Partial text then a marker | `status.stopped` |
| Paused | Card with Continue and Run as background job | `status.paused`, `status.pausedHelp` |
| Connection dropped mid-stream | Message under the partial text with **Try again** (re-sends) | `errors.streamDropped` |
| Claude busy (overloaded) | Message with **Try again** | `errors.claudeBusy` |
| Refusal | Message from the agent's name | `errors.refusal` |
| Rate limited (agent-chat 20 per 60 s) | Message; **Send** disabled for 10 s then enabled | `errors.rateLimited` |
| Budget exhausted | Composer disabled with the message above it; history stays readable | `errors.budgetExhausted` or `errors.budgetExhaustedAt` when the server sends a reset time |
| Session expired | Sign-in sheet over the chat (see 7); the unsent text is kept | `errors.sessionExpired` |
| Offline | Message under the composer | `errors.consoleOffline` |

Acceptance:
- CHT-1 the visible name of each speaker is text; screen readers hear "You" or the agent's firstName before each message.
- CHT-2 streaming uses `aria-busy`; completion is announced once; tokens are never announced.
- CHT-3 **Stop** is reachable by keyboard, replaces **Send** in the same position, and keeps partial text.
- CHT-4 Paused shows exactly two actions, **Continue** and **Run as background job**, and neither commits anything.
- CHT-5 the composer keeps its text after any error; **Send** is disabled while empty or sending.
- CHT-6 model and agent text are rendered as text or sanitised Markdown; a message containing `<img onerror>` shows as literal text.
- CHT-7 long transcripts do not move focus on their own; "scroll to latest" is a button when the person has scrolled up (label: ask Wren to add it if needed).
- CHT-8 composer and **Send**/**Stop** targets are at least 44 px; the composer sits above the on-screen keyboard (`visualViewport` or `100dvh`).

## 5. Proposal sheet (with diff)

A single full-height sheet over the chat (HIG: one sheet at a time). Top-left **Cancel** closes it and leaves the proposal pending.

Content, top to bottom:
1. Title `console.sheetTitle` ("Change from Juno"), subtitle `console.sheetSubtitle` ("3 files · +42 −7 · Proposal p_8f2c") and the model pill.
2. Agent's summary as plain text.
3. `console.deployTarget` ("Publishes to production (main).") with a status pill.
4. Error or refusal banner when it applies (section 8).
5. **File list**: one row per file: path (monospace, wraps), action (`console.fileActions.*`: Added file / Changed file / Deleted file), `+n −n`. Each row is a button that opens that file's diff below it (accordion) or on a pushed view; use the accordion on tablets.
6. `console.viewedFiles` ("You've opened 1 of 3 files.") as information only; it never blocks Approve.
7. **Sticky footer**: primary **Approve & deploy**, then **Ask to revise** and **Reject**. On 320 px they stack, primary on top.

### 5.1 Diff view

- Unified diff per file with line numbers; long lines wrap by default; the switch `console.wrapLines` toggles horizontal scroll (the code block then gets `tabindex="0"` and an accessible name).
- Each changed line starts with a visible glyph: `+` or `−` (U+2212), plus visually hidden text "added" or "removed" before the code so screen readers do not depend on colour. Unchanged context lines have neither.
- Colour is a second cue only. Contrast for diff text 4.5:1 in both themes (Sable).
- Large changes: v1 has no special control. Theo may cap diff size on the server and show only the `+/−` stat for a very large file. (Open question O-1.)
- Keyboard: Tab reaches the file list, then the open diff. **Go to next file** and **Go to previous file** buttons sit above the diff. Escape closes the sheet only when no confirmation is open.
- Binary or non-text files are never in a proposal (server rule); if one appears, show the path with "This file can't be shown." (ask Wren for the string).

### 5.2 Actions

| Action | Behaviour |
|---|---|
| **Approve & deploy** | Opens the confirmation (section 6). Disabled while a refusal banner is showing or the status is not "Needs review". |
| **Ask to revise** | Closes the sheet, focuses the composer pre-filled with "About proposal {id}: " and the caret at the end. The proposal stays pending. |
| **Reject** | Sets the proposal to Rejected at once, shows `status.rejected`, closes the sheet. No dialog: nothing ships and the agent can propose again. |
| **Cancel** | Closes the sheet only. |

Acceptance:
- PRP-1 the sheet title, file count, `+/−` totals and proposal ID are visible without scrolling at 390x844.
- PRP-2 every changed line is exposed to screen readers as "added" or "removed" (not colour alone), and lines have numbers.
- PRP-3 every action in the footer is reachable by keyboard; **Approve & deploy** is the only primary (accent) button.
- PRP-4 the sticky footer never covers the last diff line (padding for the footer and the safe area).
- PRP-5 **Cancel** closes without side effects; focus returns to the proposal card that opened the sheet.
- PRP-6 **Ask to revise** pre-fills the composer and does not change the proposal's status.

## 6. Approve confirmation

This is the only modal alert in the product: the action is irreversible and affects production (HIG alerts: use alerts sparingly; D-002).

```
Deploy these changes?                                      (console.confirmTitle)
This commits 3 files to main and publishes the live site   (console.confirmMessage)
in about 1–2 minutes. You can restore the previous deploy
from Netlify.
From Juno · Proposal p_8f2c                                (console.confirmFrom)
[ Cancel ]   [ Approve & deploy ]
```

- Built as `role="alertdialog"` with `aria-labelledby` (title) and `aria-describedby` (message).
- Initial focus is on **Cancel** (the safe default). Tab cycles inside the dialog. Escape = Cancel.
- Tapping **Approve & deploy** disables both buttons at once and shows `status.approving` (blocks a double click; the server also guards with a conditional write).
- Never auto-fire approval after a re-login (section 7).

Acceptance:
- APR-1 the dialog names the number of files, the branch (`main`), the production effect, the 1–2 minute estimate and the rollback note.
- APR-2 initial focus is on **Cancel**; Escape cancels; focus returns to the **Approve & deploy** button after Cancel.
- APR-3 a second tap on **Approve & deploy** sends only one request.
- APR-4 the dialog appears only after an explicit tap; no keyboard shortcut approves.

## 7. After approval and session expiry

### 7.1 Post-approval status (inline in the sheet, replacing the footer)

| Step | What the person sees | Copy |
|---|---|---|
| Working | "Approving…" in a status region; pill "Approving" | `status.approving` |
| Committed | Pill "Committed". Text: "Committed a1b2c3d. Netlify is now building the site." and the line "If the build or tests fail, the live site stays on the previous deploy." Links **View commit** and **View previous deploy**. Focus moves to this status text. | `status.committed`, `status.committedHelp`, `buttons.viewCommit`, `buttons.viewPreviousDeploy` |
| Commit failed | Error text in the sheet with **Try again**; pill "Not committed" | `errors.commitFailed` |
| Already handled | Error text; the footer buttons are removed | `errors.alreadyHandled` with `{state}` = approved or rejected |

The wording avoids "deployed" because the deploy outcome is not known to the app (docs/04 §7.3: polling Netlify is optional).
The sheet gets a **Close** control (`labels.closeSr`) so people can leave.

### 7.2 Session expiry

- Sessions last about 12 hours (docs/04 §4). Accessibility 2.2.1: show `status.sessionWarning` ("Your session ends in 5 minutes.") with **Stay signed in** five minutes before expiry. This needs a server endpoint to refresh the cookie: Handoff to Theo. If it is not built in v1, the warning appears with only **Sign in** after expiry.
- On a 401 anywhere: a sign-in sheet over the current view, with `errors.sessionExpired` (or `errors.sessionExpiredApprove` when it came from an Approve attempt). Unsent composer text, the open proposal and scroll position are kept.
- After sign-in the user returns to where they were; Approve is **not** repeated automatically.

Acceptance:
- POST-1 after a commit the sheet shows the short SHA, **View commit** (opens GitHub in a new tab with `rel="noopener"`), and **View previous deploy**.
- POST-2 the success text never claims the site is live; it says Netlify is building.
- POST-3 a 401 on Approve shows the sign-in sheet and keeps the proposal open; nothing is committed until the user taps Approve again.
- SES-1 the expiry warning appears 5 minutes before expiry and can be dismissed or extended with a keyboard.

## 8. Error states (proposal and chat)

| Case | Trigger | Where it shows | Copy | Actions |
|---|---|---|---|---|
| Stale base | Approve returns 409 | Banner at the top of the sheet; Approve disabled; focus moves to the banner | `errors.staleBase` | **Ask to revise** (primary) |
| Path refused | Validation fails at propose or approve | Banner with a list of refused paths and reasons; Approve disabled | `errors.pathRefused`, then one `console.refusedItem` per path using `console.refusedReasons.*`, under `console.refusedHeading` | **Ask to revise** |
| Session expired | 401 | Sign-in sheet | `errors.sessionExpired` or `errors.sessionExpiredApprove` | **Sign in** |
| Rate limited | 429 from login or agent-chat | Next to the control that was used | `errors.rateLimited` | **Try again** after a short wait |
| Budget exhausted | Server refuses a new turn | Above a disabled composer | `errors.budgetExhausted` or `errors.budgetExhaustedAt` | none (reading and reviewing existing proposals still works) |
| Claude busy | `overloaded_error` mid-stream | Under the partial text | `errors.claudeBusy` | **Try again** |
| Connection dropped | Network error mid-stream | Under the partial text | `errors.streamDropped` | **Try again** |
| Commit failed | GitHub error after validation | In the sheet | `errors.commitFailed` | **Try again** |
| Proposal not found | 404 | In the sheet | `errors.proposalLoad` | **Try again** |

Error banners are text with an icon, inline, and use `role="alert"` once when they appear. Reasons for refused paths are in plain words and
never expose the policy source. `{path}` is shown as text in a monospace span.

Server-to-copy mapping that Theo should return (proposed, to align with the real API):

| Server result | Copy id |
|---|---|
| 401 | `errors.sessionExpired` / `errors.sessionExpiredApprove` |
| 409 `stale_base` | `errors.staleBase` |
| 422 or 400 `path_refused` with `paths: [{path, reason}]` | `errors.pathRefused` + `console.refusedReasons.<reason>` (`denied`, `outside`, `invalid`, `secret`) |
| 429 | `errors.rateLimited` (login lockout returns `locked` for `errors.loginLocked`) |
| 402/403 or `budget_exhausted` with optional `resetsAt` | `errors.budgetExhausted` / `errors.budgetExhaustedAt` |
| 409 `already_handled` with `state` | `errors.alreadyHandled` |

Acceptance for all errors: ERR-1 each error says what happened and what to do next in one or two short sentences; ERR-2 nothing says "invalid",
"illegal" or blames the person; ERR-3 no error text contains a token, key, stack trace or file contents; ERR-4 after any error the keyboard
focus lands on the error text or the control that can fix it.

## 9. Accessibility notes (console)

- One `h1` per view: "Agent Console", "Agents", the agent's firstName, and the sheet title inside the dialog.
- The proposal sheet is a `role="dialog"` with `aria-modal="true"`, focus trapped, Escape closes (unless the confirmation is open), focus returns to the opener.
- Live regions: one polite `role="status"` per view for sign-in, replying finished, job state changes and approval progress. Alerts (`role="alert"`) only for new errors.
- Targets 44x44 px; sticky footers respect `env(safe-area-inset-bottom)`; 200% text keeps the footer buttons visible by stacking them.
- Reduced motion: no animated sheet transitions and no typing shimmer; reduced transparency: solid sheet backgrounds.
- Axe and keyboard tests apply to Console login, Agent list, Chat and the Diff sheet in light and dark (skill `accessibility-testing`).

## 10. Open questions

- O-1 Large diffs: server cap and "show stat only" behaviour (Theo).
- O-2 A "scroll to latest" string, "This file can't be shown" string: Wren adds when Theo confirms the cases.
- O-3 The Netlify "previous deploy" URL needs the site name or id; unverified how Theo will get it without a Netlify API token (docs/04 §7.3).
- O-4 Session refresh endpoint for **Stay signed in** (Theo, with Rook's review).
