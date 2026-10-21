import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

test('static build includes exact source assets with project-relative URLs', () => {
  execFileSync(process.execPath, ['scripts/build.mjs']);
  for (const name of ['index.html', 'app.js', 'content.js', 'engine.js', 'storage.js', 'style.css']) {
    assert.deepEqual(readFileSync(`dist/${name}`), readFileSync(`public/${name}`));
  }
  assert.equal(existsSync('dist/.nojekyll'), true);
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /src="\.\/app.js"/); assert.match(html, /href="\.\/style.css"/);
});
