import fs from "node:fs";
import * as readline from "node:readline";

export const parseJsonl = async <T>(file: string): Promise<T[]> => {
  const rl = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  });

  const jsonArray: T[] = [];
  try {
    for await (const line of rl) {
      jsonArray.push(JSON.parse(line) as T);
    }
  } catch (error) {
    throw new Error(`Error reading json file: ${file}: ${String(error)}`, {
      cause: error,
    });
  }
  return jsonArray;
};
