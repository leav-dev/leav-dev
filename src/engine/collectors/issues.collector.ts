import type { MetricCollector, CollectContext, CollectResult } from '../types/engine.js';
import type { IssueMetrics } from '../types/metrics.js';

export class IssueCollector implements MetricCollector<IssueMetrics> {
  key = 'issues' as const;

  async collect(ctx: CollectContext): Promise<CollectResult<IssueMetrics>> {
    const errors: string[] = [];
    const user = ctx.shared.get('graphql:user') as { login: string };

    try {
      const totalResp = await ctx.rest.search<Record<string, unknown>>('/search/issues', {
        q: `author:${user.login} type:issue`,
        per_page: 1,
      });
      const total = totalResp.data.total_count;

      const openResp = await ctx.rest.search<Record<string, unknown>>('/search/issues', {
        q: `author:${user.login} type:issue state:open`,
        per_page: 1,
      });
      const open = openResp.data.total_count;

      const closedResp = await ctx.rest.search<Record<string, unknown>>('/search/issues', {
        q: `author:${user.login} type:issue state:closed`,
        per_page: 1,
      });
      const closed = closedResp.data.total_count;

      const resolved = closed;

      const data: IssueMetrics = {
        open,
        closed,
        total,
        resolved,
        _meta: {},
      };

      const meta: IssueMetrics['_meta'] = {
        open: { source: 'REST', endpoint: 'GET /search/issues?q=author:{user}+type:issue+state:open', description: 'Issues abiertas actualmente creadas por el usuario', cached: false },
        closed: { source: 'REST', endpoint: 'GET /search/issues?q=author:{user}+type:issue+state:closed', description: 'Issues cerradas creadas por el usuario', cached: false },
        total: { source: 'REST', endpoint: 'GET /search/issues?q=author:{user}+type:issue', description: 'Total de issues creadas por el usuario', cached: false },
        resolved: { source: 'DERIVED', description: 'Issues resueltas (mismo que closed para issues propias)', cached: false },
      };

      return { key: this.key, data, meta, errors, cached: false, elapsed: 0 };
    } catch (err) {
      errors.push(`Failed to fetch issue data: ${(err as Error).message}`);
      const data: IssueMetrics = { open: 0, closed: 0, total: 0, resolved: 0, _meta: {} };
      return { key: this.key, data, meta: data._meta, errors, cached: false, elapsed: 0 };
    }
  }
}
