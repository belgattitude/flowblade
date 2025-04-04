import fs from 'node:fs';

import { execa } from 'execa';

const csvUrl =
  'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz';

const outputPath = './data/openfoodfacts.csv.gz';
const outputUnzippedPath = './data/openfoodfacts.csv';

if (!fs.existsSync(outputPath)) {
  console.log('Downloading OpenFoodFacts CSV file...');
  await execa({
    stdout: ['pipe', 'inherit'],
    stderr: ['pipe', 'inherit'],
  })`wget ${csvUrl} -O ${outputPath}`;
}

if (!fs.existsSync(outputUnzippedPath)) {
  console.log('Unzipping OpenFoodFacts CSV file...');
  await execa('gunzip', ['-c', outputPath, '>', outputUnzippedPath], {
    shell: true,
    stdout: 'inherit',
    stderr: 'inherit',
  });
}
