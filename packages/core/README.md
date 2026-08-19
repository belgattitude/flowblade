# @flowblade/core

Internal contracts and utilities for flowblade adapters. You generally don't have to install this package separately.

## Install

```bash
yarn add @flowblade/core
```

## Usage

### QResult

This is specialized Result object for database interactions

### Create a success QResult

```typescript
const successResult = new QResult({
  data: [{ name: "Seb" }],
  meta: new QMeta({
    spans: {
      type: "sql",
      timeMs: 13,
      sql: "SELECT name FROM users",
      affectedRows: 1,
      params: [],
    },
  }),
});

// 👇 You can dereference, data, meta and error
const { data, meta, error } = result;
if (data) {
  // typed in this case to { name: string}[]
  console.log(data); // [{ name: 'Seb' }]
}

if (error) {
  // typed in this case to QError
  console.error(error); // QError object
}
```

#### Create a failure QResult

```typescript
const failureResult = new QResult<SuccessPayload, QError>({
  error: {
    message: "Error message",
  },
});

failureResult.isError(); // 👈 true
failureResult.error; // 👈 QError
failureResult.data; // 👈 undefined
```

#### Helpers

```typescript
result.map((row) => {
  return { ...row, name: row.name.toUpperCase() };
});

result.getOrThrow(); // 👈 throw Error('Error message')
// 👇 Customize the error and throws
result.getOrThrow((qErr) => {
  return new HttpServiceUnavailable({
    cause: new Error(qErr.message),
  });
});
```

## Bundle size

Bundle size is tracked by a [size-limit configuration](https://github.com/belgattitude/flowblade/blob/main/packages/core/.size-limit.ts)

| Scenario (esm)                             | Size (compressed) |
| ------------------------------------------ | ----------------: |
| `import * from '@flowblade/core`           |          ~ 2.04kB |
| `import { QResult } from '@flowblade/core` |          ~ 1.63kB |

## Compatibility

| Level | CI | Description |
| --- | --- | --- |
| Node | ✅ | CI for v20.x -> v25.x. |
| Browser | ✅ | Tested with latest chrome (vitest/playwright) |
| Browserslist | ✅ | [> 95%](https://browserslist.dev/?q=ZGVmYXVsdHMsIGNocm9tZSA%2BPSA5NiwgZmlyZWZveCA%2BPSAxMDUsIGVkZ2UgPj0gMTEzLCBzYWZhcmkgPj0gMTUsIGlvcyA%2BPSAxNSwgb3BlcmEgPj0gMTAzLCBub3QgZGVhZA%3D%3D) on 01/2025. [Chrome 96+, Firefox 90+, Edge 19+, ios 15+, Safari 15+ and Opera 77+](https://github.com/belgattitude/flowblade/blob/main/packages/core/.browserslistrc) |
| Edge | ✅ | Ensured on CI with [@vercel/edge-runtime](https://github.com/vercel/edge-runtime). |
| Cloudflare | ✅ | Ensured with @cloudflare/vitest-pool-workers (see [wrangler.toml](https://github.com/belgattitude/flowblade/blob/main/devtools/vitest/wrangler.toml) |
| Typescript | ✅ | TS 5.0 + / [are-the-type-wrong](https://github.com/arethetypeswrong/arethetypeswrong.github.io) checks on CI. |
| ES2022 | ✅ | Dist files checked with [es-check](https://github.com/yowainwright/es-check) |
| Performance | ✅ | Monitored with [codspeed.io](https://codspeed.io/belgattitude/flowblade) |

## Contributors

Contributions are welcome. Have a look to the [CONTRIBUTING](https://github.com/belgattitude/flowblade/blob/main/CONTRIBUTING.md) document.

## Sponsors

[Sponsor](<[sponsorship](https://github.com/sponsors/belgattitude)>), [coffee](<(https://ko-fi.com/belgattitude)>), or star – All is spent for quality time with loved ones. Thanks ! 🙏❤️

### Special thanks to

<table>
  <tr>
    <td>
      <a href="https://www.jetbrains.com/?ref=belgattitude" target="_blank">
         <img width="65" src="https://asset.brandfetch.io/idarKiKkI-/id53SttZhi.jpeg" alt="Jetbrains logo" />
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://www.jetbrains.com/?ref=belgattitude" target="_blank">JetBrains</a>
    </td>
   </tr>
</table>

## License

MIT © [Sébastien Vanvelthem](https://github.com/belgattitude) and contributors.
