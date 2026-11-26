# GitHub REST: contents, trees, commits, refs (for the Approve commit)

Sources (read 2026-11-26):
- Repository contents: https://docs.github.com/en/rest/repos/contents
- Git trees: https://docs.github.com/en/rest/git/trees
- Git commits: https://docs.github.com/en/rest/git/commits
- Git references: https://docs.github.com/en/rest/git/refs
- OpenAPI description (exact schemas): https://github.com/github/rest-api-description

## Get repository content — `GET /repos/{owner}/{repo}/contents/{path}`
"Gets the contents of a file or directory." Media type `application/vnd.github.raw+json` returns raw content.
Size: ≤ 1 MB all features; 1–100 MB only `raw`/`object` media types; > 100 MB unsupported. Responses 200, 302, 304, 403, 404.
Fine-grained permission: Contents (read).

## Create or update file contents — `PUT /repos/{owner}/{repo}/contents/{path}`
Body: `message` (required), `content` (required, **Base64**), `sha` ("**Required if you are updating a file**. The blob SHA
of the file being replaced"), `branch`, `committer`, `author`. Responses 200, 201, 404, 409, 422.
Note (quoted): "If you use this endpoint and the 'Delete a file' endpoint in parallel, the concurrent requests will
conflict and you will receive errors. You must use these endpoints serially instead." One file per commit, so Hazy uses the
Git Data API for multi-file proposals.

## Create a tree — `POST /repos/{owner}/{repo}/git/trees`
- `tree` (required): entries `{ path, mode, type, sha | content }`. `mode` ∈ `100644` file, `100755` executable, `040000`
  subdirectory, `160000` submodule, `120000` symlink. `type` ∈ `blob`, `tree`, `commit`.
- `sha`: "If the value is `null` then the file will be deleted." "Use either `tree.sha` or `content`."
- `content`: "GitHub will write this blob out and use that SHA for this entry."
- `base_tree`: build on an existing tree (otherwise files not listed are dropped).
- "If you use this endpoint to add, delete, or modify the file contents in a tree, you will need to commit the tree and then
  update a branch to point to the commit." Responses 201, 403, 404, 409, 422.

## Create a commit — `POST /repos/{owner}/{repo}/git/commits`
Body: `message` (required), `tree` (required, tree SHA), `parents` (array of SHAs), `author`, `committer`, `signature`.
Responses 201, 404, 409, 422. Response includes `verification` (signature status).

## Get / update a reference
- `GET /repos/{owner}/{repo}/git/ref/heads/main`: Contents (read); 200/404/409; body `{ ref, node_id, url, object: { type, sha, url } }`.
- `PATCH /repos/{owner}/{repo}/git/refs/heads/main` `{ sha, force }`: "`force` … Leaving this out or setting it to
  `false` will make sure you're not overwriting work. Default: `false`." Contents (write), **plus Workflows (write)** when
  the change touches workflow files. Responses 200, 409, **422 "Validation failed"** (e.g. not a fast-forward).

## Compare — `GET /repos/{owner}/{repo}/compare/{base}...{head}`
Lists the commits and files changed between two commits. Hazy uses it for the stale-base check.

## Sequence Hazy uses (D-002: straight to main)
ref → (compare if moved) → commit → tree(base_tree) → commit(parents=[head]) → PATCH ref (force:false).
