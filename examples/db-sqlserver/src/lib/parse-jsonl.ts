import fs from 'node:fs';
import * as readline from 'node:readline';

export const parseJsonl = async <T>(file: string): Promise<T[]> => {
  const rl = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  });

  return new Promise((resolve, reject) => {
    const jsonArray: T[] = [];
    rl.on('line', (line) => {
      jsonArray.push(JSON.parse(line) as T);
    });
    rl.on('error', (err) => {
      const error = new Error(`Error reading json file: ${file}: ${err}`);
      reject(error);
    });
    rl.on('close', () => {
      resolve(jsonArray);
    });
  });
};
