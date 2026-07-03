import type {
  MetricCollector,
  CollectContext,
  CollectResult,
  EngineConfig,
  RestClient,
  GraphQLClient,
  CacheManager,
} from './types/engine.js';
import type { GitHubMetrics, MetricMeta } from './types/metrics.js';
import { RestClient as RestClientImpl } from './clients/rest-client.js';
import { GraphQLClient as GraphQLClientImpl } from './clients/graphql-client.js';
import { CacheManagerImpl } from './cache/index.js';
import { calculateInsights } from './calculators/insights.calculator.js';
import { defaultCollectors } from './collectors/index.js';

const MAIN_QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    name
    login
    bio
    location
    company
    websiteUrl
    createdAt
    updatedAt
    avatarUrl

    followers { totalCount }
    following { totalCount }
    starredRepositories { totalCount }
    repositoriesContributedTo(first: 0) { totalCount }

    repositories(first: 100, ownerAffiliations: [OWNER],
                 orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes {
        name
        nameWithOwner
        description
        url
        createdAt
        updatedAt
        pushedAt
        isPrivate
        isArchived
        isFork
        isTemplate
        forkCount
        stargazerCount
        primaryLanguage { name }
        languages(first: 10) { totalSize edges { size node { name } } }
        defaultBranchRef {
          target { ... on Commit { history(first: 0) { totalCount } } }
        }
        issues(states: [OPEN]) { totalCount }
        pullRequests(states: [OPEN]) { totalCount }
      }
      pageInfo { hasNextPage endCursor }
    }

    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
      commitContributionsByRepository(maxRepositories: 100) {
        repository { nameWithOwner }
        contributions { totalCount }
      }
    }

    openPRs: pullRequests(first: 0, states: [OPEN]) { totalCount }
    closedPRs: pullRequests(first: 0, states: [CLOSED]) { totalCount }
    mergedPRs: pullRequests(first: 0, states: [MERGED]) { totalCount }
    openIssues: issues(first: 0, states: [OPEN]) { totalCount }
    closedIssues: issues(first: 0, states: [CLOSED]) { totalCount }
  }
}
`;

export interface AggregatorConfig {
  config: EngineConfig;
  collectors?: MetricCollector<unknown>[];
}

export class MetricsAggregator {
  private config: EngineConfig;
  private collectors: MetricCollector<unknown>[];
  private rest: RestClient;
  private graphql: GraphQLClient;
  private cache: CacheManager;

  constructor(opts: AggregatorConfig) {
    this.config = opts.config;
    this.collectors = opts.collectors ?? defaultCollectors;
    this.rest = new RestClientImpl({ token: this.config.token });
    this.graphql = new GraphQLClientImpl({ token: this.config.token });
    this.cache = new CacheManagerImpl({ defaultTTL: this.config.cacheTTL ?? 1800 });
  }

  async collect(): Promise<GitHubMetrics> {
    const now = this.config.now ?? new Date();
    const to = now.toISOString();
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 1);
    const fromStr = from.toISOString();

    const shared = new Map<string, unknown>();

    // ── Phase 1: Main GraphQL query ──
    const mainResult = await this.cache.fetch(
      `main:${this.config.username}:${fromStr.slice(0, 10)}`,
      this.config.cacheTTL ?? 3600,  // cache 1h by default
      () => this.graphql.query<{ user: Record<string, unknown> }>(MAIN_QUERY, {
        login: this.config.username,
        from: fromStr,
        to,
      }),
    );

    const user = mainResult.user as {
      name?: string;
      login: string;
      createdAt: string;
      repositories: Record<string, unknown>;
      contributionsCollection: {
        contributionCalendar: Record<string, unknown>;
        commitContributionsByRepository: Record<string, unknown>[];
      };
    };

    shared.set('graphql:user', user);
    shared.set('graphql:repositories', user.repositories);
    shared.set('graphql:contributionCalendar', user.contributionsCollection.contributionCalendar);
    shared.set('graphql:commitContribByRepo', user.contributionsCollection.commitContributionsByRepository);

    // Account age for monthly averages
    const accountCreated = new Date(user.createdAt);
    const accountAgeMonths = (now.getFullYear() - accountCreated.getFullYear()) * 12
      + (now.getMonth() - accountCreated.getMonth());
    shared.set('collector:accountAgeMonths', Math.max(1, accountAgeMonths));

    // ── Phase 2: Run collectors ──
    const sorted = this.topologicalSort(this.collectors);
    const results = new Map<string, CollectResult<unknown>>();

    for (const collector of sorted) {
      const ctx: CollectContext = {
        rest: this.rest,
        graphql: this.graphql,
        cache: this.cache,
        shared,
        config: this.config,
      };

      const result = await collector.collect(ctx);
      results.set(collector.key, result);

      // Store in shared so dependent collectors can access
      if (result.data !== null && result.data !== undefined) {
        shared.set(`collector:${collector.key}`, result.data);
      }
    }

    // ── Phase 3: Calculate insights ──
    const errors: { collector: string; messages: string[] }[] = [];
    for (const [key, result] of results) {
      if (result.errors.length > 0) {
        errors.push({ collector: key, messages: result.errors });
      }
    }

    const repos = (results.get('repositories')?.data as { repos: unknown[] } | undefined)?.repos ?? null;
    const commits = results.get('commits')?.data;
    const contributions = results.get('contributions')?.data;
    const pullRequests = results.get('pull_requests')?.data;
    const issues = results.get('issues')?.data;
    const languages = results.get('languages')?.data;

    const insights = calculateInsights(
      repos as Parameters<typeof calculateInsights>[0],
      commits as Parameters<typeof calculateInsights>[1],
      contributions as Parameters<typeof calculateInsights>[2],
      pullRequests as Parameters<typeof calculateInsights>[3],
      issues as Parameters<typeof calculateInsights>[4],
      languages as Parameters<typeof calculateInsights>[5],
    );

    return {
      profile: (results.get('profile')?.data ?? null) as GitHubMetrics['profile'],
      repositories: (results.get('repositories')?.data ?? null) as GitHubMetrics['repositories'],
      commits: (results.get('commits')?.data ?? null) as GitHubMetrics['commits'],
      contributions: (results.get('contributions')?.data ?? null) as GitHubMetrics['contributions'],
      languages: (results.get('languages')?.data ?? null) as GitHubMetrics['languages'],
      pull_requests: (results.get('pull_requests')?.data ?? null) as GitHubMetrics['pull_requests'],
      issues: (results.get('issues')?.data ?? null) as GitHubMetrics['issues'],
      activity: (results.get('activity')?.data ?? null) as GitHubMetrics['activity'],
      insights,
      collectedAt: now.toISOString(),
      errors,
    };
  }

  private topologicalSort(collectors: MetricCollector<unknown>[]): MetricCollector<unknown>[] {
    const visited = new Set<string>();
    const sorted: MetricCollector<unknown>[] = [];
    const map = new Map(collectors.map(c => [c.key, c]));

    function visit(key: string, stack: Set<string>) {
      if (stack.has(key)) throw new Error(`Circular dependency detected: ${key}`);
      if (visited.has(key)) return;
      visited.add(key);
      stack.add(key);

      const collector = map.get(key);
      if (collector?.dependencies) {
        for (const dep of collector.dependencies) {
          visit(dep, stack);
        }
      }
      stack.delete(key);
      if (collector) sorted.push(collector);
    }

    for (const c of collectors) {
      if (!visited.has(c.key)) visit(c.key, new Set());
    }

    return sorted;
  }
}
