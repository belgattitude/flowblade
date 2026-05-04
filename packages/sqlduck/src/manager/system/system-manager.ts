import * as os from 'node:os';

export type SystemInfo = {
  freeMemory: number;
  totalMemory: number;
  availableParallelism: number;
};

export class SystemManager {
  readonly className = 'SystemManager';

  /**
   * Return basic system information such as memory and available parallelism.
   */
  getInfo = (): SystemInfo => {
    return {
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      availableParallelism: os.availableParallelism(),
    };
  };
}
