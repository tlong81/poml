// https://medium.com/%40mbmrajatit/%EF%B8%8F-how-a-missing-debug-file-in-pdf-parse-crashed-my-node-js-app-and-how-i-fixed-it-be5ba7077527

import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);
// Cast so TypeScript keeps the correct types
const pdfParse = nodeRequire('pdf-parse') as typeof import('pdf-parse');

export default pdfParse;
