# Hazy UX spec (v1)

Owner: Wren (`ux-designer-apple-hig`). Built from `knowledge/ux-designer-apple-hig/` (Apple HIG notes and tested examples).

| File | For | What it holds |
|---|---|---|
| [app-flows.md](app-flows.md) | Pip, Petra | Tabs, Outlook, Places, Settings, install hints, every state, acceptance criteria (OUT, INS, PLC, SET), accessibility notes |
| [console-flows.md](console-flows.md) | Theo, Petra, Rook | Login, agent list, chat, proposal sheet and diff, Approve confirmation, post-approval, errors, acceptance criteria (LOG, AGL, CHT, PRP, APR, POST, SES, ERR) |
| [copy-deck.json](copy-deck.json) | Pip, Theo | Every user-facing string by key. Import it; do not invent strings. |
| [copy-deck.test.ts](copy-deck.test.ts) | Petra | Lints the deck with `knowledge/ux-designer-apple-hig/examples/copy-lint.ts`. Run `node --test docs/design/ux/copy-deck.test.ts` (Node 22.18 or later). |

## Rules that apply everywhere
- One primary action per screen. Buttons start with a verb, sentence case.
- No modal alerts for information. The only modal is the console's "Deploy these changes?" confirmation.
- Risk is always icon + text + colour. Headlines name the hazard first and never show a percentage.
- Every screen has designed first-run, loading, offline, error and empty states.
- Footer on risk screens: "Hazy is not a warning service. For official alerts, see weather.gov." plus the Open-Meteo credit.
- Targets 44x44 px; 320 px reflow; 200% text; reduced motion and reduced transparency honoured.

## Changing the deck
Ask Wren. New strings go in the deck, pass the test, and are cited in the flow file. Risk wording changes are reviewed by Skye.
