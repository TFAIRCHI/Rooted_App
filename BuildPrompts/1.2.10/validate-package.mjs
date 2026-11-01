import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from '../../research/tools/node_modules/marked/lib/marked.esm.js';
import GithubSlugger from '../../research/tools/node_modules/github-slugger/index.js';

const directory = dirname(fileURLToPath(import.meta.url));
const errors = [];
let linksChecked = 0;
const filenames = (await readdir(directory)).filter(name => extname(name) === '.md');
for (const filename of filenames) {
  const source = await readFile(join(directory, filename), 'utf8');
  const links = [];
  marked.walkTokens(marked.lexer(source), token => {
    if (token.type === 'link' || token.type === 'image') links.push(token.href);
  });
  for (const href of links) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
    linksChecked++;
    const [pathname, fragment] = href.split('#');
    const target = pathname ? resolve(directory, decodeURIComponent(pathname)) : join(directory, filename);
    try {
      await access(target);
      if (fragment && extname(target) === '.md') {
        const slugger = new GithubSlugger();
        const anchors = new Set();
        const targetSource = await readFile(target, 'utf8');
        marked.walkTokens(marked.lexer(targetSource), token => {
          if (token.type === 'heading') anchors.add(slugger.slug(token.text.replace(/<[^>]*>/g, '')));
        });
        if (!anchors.has(fragment)) throw new Error(`Missing anchor ${fragment}`);
      }
    } catch (error) {
      errors.push({ file: filename, href, error: error.message });
    }
  }
}
const result = { generatedAt: new Date().toISOString(), scope: 'build-prompt-documents', passed: errors.length === 0, documents: filenames.length, linksChecked, errors };
await writeFile(join(directory, 'package-validation.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
if (errors.length) process.exitCode = 1;
