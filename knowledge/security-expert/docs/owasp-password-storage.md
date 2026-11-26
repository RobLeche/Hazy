# Password storage (console password)

Source: OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
(text from https://github.com/OWASP/CheatSheetSeries, read 2026-11-26)

## Recommendations (quoted)
- "Use Argon2id with a minimum configuration of 19 MiB of memory, an iteration count of 2, and 1 degree of parallelism."
- "If Argon2id is not available, use scrypt with a minimum CPU/memory cost parameter of (2^17), a minimum block size of 8
  (1024 bytes), and a parallelization parameter of 1."
- Equivalent scrypt settings listed: N=2^17 r=8 p=1 (128 MiB); N=2^16 r=8 p=2 (64 MiB); N=2^15 r=8 p=3 (32 MiB);
  N=2^14 r=8 p=5 (16 MiB); N=2^13 r=8 p=10 (8 MiB).

## Hazy decision
Node's built-in `crypto.scrypt` (no dependency; argon2 needs a native package). Use **N=2^17, r=8, p=1** and pass
`maxmem` above 128 MiB (Node's default `maxmem` is 32 MiB, so N=2^17 would throw without it). Functions have 1,024 MB memory by
default, which is plenty. Store `scrypt$N$r$p$saltB64$hashB64` in `CONSOLE_PASSWORD_HASH`; compare with
`crypto.timingSafeEqual`. See `../examples/password-hash.ts`.
