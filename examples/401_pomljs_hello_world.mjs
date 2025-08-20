/**
 * Minimal POML.js sanity check.
 * Parses a simple <p> tag and verifies the output.
 */
import { poml } from 'poml';

const output = poml('<p>hello world</p>');
if (!String(output).includes('hello world')) {
  throw new Error(`Unexpected output: ${output}`);
}
console.log(output);
