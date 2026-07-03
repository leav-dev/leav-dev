import type { MetricCollector, CollectContext, CollectResult } from '../types/engine.js';
import type { RepositoryMetrics, RepoBrief } from '../types/metrics.js';

interface GraphQLRepoNode {
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
  isTemplate: boolean;
  forkCount: number;
  stargazerCount: number;
  primaryLanguage: { name: string } | null;
  languages: {
    totalSize: number;
    edges: { size: number; node: { name: string } }[];
  } | null;
  defaultBranchRef: {
    target: { history: { totalCount: number } };
  } | null;
  issues: { totalCount: number };
  pullRequests: { totalCount: number };
}

interface GraphQLRepos {
  totalCount: number;
  nodes: GraphQLRepoNode[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export class RepositoriesCollector implements MetricCollector<RepositoryMetrics> {
  key = 'repositories' as const;
  dependencies = ['profile'];

  async collect(ctx: CollectContext): Promise<CollectResult<RepositoryMetrics>> {
    let reposData = ctx.shared.get('graphql:repositories') as GraphQLRepos;

    const allNodes = [...reposData.nodes];
    while (reposData.pageInfo.hasNextPage) {
      const more = await ctx.graphql.query<{ user: { repositories: GraphQLRepos } }>(
        `query($login: String!, $cursor: String!) {
          user(login: $login) {
            repositories(first: 100, after: $cursor, ownerAffiliations: [OWNER],
                         orderBy: {field: UPDATED_AT, direction: DESC}) {
              totalCount nodes { name nameWithOwner description url createdAt updatedAt pushedAt
                isPrivate isArchived isFork isTemplate forkCount stargazerCount
                primaryLanguage { name }
                languages(first: 10) { totalSize edges { size node { name } } }
                defaultBranchRef { target { ... on Commit { history(first: 0) { totalCount } } } }
                issues(states: [OPEN]) { totalCount }
                pullRequests(states: [OPEN]) { totalCount }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }`,
        { login: ctx.config.username, cursor: reposData.pageInfo.endCursor },
      );
      reposData = more.user.repositories;
      allNodes.push(...reposData.nodes);
    }

    const repos: RepoBrief[] = allNodes.map(n => ({
      name: n.name,
      fullName: n.nameWithOwner,
      description: n.description,
      url: n.url,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      pushedAt: n.pushedAt,
      isPrivate: n.isPrivate,
      isArchived: n.isArchived,
      isFork: n.isFork,
      isTemplate: n.isTemplate,
      forkCount: n.forkCount,
      stargazerCount: n.stargazerCount,
      primaryLanguage: n.primaryLanguage?.name ?? null,
      languages: n.languages
        ? n.languages.edges.map(e => ({ name: e.node.name, size: e.size }))
        : [],
      totalCommits: n.defaultBranchRef?.target.history.totalCount ?? 0,
      openIssues: n.issues.totalCount,
      openPRs: n.pullRequests.totalCount,
    }));

    const total = repos.length;
    const publicRepos = repos.filter(r => !r.isPrivate);
    const privateRepos = repos.filter(r => r.isPrivate);
    const archived = repos.filter(r => r.isArchived);
    const forks = repos.filter(r => r.isFork);
    const templates = repos.filter(r => r.isTemplate);

    const byDate = (a: RepoBrief, b: RepoBrief) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    const sortedByDate = [...repos].sort(byDate);
    const sortedByStars = [...repos].sort((a, b) => b.stargazerCount - a.stargazerCount);
    const sortedByForks = [...repos].sort((a, b) => b.forkCount - a.forkCount);
    const sortedByPushed = [...repos].sort((a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime());
    const sortedByCommits = [...repos].sort((a, b) => b.totalCommits - a.totalCommits);

    const data: RepositoryMetrics = {
      total,
      public: publicRepos.length,
      private: privateRepos.length,
      archived: archived.length,
      forks: forks.length,
      templates: templates.length,
      totalStarred: repos.reduce((s, r) => s + r.stargazerCount, 0),
      totalForked: repos.reduce((s, r) => s + r.forkCount, 0),
      oldest: sortedByDate[0] ?? null,
      newest: sortedByDate[sortedByDate.length - 1] ?? null,
      mostStarred: sortedByStars[0]?.stargazerCount > 0 ? sortedByStars[0] : null,
      mostForked: sortedByForks[0]?.forkCount > 0 ? sortedByForks[0] : null,
      mostActive: sortedByPushed[0] ?? null,
      mostCommitted: sortedByCommits[0]?.totalCommits > 0 ? sortedByCommits[0] : null,
      repos,
      _meta: {},
    };

    const meta: RepositoryMetrics['_meta'] = {
      total: { source: 'GRAPHQL', endpoint: 'user { repositories { totalCount } }', description: 'Total de repositorios del usuario', cached: false },
      public: { source: 'DERIVED', description: 'Repositorios públicos (isPrivate === false)', cached: false },
      private: { source: 'DERIVED', description: 'Repositorios privados (isPrivate === true). Requiere token con acceso.', cached: false },
      archived: { source: 'DERIVED', description: 'Repositorios archivados', cached: false },
      forks: { source: 'DERIVED', description: 'Repositorios que son forks', cached: false },
      templates: { source: 'DERIVED', description: 'Repositorios marcados como template', cached: false },
      totalStarred: { source: 'DERIVED', description: 'Suma total de estrellas en todos los repos', cached: false },
      totalForked: { source: 'DERIVED', description: 'Suma total de forks en todos los repos', cached: false },
      oldest: { source: 'DERIVED', description: 'Repositorio más antiguo por createdAt', cached: false },
      newest: { source: 'DERIVED', description: 'Repositorio más reciente por createdAt', cached: false },
      mostStarred: { source: 'DERIVED', description: 'Repositorio con mayor stargazerCount', cached: false },
      mostForked: { source: 'DERIVED', description: 'Repositorio con mayor forkCount', cached: false },
      mostActive: { source: 'DERIVED', description: 'Repositorio con pushedAt más reciente', cached: false },
      mostCommitted: { source: 'DERIVED', description: 'Repositorio con más commits en default branch', cached: false },
      repos: { source: 'GRAPHQL', endpoint: 'user { repositories { nodes } }', description: 'Lista completa de repositorios', cached: false },
    };

    return { key: this.key, data, meta, errors: [], cached: false, elapsed: 0 };
  }
}
