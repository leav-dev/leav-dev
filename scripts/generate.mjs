import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from '../dist/engine/index.js';
import { renderStatsCard, renderLangsCard, renderMetricsJson } from '../dist/renderer/svg-templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const statsDir = resolve(__dirname, '..', 'stats');

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('❌ GITHUB_TOKEN env var required');
    process.exit(1);
  }

  const username = process.env.GITHUB_USERNAME ?? process.env.GITHUB_REPOSITORY?.split('/')[0];
  if (!username) {
    console.error('❌ GITHUB_USERNAME or GITHUB_REPOSITORY env var required');
    process.exit(1);
  }

  mkdirSync(statsDir, { recursive: true });

  console.log(`📡 Fetching metrics for ${username}...`);
  const engine = new Engine({ token, username });
  const metrics = await engine.collect();

  const hadErrors = metrics.errors.length > 0;
  if (hadErrors) {
    console.warn('⚠️  Partial results (some collectors failed):');
    for (const err of metrics.errors) {
      console.warn(`   [${err.collector}] ${err.messages.join('; ')}`);
    }
  }

  // Generate SVGs
  console.log('🎨 Generating SVG cards...');
  const statsSvg = renderStatsCard(metrics);
  console.log('   ✓ stats/github-stats.svg');

  const langsSvg = renderLangsCard(metrics);
  writeFileSync(resolve(statsDir, 'top-langs.svg'), langsSvg, 'utf-8');
  console.log('   ✓ stats/top-langs.svg');

  // Generate JSON for extensibility
  const json = renderMetricsJson(metrics);
  writeFileSync(resolve(statsDir, 'metrics.json'), json, 'utf-8');
  console.log('   ✓ stats/metrics.json');

  console.log(`\n✅ Done. ${hadErrors ? 'Partial results' : 'All metrics collected'} at ${metrics.collectedAt}`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
