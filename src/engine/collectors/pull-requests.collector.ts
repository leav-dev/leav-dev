import type { MetricCollector, CollectContext, CollectResult } from '../types/engine.js';
import type { PullRequestMetrics } from '../types/metrics.js';

export class PullRequestCollector implements MetricCollector<PullRequestMetrics> {
  key = 'pull_requests' as const;

  async collect(ctx: CollectContext): Promise<CollectResult<PullRequestMetrics>> {
    const errors: string[] = [];

    const user = ctx.shared.get('graphql:user') as { login: string };

    // Search API gives actual totals including historical
    let open = 0;
    let closed = 0;
    let merged = 0;

    try {
      const searchPRs = await ctx.rest.search<Record<string, unknown>>('/search/issues', {
        q: `author:${user.login} type:pr`,
        per_page: 1,
      });
      const totalCreated = searchPRs.data.total_count;

      const searchOpen = await ctx.rest.search<Record<string, unknown>>('/search/issues', {
        q: `author:${user.login} type:pr state:open`,
        per_page: 1,
      });
      open = searchOpen.data.total_count;

      const searchClosed = await ctx.rest.search<Record<string, unknown>>('/search/issues', {
        q: `author:${user.login} type:pr state:closed`,
        per_page: 1,
      });
      closed = searchClosed.data.total_count;

      const searchMerged = await ctx.rest.search<Record<string, unknown>>('/search/issues', {
        q: `author:${user.login} type:pr is:merged`,
        per_page: 1,
      });
      merged = searchMerged.data.total_count;

      // Monthly average: if we have the account age
      const accountAge = ctx.shared.get('collector:accountAgeMonths') as number | undefined;
      const monthlyAverage = accountAge && accountAge > 0
        ? Math.round((totalCreated / accountAge) * 100) / 100
        : 0;

      const data: PullRequestMetrics = {
        open,
        closed,
        merged,
        total: totalCreated,
        monthlyAverage,
        _meta: {},
      };

      const meta: PullRequestMetrics['_meta'] = {
        open: { source: 'REST', endpoint: 'GET /search/issues?q=author:{user}+type:pr+state:open', description: 'Pull requests abiertas actualmente', cached: false },
        closed: { source: 'REST', endpoint: 'GET /search/issues?q=author:{user}+type:pr+state:closed', description: 'Pull requests cerradas (sin merge)', cached: false },
        merged: { source: 'REST', endpoint: 'GET /search/issues?q=author:{user}+type:pr+is:merged', description: 'Pull requests mergeadas', cached: false },
        total: { source: 'REST', endpoint: 'GET /search/issues?q=author:{user}+type:pr', description: 'Total de PRs creadas por el usuario (sin filtro de estado)', cached: false },
        monthlyAverage: { source: 'DERIVED', description: 'Promedio de PRs por mes (total / meses desde creación de cuenta)', cached: false },
      };

      return { key: this.key, data, meta, errors, cached: false, elapsed: 0 };
    } catch (err) {
      errors.push(`Failed to fetch PR data: ${(err as Error).message}`);
      const data: PullRequestMetrics = {
        open: 0, closed: 0, merged: 0, total: 0, monthlyAverage: 0, _meta: {},
      };
      return { key: this.key, data, meta: data._meta, errors, cached: false, elapsed: 0 };
    }
  }
}
