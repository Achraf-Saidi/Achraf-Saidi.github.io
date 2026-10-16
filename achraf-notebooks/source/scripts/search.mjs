// Starlight invokes Pagefind itself after static generation.
import fs from 'node:fs';
if(!fs.existsSync('dist/pagefind/pagefind.js'))throw new Error('Pagefind index was not generated');
