---
"@examples/nextjs-app": patch
---

Fix react-query GC timers retaining finished SSR requests in the nextjs-app example.

- `gcTime` is now `Infinity` on the server (a finite value starts one `setTimeout` per query during SSR, which keeps the request alive through AsyncLocalStorage until it fires).
- Add a server-only `ServerQueryCache` forcing `gcTime: Infinity`, including for per-hook overrides.
- `ReactQueryClientProvider` uses `getQueryClient()`: a new client per request on the server, a singleton in the browser (no more `useState`, which React may discard when suspending on initial mount).
- Dehydrate pending queries so server prefetches can stream to the client.

See https://rohitpotato.xyz/thoughts/ssr-requests-still-alive
