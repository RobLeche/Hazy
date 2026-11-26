# Tool use: definitions, loop and result rules

Sources (read 2026-11-26):
- Overview: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- Implement tool use: https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use
- Handle tool calls: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls

## Definition
`{ name, description, input_schema }` (JSON Schema). Optional `strict: true` ("ensure Claude's tool calls always match
your schema exactly"), `cache_control`, `input_examples` (each "must be valid according to the tool's `input_schema`").

## Client vs server tools (overview)
Client tools "run in your application. Claude responds with `stop_reason: \"tool_use\"` and one or more `tool_use`
blocks. Your code runs the operation and sends back a `tool_result`." Server tools (web_search, code_execution…) run
on Anthropic's side.

## tool_result rules (handle-tool-calls, quoted)
- "Tool result blocks must immediately follow their corresponding tool use blocks in the message history. You cannot
  include any messages between the assistant's tool use message and the user's tool result message."
- "In the user message containing tool results, the `tool_result` blocks must come FIRST in the content array. Any text
  must come AFTER all tool results."
- `is_error` (optional): "Set to `true` if the tool failed or the call was invalid." "Claude might then call the tool
  again with a new `tool_use` block, so limit how many retries your loop allows."

Shape:
```json
{ "role": "user", "content": [
  { "type": "tool_result", "tool_use_id": "toolu_01…", "content": "…result text…" },
  { "type": "tool_result", "tool_use_id": "toolu_02…", "content": "path not allowed: netlify.toml", "is_error": true }
] }
```

## tool_choice
`auto`, `none`, `any`, `tool`. **`any` and `tool` return a 400 on Fable 5.2, Opus 5.5 and Sonnet 5.5** (implement doc
restriction table). Parallel tool use is on by default; `disable_parallel_tool_use: true` limits it to one call per turn.

## Hazy tools
`list_files`, `read_file` (read-only, deny-list hidden), `propose_change` (stores a proposal; never commits).
All `strict: true`; validate inputs again server-side anyway (path policy).
