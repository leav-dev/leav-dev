import type { MetricCollector, CollectContext, CollectResult } from '../types/engine.js';
import type { StarMetrics } from '../types/metrics.js';

export class StarCollector implements MetricCollector<StarMetrics> {
  key = 'stars' as const;
  dependencies = ['repositories'];

  async collect(ctx: CollectContext): Promise<CollectResult<StarMetrics>> {
    const repos = ctx.shared.get('collector:repositories') as { repos: { stargazerCount: number }[] } | undefined;
    const user = ctx.shared.get('graphql:user') as { starredRepositories: { totalCount: number } };

    const received = repos ? repos.repos.reduce((s, r) => s + r.stargazerCount, 0) : 0;
    const given = user.starredRepositories.totalCount;
    const repoCount = repos?.repos.length ?? 1;
    const averagePerRepo = Math.round((received / repoCount) * 100) / 100;

    const data: StarMetrics = {
      received,
      given,
      averagePerRepo,
      _meta: {},
    };

    const meta: StarMetrics['_meta'] = {
      received: { source: 'DERIVED', description: 'Suma total de stargazerCount de todos los repos del usuario', cached: false },
      given: { source: 'GRAPHQL', endpoint: 'user { starredRepositories { totalCount } }', description: 'Estrellas que el usuario ha dado a otros repos', cached: false },
      averagePerRepo: { source: 'DERIVED', description: 'Promedio de estrellas por repositorio (totalStars / totalRepos)', cached: false },
    };

    return { key: this.key, data, meta, errors: [], cached: false, elapsed: 0 };
  }
}
