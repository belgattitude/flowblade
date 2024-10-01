import { writeFileSync } from 'node:fs';

import openapiTS, { astToString } from 'openapi-typescript';
import * as prettier from 'prettier';
import pc from 'tinyrainbow';

export const catFactSchema = 'https://catfact.ninja/docs/api-docs.json';
export const generatedFile = './src/generated/openapi/openapi-catfact.types.ts';

const generateOpenApi = async (source: string, output: string) => {
  console.info(`${pc.blue('Info')} Parsing OPENAPI ${source}`);

  try {
    if (!source) {
      throw new TypeError('Invalid or missing source (env: OPENAPI_SOURCE)');
    }
    const pathOrUrl = /^https?:\/\//.test(source)
      ? new URL(source)
      : new URL(source, import.meta.url);

    const parsed = await openapiTS(pathOrUrl, {
      pathParamsAsTypes: false,
    });
    const content = astToString(parsed);

    try {
      const prettyfied = await prettier.format(content, {
        parser: 'typescript',
      });
      writeFileSync(output, prettyfied, { encoding: 'utf8' });
    } catch (e) {
      console.error(
        `${pc.red('Error')} ${(e as Error)?.message ?? 'An unknown error'}`
      );
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
    console.info(`${pc.green('Success')} Updated ${output}`);
  } catch (e) {
    throw new Error(
      `Can't write or process output file, ${(e as Error)?.message ?? 'An unknown error'}`
    );
  }
};

await generateOpenApi(catFactSchema, generatedFile);
