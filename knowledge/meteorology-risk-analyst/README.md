# Knowledge: meteorology-risk-analyst

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`instability-indices.md`](docs/instability-indices.md): Thunderstorm ingredients and instability indices. Sources: https://www.weather.gov/lmk/indices, https://www.weather.gov/source/zhu/ZHU_Training_Page/thunderstorm_stuff/Thunderstorms/thunderstorms.htm, https://www.weather.gov/ilx/swop-severetopics-cape
- [`nws-risk-scales.md`](docs/nws-risk-scales.md): Official NWS risk scales Hazy's labels borrow from
- [`open-meteo-variables-for-scoring.md`](docs/open-meteo-variables-for-scoring.md): Open-Meteo variable definitions that change how we score. Sources: https://open-meteo.com/en/docs
- [`safety-messaging.md`](docs/safety-messaging.md): Official safety messaging Hazy may quote. Sources: https://www.weather.gov/safety/flood-turn-around-dont-drown

## examples/
- [`nws-override-and-wording.ts`](examples/nws-override-and-wording.ts): Example 2 — NWS alert override + honest headline wording. (tested by `nws-override-and-wording.test.ts`)
- [`scoring.ts`](examples/scoring.ts): Example 1 — Pure, explainable daily thunderstorm + flood scores (the shape src/lib/scoring.ts must keep). (tested by `scoring.test.ts`)
- [`fixtures/`](examples/fixtures/): supporting files (fixtures or demo site)

## Verification
Run: `cd knowledge/meteorology-risk-analyst/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **9 passed, 0 failed, 0 skipped.**
