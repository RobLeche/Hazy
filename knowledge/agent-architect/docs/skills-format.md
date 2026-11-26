# Claude Code skills (SKILL.md)

Source: https://code.claude.com/docs/en/skills (read 2026-11-26)

## Layout (docs)
```
my-skill/
├── SKILL.md (required - overview and navigation)
├── reference.md (detailed API docs - loaded when needed)
├── examples.md (usage examples - loaded when needed)
└── scripts/helper.py (utility script - executed, not loaded)
```
"Keep `SKILL.md` under 500 lines. Move detailed reference material to separate files."

## Frontmatter (docs table)
`name` (defaults to the directory name), `description` ("What the skill does and when to use it … Put the key use case first: the
combined `description` and `when_to_use` text is truncated at **1,536 characters**"), `when_to_use`, `argument-hint`, `arguments`,
`disable-model-invocation` (also "prevents the skill from being preloaded into subagents"), `user-invocable`, `allowed-tools`,
`disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `background`, `hooks`, `paths`, `shell`, `metadata` ("Free-form YAML
map for your own key-value data"), `license`, `compatibility`.

## Hazy conventions
- `metadata: { owner, shared_with }` mirrors the roster matrix.
- Never set `disable-model-invocation: true` on a preloaded skill.
- Names: lowercase-hyphen, equal to the directory name.
