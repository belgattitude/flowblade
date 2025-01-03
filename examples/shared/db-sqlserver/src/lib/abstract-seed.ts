import type { PrismaClient } from '../generated/client';
import { CliLogger } from './logger/cli-logger';
import type { ILogger } from './logger/logger.interface';

type Params = {
  prisma: PrismaClient;
  logger?: ILogger;
};

type Stats = {
  totalAffected: number;
};

export abstract class AbstractSeed {
  public readonly prisma: PrismaClient;
  public readonly logger: ILogger;
  protected statsCollector: [name: string, stats: Stats][] = [];
  constructor(params: Params) {
    this.prisma = params.prisma;
    this.logger = params.logger ?? new CliLogger(`${this.constructor.name}`);
  }

  abstract execute(): Promise<void>;

  protected collectStats = (entityName: string, stats: Stats): void => {
    this.statsCollector.push([entityName, stats]);
  };

  public getStats = (): [name: string, stats: Stats][] => {
    return this.statsCollector;
  };

  protected log = (operation: 'UPSERT' | 'CREATE' | 'UPDATE', msg: string) => {
    this.logger.log('info', `${operation}: ${msg}`);
  };
}
