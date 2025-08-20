# @examples/base-auth

### Usage

Add the workspace dependency to the consuming app or package.

```bash
yarn add @examples/base-auth:"workspace:^"
```

<details>
<summary>Enable tsconfig aliases</summary>

If you want to consume the package without intermediary build step (no yarn build,
no yarn watch...), you can add a tsconfig path alias in the consumer app/package .

```json5
{
  //"extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@examples/base-auth": ["../../../packages/base-auth/src/index"],
    },
  },
}
```

</details>

## Database migrations

```
npx @better-auth/cli generate
```
