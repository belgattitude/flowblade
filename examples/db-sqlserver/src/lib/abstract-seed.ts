import type { PrismaClient } from '../generated/client';
import { CliLogger } from './logger/cli-logger';
import type { ILogger } from './logger/logger.interface';

type Params = {
  prisma: PrismaClient;
  logger?: ILogger;
};

export abstract class AbstractSeed {
  public readonly prisma: PrismaClient;
  public readonly logger: ILogger;
  constructor(params: Params) {
    this.prisma = params.prisma;
    this.logger = params.logger ?? new CliLogger(`${this.constructor.name}`);
  }

  abstract execute(): Promise<void>;

  protected log = (operation: 'UPSERT' | 'CREATE' | 'UPDATE', msg: string) => {
    this.logger.log('info', `${operation}: ${msg}`);
  };
}
