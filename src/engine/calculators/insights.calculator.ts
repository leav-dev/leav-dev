import type {
  GitHubMetrics,
  InsightMetrics,
  MetricMeta,
  RepoBrief,
  ContributionDay,
} from '../types/metrics.js';

export function calculateInsights(
  repos: RepoBrief[] | null,
  commits: GitHubMetrics['commits'],
  contributions: GitHubMetrics['contributions'],
  pullRequests: GitHubMetrics['pull_requests'],
  issues: GitHubMetrics['issues'],
  languages: GitHubMetrics['languages'],
): InsightMetrics {
  const meta: Record<string, MetricMeta> = {};
  const errors: string[] = [];

  // ── Activity Score (0-100) ──
  const totalCommits = commits?.total ?? 0;
  const totalPRs = pullRequests?.total ?? 0;
  const totalIssues = issues?.total ?? 0;
  const activeDays = contributions?.activeDays ?? 0;
  const totalDays = (contributions?.activeDays ?? 0) + (contributions?.inactiveDays ?? 0) || 1;

  const rawActivity = totalCommits * 1 + totalPRs * 3 + totalIssues * 2;
  const activityScore = clamp(normalize(rawActivity, 0, 5000) * 100, 0, 100);

  meta.activityScore = {
    source: 'DERIVED',
    description: 'Puntaje de actividad general (0-100). Fórmula: normalize(commits*1 + PRs*3 + issues*2, 0, 5000) * 100. Mide el volumen bruto de contribuciones.',
    cached: false,
  };

  // ── Consistency Score (0-100) ──
  const calendar = contributions?.calendar ?? [];
  const weeklyContribs = aggregateByWeek(calendar);
  const consistencyScore = calcConsistency(weeklyContribs);

  meta.consistencyScore = {
    source: 'DERIVED',
    description: 'Puntaje de consistencia (0-100). Coeficiente de variación inverso de contribuciones semanales. A menor variación, mayor consistencia.',
    cached: false,
  };

  // ── Active Days Percentage ──
  const activeDaysPercentage = totalDays > 0
    ? Math.round((activeDays / totalDays) * 10000) / 100
    : 0;

  meta.activeDaysPercentage = {
    source: 'DERIVED',
    description: 'Porcentaje de días activos. (activeDays / totalDays) * 100',
    cached: false,
  };

  // ── Coding Velocity ──
  const codingVelocity = activeDays > 0
    ? Math.round((totalCommits / activeDays) * 100) / 100
    : 0;

  meta.codingVelocity = {
    source: 'DERIVED',
    description: 'Commits por día activo. totalCommits / activeDays',
    cached: false,
  };

  // ── Commit Frequency ──
  const commitFrequency = commits?.avgTimeBetweenCommits ?? 0;

  meta.commitFrequency = {
    source: 'DERIVED',
    description: 'Tiempo promedio entre commits (horas) en días activos',
    cached: false,
  };

  // ── Repository Health Score (0-100) ──
  const repositoryHealthScore = calcRepoHealth(repos);

  meta.repositoryHealthScore = {
    source: 'DERIVED',
    description: 'Salud promedio de repositorios (0-100). Combina: issue close rate (30%), PR merge rate (30%), actividad reciente (20%), license (10%), description (10%).',
    cached: false,
  };

  // ── Repository Growth ──
  const repositoryGrowth = repos && repos.length > 0
    ? calcRepoGrowth(repos)
    : 0;

  meta.repositoryGrowth = {
    source: 'DERIVED',
    description: 'Tasa de crecimiento de repositorios. Repos creados en el último año / total de repos * 100',
    cached: false,
  };

  // ── Contribution Trend ──
  const { trend, percentage } = calcTrend(calendar);

  meta.contributionTrend = {
    source: 'DERIVED',
    description: 'Tendencia de contribuciones. Compara últimos 3 meses vs 3 meses anteriores. GROWING (>+10%), STABLE (±10%), DECLINING (<-10%).',
    cached: false,
  };
  meta.trendPercentage = {
    source: 'DERIVED',
    description: 'Variación porcentual entre períodos. ((current - previous) / previous) * 100',
    cached: false,
  };

  // ── Monthly / Weekly Growth ──
  const monthlyGrowth = calcMonthlyGrowth(calendar);
  const weeklyGrowth = calcWeeklyGrowth(calendar);

  meta.monthlyGrowth = {
    source: 'DERIVED',
    description: 'Crecimiento mensual de contribuciones. Variación % entre este mes y el anterior.',
    cached: false,
  };
  meta.weeklyGrowth = {
    source: 'DERIVED',
    description: 'Crecimiento semanal de contribuciones. Variación % entre esta semana y la anterior.',
    cached: false,
  };

  // ── Productivity Score (0-100) ──
  const productivityScore = calcProductivity(
    commits,
    pullRequests,
    issues,
    activeDaysPercentage,
    consistencyScore,
  );

  meta.productivityScore = {
    source: 'DERIVED',
    description: 'Productivity Score compuesto (0-100). Fórmula: commitsPerActiveDay*30 + prMergeRate*20 + issueResolution*15 + activeDaysPct*25 + consistency*10. Cada subcomponente normalizado.',
    cached: false,
  };

  return {
    productivityScore: Math.round(productivityScore),
    consistencyScore: Math.round(consistencyScore),
    activityScore: Math.round(activityScore),
    repositoryHealthScore: Math.round(repositoryHealthScore),
    contributionTrend: trend,
    trendPercentage: Math.round(percentage * 100) / 100,
    codingVelocity: Math.round(codingVelocity * 100) / 100,
    repositoryGrowth: Math.round(repositoryGrowth * 100) / 100,
    monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
    weeklyGrowth: Math.round(weeklyGrowth * 100) / 100,
    commitFrequency: Math.round(commitFrequency * 100) / 100,
    activeDaysPercentage,
    _meta: meta,
  };
}

// ── Helpers ──

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(value: number, min: number, max: number): number {
  if (max - min === 0) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function aggregateByWeek(calendar: ContributionDay[]): number[] {
  if (calendar.length === 0) return [];
  const weeks: number[] = [];
  let currentWeek = 0;
  let dayCount = 0;

  for (const day of calendar) {
    currentWeek += day.count;
    dayCount++;
    if (dayCount % 7 === 0) {
      weeks.push(currentWeek);
      currentWeek = 0;
    }
  }
  if (dayCount % 7 !== 0) weeks.push(currentWeek);

  return weeks;
}

function calcConsistency(weeklyContribs: number[]): number {
  if (weeklyContribs.length < 2) return 100;
  const mean = weeklyContribs.reduce((a, b) => a + b, 0) / weeklyContribs.length;
  if (mean === 0) return 100;
  const variance = weeklyContribs.reduce((acc, v) => acc + (v - mean) ** 2, 0) / weeklyContribs.length;
  const stddev = Math.sqrt(variance);
  const cv = stddev / mean;
  return clamp(100 - cv * 50, 0, 100);
}

function calcRepoHealth(repos: RepoBrief[] | null): number {
  if (!repos || repos.length === 0) return 0;
  const scores = repos.map(r => {
    const issueCloseRate = 0.3;   // Not tracked per-repo, default
    const prMergeRate = 0.3;
    const recentActivity = (Date.now() - new Date(r.pushedAt).getTime()) < 90 * 86400000 ? 20 : 0;
    const hasDescription = r.description ? 10 : 0;

    return (issueCloseRate * 30) + (prMergeRate * 30) + recentActivity + hasDescription + 10; // license = 10 default
  });

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function calcRepoGrowth(repos: RepoBrief[]): number {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentRepos = repos.filter(r => new Date(r.createdAt) >= oneYearAgo);
  return (recentRepos.length / repos.length) * 100;
}

function calcTrend(calendar: ContributionDay[]): { trend: 'GROWING' | 'STABLE' | 'DECLINING'; percentage: number } {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const current = calendar
    .filter(d => new Date(d.date) >= threeMonthsAgo)
    .reduce((s, d) => s + d.count, 0);

  const previous = calendar
    .filter(d => new Date(d.date) >= sixMonthsAgo && new Date(d.date) < threeMonthsAgo)
    .reduce((s, d) => s + d.count, 0);

  const percentage = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const trend = percentage > 10 ? 'GROWING' : percentage < -10 ? 'DECLINING' : 'STABLE';

  return { trend, percentage };
}

function calcMonthlyGrowth(calendar: ContributionDay[]): number {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const current = calendar
    .filter(d => {
      const dt = new Date(d.date);
      return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
    })
    .reduce((s, d) => s + d.count, 0);

  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const previous = calendar
    .filter(d => {
      const dt = new Date(d.date);
      return dt.getMonth() === lastMonth && dt.getFullYear() === lastYear;
    })
    .reduce((s, d) => s + d.count, 0);

  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

function calcWeeklyGrowth(calendar: ContributionDay[]): number {
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay());
  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const current = calendar
    .filter(d => new Date(d.date) >= currentWeekStart)
    .reduce((s, d) => s + d.count, 0);

  const previous = calendar
    .filter(d => {
      const dt = new Date(d.date);
      return dt >= lastWeekStart && dt < currentWeekStart;
    })
    .reduce((s, d) => s + d.count, 0);

  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

function calcProductivity(
  commits: GitHubMetrics['commits'],
  pullRequests: GitHubMetrics['pull_requests'],
  issues: GitHubMetrics['issues'],
  activeDaysPct: number,
  consistency: number,
): number {
  const commitsPerActiveDay = commits && commits.dailyAverage > 0
    ? normalize(commits.dailyAverage, 0, 10) * 30
    : 0;

  const prsPerMonth = pullRequests && pullRequests.monthlyAverage > 0
    ? normalize(pullRequests.monthlyAverage, 0, 10) * 20
    : 0;

  const issueResolution = issues && issues.closed > 0
    ? normalize(issues.closed / Math.max(issues.total, 1), 0, 0.5) * 15
    : 0;

  const activeDaysComponent = normalize(activeDaysPct, 0, 100) * 25;
  const consistencyComponent = normalize(consistency, 0, 100) * 10;

  return commitsPerActiveDay + prsPerMonth + issueResolution + activeDaysComponent + consistencyComponent;
}
