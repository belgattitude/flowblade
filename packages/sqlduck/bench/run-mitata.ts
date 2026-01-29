import path from 'node:path';

import { glob } from 'glob';

const executeFile = async (file: string) => {
  const absolutePath = path.resolve(file);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return await import(absolutePath).then((module) => module);
};

try {
  const files = await glob('**/*.bench.mitata.ts');

  for (const file of files) {
    console.log(`# Executing ${file}`);
    await executeFile(file);
  }
} catch (e) {
  console.error(e);
}
