export type LogType = 'info' | 'success' | 'error';

export interface ILogger {
  log: (type: LogType, msg: string) => void;
  withName: (name: string) => ILogger;
}
