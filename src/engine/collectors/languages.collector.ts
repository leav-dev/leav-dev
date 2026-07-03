import type { MetricCollector, CollectContext, CollectResult } from '../types/engine.js';
import type { LanguageMetrics } from '../types/metrics.js';

export class LanguageCollector implements MetricCollector<LanguageMetrics> {
  key = 'languages' as const;
  dependencies = ['repositories'];

  async collect(ctx: CollectContext): Promise<CollectResult<LanguageMetrics>> {
    const repos = ctx.shared.get('collector:repositories') as {
      repos: { primaryLanguage: string | null; languages: { name: string; size: number }[] }[];
    } | undefined;

    if (!repos) {
      const empty: LanguageMetrics = {
        languages: [], primary: null, ranking: [], reposPerLanguage: {}, _meta: {},
      };
      return { key: this.key, data: empty, meta: empty._meta, errors: ['No repository data available'], cached: false, elapsed: 0 };
    }

    // Aggregate language bytes
    const langBytes: Record<string, number> = {};
    const langRepos: Record<string, Set<string>> = {};

    for (const repo of repos.repos) {
      for (const lang of repo.languages) {
        langBytes[lang.name] = (langBytes[lang.name] ?? 0) + lang.size;
        if (!langRepos[lang.name]) langRepos[lang.name] = new Set();
        langRepos[lang.name].add(repo.primaryLanguage ?? '');
      }
    }

    const totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0);

    const languages = Object.entries(langBytes)
      .map(([name, size]) => ({
        name,
        size,
        percentage: totalBytes > 0 ? Math.round((size / totalBytes) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.size - a.size);

    const primary = languages[0]?.name ?? null;

    const ranking = Object.entries(langRepos)
      .map(([name, reposSet]) => ({ name, repositories: reposSet.size }))
      .sort((a, b) => b.repositories - a.repositories);

    const reposPerLanguage: Record<string, number> = {};
    for (const [name, reposSet] of Object.entries(langRepos)) {
      reposPerLanguage[name] = reposSet.size;
    }

    const data: LanguageMetrics = {
      languages,
      primary,
      ranking,
      reposPerLanguage,
      _meta: {},
    };

    const meta: LanguageMetrics['_meta'] = {
      languages: { source: 'DERIVED', description: 'Lenguajes y su porcentaje. Agregado de languages.edges[].size de cada repo dividido por totalBytes', cached: false },
      primary: { source: 'DERIVED', description: 'Lenguaje con mayor porcentaje de uso', cached: false },
      ranking: { source: 'DERIVED', description: 'Ranking de lenguajes por cantidad de repos en los que aparece', cached: false },
      reposPerLanguage: { source: 'DERIVED', description: 'Cantidad de repos que usan cada lenguaje', cached: false },
    };

    return { key: this.key, data, meta, errors: [], cached: false, elapsed: 0 };
  }
}
