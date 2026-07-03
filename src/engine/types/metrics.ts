export interface MetricMeta {
  source: 'REST' | 'GRAPHQL' | 'DERIVED';
  description: string;
  endpoint?: string;
  cached: boolean;
}

export interface ProfileMetrics {
  name: string | null;
  login: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  followers: number;
  following: number;
  createdAt: string;
  updatedAt: string;
  avatarUrl: string;
  _meta: Record<string, MetricMeta>;
}

export interface RepoBrief {
  name: string;
  fullName: string;
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
  primaryLanguage: string | null;
  languages: { name: string; size: number }[];
  totalCommits: number;
  openIssues: number;
  openPRs: number;
}

export interface RepositoryMetrics {
  total: number;
  public: number;
  private: number;
  archived: number;
  forks: number;
  templates: number;
  totalStarred: number;
  totalForked: number;
  oldest: RepoBrief | null;
  newest: RepoBrief | null;
  mostStarred: RepoBrief | null;
  mostForked: RepoBrief | null;
  mostActive: RepoBrief | null;
  mostCommitted: RepoBrief | null;
  repos: RepoBrief[];
  _meta: Record<string, MetricMeta>;
}

export interface CommitMetrics {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  busiestDay: { date: string; count: number } | null;
  busiestHour: number | null;
  distributionByDay: Record<string, number>;
  distributionByHour: Record<number, number>;
  firstCommit: string | null;
  lastCommit: string | null;
  avgTimeBetweenCommits: number | null;
  _meta: Record<string, MetricMeta>;
}

export interface ContributionMetrics {
  total: number;
  today: number;
  last7Days: number;
  last30Days: number;
  last365Days: number;
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  inactiveDays: number;
  calendar: ContributionDay[];
  _meta: Record<string, MetricMeta>;
}

export interface ContributionDay {
  date: string;
  count: number;
}

export interface PullRequestMetrics {
  open: number;
  closed: number;
  merged: number;
  total: number;
  monthlyAverage: number;
  _meta: Record<string, MetricMeta>;
}

export interface IssueMetrics {
  open: number;
  closed: number;
  total: number;
  resolved: number;
  _meta: Record<string, MetricMeta>;
}

export interface StarMetrics {
  received: number;
  given: number;
  averagePerRepo: number;
  _meta: Record<string, MetricMeta>;
}

export interface ForkMetrics {
  total: number;
  averagePerRepo: number;
  _meta: Record<string, MetricMeta>;
}

export interface LanguageMetrics {
  languages: { name: string; percentage: number; size: number }[];
  primary: string | null;
  ranking: { name: string; repositories: number }[];
  reposPerLanguage: Record<string, number>;
  _meta: Record<string, MetricMeta>;
}

export interface ActivityMetrics {
  byMonth: { month: string; count: number }[];
  byWeek: { week: string; count: number }[];
  byDay: { day: string; count: number }[];
  byHour: { hour: number; count: number }[];
  mostProductiveMonth: { month: string; count: number } | null;
  mostProductiveWeek: { week: string; count: number } | null;
  mostProductiveDay: { day: string; count: number } | null;
  _meta: Record<string, MetricMeta>;
}

export interface InsightMetrics {
  productivityScore: number;
  consistencyScore: number;
  activityScore: number;
  repositoryHealthScore: number;
  contributionTrend: 'GROWING' | 'STABLE' | 'DECLINING';
  trendPercentage: number;
  codingVelocity: number;
  repositoryGrowth: number;
  monthlyGrowth: number;
  weeklyGrowth: number;
  commitFrequency: number;
  activeDaysPercentage: number;
  _meta: Record<string, MetricMeta>;
}

export interface GitHubMetrics {
  profile: ProfileMetrics | null;
  repositories: RepositoryMetrics | null;
  commits: CommitMetrics | null;
  contributions: ContributionMetrics | null;
  languages: LanguageMetrics | null;
  pull_requests: PullRequestMetrics | null;
  issues: IssueMetrics | null;
  activity: ActivityMetrics | null;
  insights: InsightMetrics | null;
  collectedAt: string;
  errors: { collector: string; messages: string[] }[];
}
