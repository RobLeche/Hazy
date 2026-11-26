# GitHub fine-grained personal access token (D-004)

Sources (read 2026-11-26):
- Managing your personal access tokens: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- REST endpoint permissions: https://docs.github.com/en/rest/git/refs , https://docs.github.com/en/rest/repos/contents

## Facts (quoted)
- "Treat your access tokens like passwords."
- Repository access: "choose the minimal repository access that meets your needs. Tokens always include read-only access to
  all public repositories on GitHub." Choose **Only select repositories** → this repo.
- Expiration: "Infinite lifetimes are allowed but may be blocked by a maximum lifetime policy"; API pre-fill parameter
  `expires_in`: "Integer between 1 and 366, or `none` … If not provided, the default is 30 days".
- Org-owned repos may require approval; until then the token is `pending` and "will only be able to read public resources".
- Limitations listed for fine-grained tokens include: contributing to public repos where the user is not a member, outside
  collaborators, multiple organizations at once, Packages, the Checks API, user-owned Projects.

## Permissions Hazy needs
| Endpoint | Permission |
|---|---|
| GET contents, GET ref, GET commit, compare | Contents: read |
| POST git/trees, POST git/commits | Contents: write |
| PATCH git/refs | Contents: write (**plus Workflows: write if workflow files change**, which we deliberately don't grant) |
Grant **Contents: Read and write** only (Metadata read is automatic). Expiry 90 days; rotate via env var update + redeploy + revoke.
