# Knowledge: security-expert

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`github-fine-grained-pat.md`](docs/github-fine-grained-pat.md): GitHub fine-grained personal access token (D-004). Sources: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens, https://docs.github.com/en/rest/git/refs, https://docs.github.com/en/rest/repos/contents
- [`owasp-llm-prompt-injection.md`](docs/owasp-llm-prompt-injection.md): Prompt injection and agent safety. Sources: https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
- [`owasp-password-storage.md`](docs/owasp-password-storage.md): Password storage (console password). Sources: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html, https://github.com/OWASP/CheatSheetSeries
- [`owasp-session-and-csrf.md`](docs/owasp-session-and-csrf.md): Sessions and CSRF. Sources: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html, https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- [`owasp-xss-csp-headers.md`](docs/owasp-xss-csp-headers.md): XSS-safe rendering, CSP and security headers. Sources: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html, https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html, https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP

## examples/
- [`password-hash.ts`](examples/password-hash.ts): Example 1 — scrypt password hashing with OWASP's minimum parameters (N=2^17, r=8, p=1), timing-safe verify. (tested by `password-hash.test.ts`)
- [`path-policy.ts`](examples/path-policy.ts): Example 3 — The Agent Console path policy (allow/deny, traversal, limits, secret scan). (tested by `path-policy.test.ts`)
- [`session-csrf.ts`](examples/session-csrf.ts): Example 2 — HMAC-signed session cookie (HttpOnly; Secure; SameSite=Strict) + CSRF check for state-changing requests. (tested by `session-csrf.test.ts`)

## Verification
Run: `cd knowledge/security-expert/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **12 passed, 0 failed, 0 skipped.**
