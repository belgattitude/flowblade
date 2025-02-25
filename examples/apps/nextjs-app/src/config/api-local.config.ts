const port = process === undefined ? 3000 : (process.env.PORT ?? 3000);
const url = `http://localhost:${port}`;

export const apiLocalConfig = {
  apiUrl: `${url}/api`,
  schemaUrl: `${url}/api/doc`,
} as const;
