import type { MetricCollector, CollectContext, CollectResult } from '../types/engine.js';
import type { ForkMetrics } from '../types/metrics.js';

export class ForkCollector implements MetricCollector<ForkMetrics> {
  key = 'forks' as const;
  dependencies = ['repositories'];

  async collect(ctx: CollectContext): Promise<CollectResult<ForkMetrics>> {
    const repos = ctx.shared.get('collector:repositories') as { repos: { forkCount: number }[] } | undefined;

    const total = repos ? repos.repos.reduce((s, r) => s + r.forkCount, 0) : 0;
    const repoCount = repos?.repos.length ?? 1;
    const averagePerRepo = Math.round((total / repoCount) * 100) / 100;

    const data: ForkMetrics = {
      total,
      averagePerRepo,
      _meta: {},
    };

    const meta: ForkMetrics['_meta'] = {
      total: { source: 'DERIVED', description: 'Suma total de forkCount de todos los repos del usuario', cached: false },
      averagePerRepo: { source: 'DERIVED', description: 'Promedio de forks por repositorio (totalForks / totalRepos)', cached: false },
    };

    return { key: this.key, data, meta, errors: [], cached: false, elapsed: 0 };
  }
}
