// Allow to use modern es in tests while running older node version
// (ie 20 missing Array.fromAsync)
// eslint-disable-next-line unicorn/no-unnecessary-polyfills
import 'core-js/actual';
