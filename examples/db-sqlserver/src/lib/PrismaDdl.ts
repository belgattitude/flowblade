import { readFileSync, writeFileSync } from 'node:fs';

import { execaCommandSync } from 'execa';

import { fixSqlServerNullUniqueIndexes } from './hacks/fix-sql-server-null-unique-indexes';
import type { ILogger } from './logger/logger.interface';

export class PrismaDdl {
  constructor(public readonly logger: ILogger) {}

  getDdl = (): string => {
    this.execPrismaCliOrThrow(
      'yarn prisma format',
      'Formatting prisma schema failed'
    );
    const { stdout } = this.execPrismaCliOrThrow(
      'yarn prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
      `Cannot generate initial migration ddl from schema.prisma`
    );

    const creationDdls = stdout
      .replaceAll(/^-- .*/gm, '')
      .split(/;/)
      .map((line) => {
        const sanitized = line.trim();
        return sanitized === '' ? null : sanitized;
      })
      .filter((v) => {
        return v?.toUpperCase().match(/^(ALTER|CREATE) /);
      })
      .filter((v) => v !== null);

    const hackedDdls = fixSqlServerNullUniqueIndexes(creationDdls);

    return hackedDdls.join('\nGO\n');
  };

  /**
   *
   * @throws Error
   */
  createDdlFile = (outputFile = 'prisma/schema.prisma') => {
    const log = this.logger.log;
    log('info', 'Running create ddl...');

    const createTablesStr = this.getDdl();

    let currentContent: string;
    try {
      currentContent = readFileSync(outputFile, {
        encoding: 'utf8',
        flag: 'r',
      });
    } catch {
      log('info', 'Skipping writing ddl to file');
      currentContent = '';
    }

    if (currentContent.trim() === createTablesStr.trim()) {
      log('info', 'No changes detected in the sqlproj generated ddl.');
    } else {
      try {
        writeFileSync(outputFile, createTablesStr, {
          encoding: 'utf8',
        });
      } catch {
        throw new Error(`Can't write the generated ddl to "${outputFile}"`);
      }
      log('success', `Written ddl in ${outputFile} !`);
    }
  };

  execPrismaCliOrThrow = (cmd: string, errorMsg: string) => {
    const result = execaCommandSync(cmd, {
      shell: true,
      reject: false,
      encoding: 'utf8',
    });
    if (result.exitCode !== 0) {
      throw new Error(`${errorMsg} (${result.command})\n${result.stderr}`);
    }
    return result;
  };
}
