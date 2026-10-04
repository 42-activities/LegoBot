import { readFile, writeFile } from 'node:fs/promises';
const names = ['demo-case', 'demo-analysis', 'demo-draft', 'matter-v3', 'matter-v4'];
const data = {};
for (const name of names) {
  data[name] = JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
}
await writeFile(new URL('../extension/demo-data.js', import.meta.url),
  `// Generated from data/*.json by npm run build:fixtures. Synthetic demo only.\nexport default ${JSON.stringify(data, null, 2)};\n`);
console.log('Bundled five synthetic fixtures for offline use.');
