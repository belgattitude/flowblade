import { execaCommandSync } from 'execa';

export const execPrismaCliOrThrow = (params: {
  cmd: string;
  errorMsg: string;
  env?: Partial<Record<string, string>>;
}) => {
  const { env, errorMsg, cmd } = params;
  const result = execaCommandSync(cmd, {
    shell: true,
    reject: false,
    encoding: 'utf8',
    env: {
      ...env,
    },
  });
  if (result.exitCode !== 0) {
    throw new Error(`${errorMsg} (${result.command})\n${result.stderr}`);
  }
  return result;
};
