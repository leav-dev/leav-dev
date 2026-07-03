import { MetricsAggregator } from './aggregator.js';
import type { MetricsEngine, EngineConfig } from './types/engine.js';
import type { GitHubMetrics } from './types/metrics.js';
import { defaultCollectors } from './collectors/index.js';
import type { MetricCollector } from './types/engine.js';

export { MetricsAggregator };
export { defaultCollectors };
export type { GitHubMetrics, MetricMeta } from './types/metrics.js';
export type {
  ProfileMetrics,
  RepositoryMetrics,
  CommitMetrics,
  ContributionMetrics,
  PullRequestMetrics,
  IssueMetrics,
  StarMetrics,
  ForkMetrics,
  LanguageMetrics,
  ActivityMetrics,
  InsightMetrics,
  RepoBrief,
  ContributionDay,
} from './types/metrics.js';
export type { MetricCollector, EngineConfig, CollectContext, CollectResult, MetricsEngine, RestClient, GraphQLClient, CacheManager, CacheAdapter } from './types/engine.js';

export class Engine implements MetricsEngine {
  private aggregator: MetricsAggregator;

  constructor(config: EngineConfig, collectors?: MetricCollector<unknown>[]) {
    this.aggregator = new MetricsAggregator({
      config,
      collectors: collectors ?? defaultCollectors,
    });
  }

  async collect(): Promise<GitHubMetrics> {
    return this.aggregator.collect();
  }
}
