// https://medium.com/%40mbmrajatit/%EF%B8%8F-how-a-missing-debug-file-in-pdf-parse-crashed-my-node-js-app-and-how-i-fixed-it-be5ba7077527

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export default require('pdf-parse');
