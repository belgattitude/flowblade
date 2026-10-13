---
"@flowblade/source-kysely": patch
---

Use logtape placeholders in all log messages, the rendered messages are unchanged except the stream success one.

- Error messages are passed as an `errorMessage` property (`Query "{queryName}" failed: {errorMessage}`), a driver message containing `{...}` is no longer read as a placeholder.
- `stream()` messages use `{queryName}`, the success message now reports the streamed rows: `Streaming query "{queryName}" executed in {timeMs}ms, streamed {affectedRows} row(s)`.
