---
"@examples/nextjs-app": patch
---

Fix react-query GC timers retaining finished SSR requests in the nextjs-app example.

- `gcTime` is now `Infinity` on the server (a finite value starts one `setTimeout` per query during SSR, which keeps the request alive through AsyncLocalStorage until it fires).
- Add a server-only `ServerQueryCache` forcing `gcTime: Infinity`, including for per-hook overrides.
- `ReactQueryClientProvider` uses `getQueryClient()`: a new client per request on the server, a singleton in the browser (no more `useState`, which React may discard when suspending on initial mount).
- Dehydrate pending queries so server prefetches can stream to the client.

Also fix `getNextjsHostInfo` resolving to `https://undefined` outside Vercel: unset Vercel env vars are now detected, so the `BASE_URL` / localhost fallback is reachable.

Also enable `test-e2e` in the example: a vitest smoke suite that starts `next start` and requests the main pages (turbo builds first).

See https://rohitpotato.xyz/thoughts/ssr-requests-still-alive
