import { writeFileSync } from 'node:fs';

import openapiTS, { astToString } from 'openapi-typescript';
import * as prettier from 'prettier';
import pc from 'tinyrainbow';

export const generateOpenApiTypes = async (source: string, output: string) => {
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
      const options = await prettier.resolveConfig('.');
      const prettyfied = await prettier.format(content, {
        parser: 'typescript',
        ...options,
      });
      writeFileSync(output, prettyfied, { encoding: 'utf8' });
    } catch (e) {
      console.error(
        `${pc.red('Error')} ${(e as Error)?.message ?? 'Unknown error'}`
      );
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
    console.info(`${pc.green('Success')} Updated ${output}`);
  } catch (e) {
    throw new Error(
      `Can't write to '${output}' file, ${(e as Error)?.message ?? 'Unknown error'}`
    );
  }
};
