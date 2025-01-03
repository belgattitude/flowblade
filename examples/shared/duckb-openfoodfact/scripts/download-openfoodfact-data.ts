import * as console from 'node:console';
import fs from 'node:fs';

import { DownloaderHelper } from 'node-downloader-helper';
import prettyBytes from 'pretty-bytes';
import yoctoSpinner from 'yocto-spinner';

import { scriptsConfig } from './config/scripts.config';

const remoteParquet = scriptsConfig.openfoodfact.foodData.remote;
const localParquet = scriptsConfig.openfoodfact.foodData.local;
const downloadPath = scriptsConfig.openfoodfact.downloadPath;

console.log(`Will download openfoodfact data:`);
console.log(`- remoteParquetUrl: ${remoteParquet}`);
console.log(`- to: ${localParquet}`);

if (fs.existsSync(localParquet)) {
  console.log('File already exists');
} else {
  const spinner = yoctoSpinner({
    text: 'Downloading food.parquet',
  });

  spinner.start('Downloading food.parquet');
  const dl = new DownloaderHelper(remoteParquet, downloadPath, {
    fileName: localParquet.split('/').pop(),
    progressThrottle: 1500,
  });
  dl.on('progress', (stats) => {
    spinner.text = `Downloading (${prettyBytes(stats.total)}) at ${prettyBytes(stats.speed)}/s - ${Math.round(stats.progress)}%`;
  });
  dl.on('end', () => {
    spinner.success('Download completed');
  });
  dl.on('error', () => {
    // spinner.error('Download failed');
  });
  try {
    await dl.start();
  } catch (e) {
    spinner.error(`Download failed: ${(e as Error).message}`);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(-1);
  }
}

// eslint-disable-next-line unicorn/no-process-exit
process.exit(0);
