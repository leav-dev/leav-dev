import type { MetricCollector, CollectContext, CollectResult } from '../types/engine.js';
import type { CommitMetrics } from '../types/metrics.js';

interface ContributionCalendar {
  totalContributions: number;
  weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
}

interface CommitContribByRepo {
  repository: { nameWithOwner: string };
  contributions: { totalCount: number };
}

function parseDate(d: string): Date {
  return new Date(d + 'T00:00:00');
}

export class CommitsCollector implements MetricCollector<CommitMetrics> {
  key = 'commits' as const;
  dependencies = ['repositories'];

  async collect(ctx: CollectContext): Promise<CollectResult<CommitMetrics>> {
    const errors: string[] = [];

    const calendar = ctx.shared.get('graphql:contributionCalendar') as ContributionCalendar;
    const commitContribByRepo = ctx.shared.get('graphql:commitContribByRepo') as CommitContribByRepo[] | undefined;
    const repos = ctx.shared.get('collector:repositories') as { repos: { fullName: string; totalCommits: number }[] } | undefined;

    const now = ctx.config.now ?? new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const allDays = calendar.weeks.flatMap(w => w.contributionDays);

    // Period calculations from calendar
    const today = allDays.find(d => d.date === todayStr)?.contributionCount ?? 0;

    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    const thisWeekDays = allDays.filter(d => parseDate(d.date) >= thisWeekStart);
    const thisWeek = thisWeekDays.reduce((s, d) => s + d.contributionCount, 0);

    const thisMonth = allDays.filter(d => d.date.startsWith(todayStr.slice(0, 7)))
      .reduce((s, d) => s + d.contributionCount, 0);

    const thisYear = allDays.filter(d => d.date.startsWith(todayStr.slice(0, 4)))
      .reduce((s, d) => s + d.contributionCount, 0);

    // Averages
    const dayCounts = allDays.map(d => d.contributionCount);
    const nonZeroDays = dayCounts.filter(c => c > 0);
    const dailyAverage = dayCounts.length > 0
      ? Math.round((dayCounts.reduce((a, b) => a + b, 0) / dayCounts.length) * 100) / 100
      : 0;

    const weeksCount = Math.max(1, calendar.weeks.length);
    const weeklyAverage = Math.round((thisYear / weeksCount) * 100) / 100;

    const months = new Set(allDays.map(d => d.date.slice(0, 7)));
    const monthlyAverage = months.size > 0
      ? Math.round((thisYear / months.size) * 100) / 100
      : 0;

    // Busiest day
    const maxDay = allDays.reduce<{ date: string; count: number } | null>(
      (best, d) => !best || d.contributionCount > best.count ? { date: d.date, count: d.contributionCount } : best,
      null,
    );

    // Distribution by day of week
    const byDay: Record<string, { total: number; count: number }> = {};
    for (const d of allDays) {
      const dow = parseDate(d.date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      if (!byDay[dow]) byDay[dow] = { total: 0, count: 0 };
      byDay[dow].total += d.contributionCount;
      byDay[dow].count++;
    }
    const distributionByDay: Record<string, number> = {};
    for (const [day, stats] of Object.entries(byDay)) {
      distributionByDay[day] = stats.count > 0 ? Math.round((stats.total / stats.count) * 100) / 100 : 0;
    }

    // Hourly distribution via punch card (top repos by commits)
    let distributionByHour: Record<number, number> = {};
    let busiestHour: number | null = null;

    try {
      const topRepos = (commitContribByRepo ?? [])
        .sort((a, b) => b.contributions.totalCount - a.contributions.totalCount)
        .slice(0, 5);

      const punchCards: { hour: number; count: number; weight: number }[] = [];

      for (const repo of topRepos) {
        const [owner, name] = repo.repository.nameWithOwner.split('/');
        try {
          const { data } = await ctx.rest.get<number[][]>('/repos/{owner}/{repo}/stats/punch_card', {
            owner,
            repo: name,
          });
          const weight = repo.contributions.totalCount;
          for (const [day, hour, count] of data) {
            punchCards.push({ hour, count, weight });
          }
        } catch {
          // skip repos that fail
        }
      }

      const hourBuckets: Record<number, number> = {};
      for (const pc of punchCards) {
        hourBuckets[pc.hour] = (hourBuckets[pc.hour] ?? 0) + pc.count;
      }
      distributionByHour = hourBuckets;

      if (Object.keys(hourBuckets).length > 0) {
        let maxH = 0;
        let maxC = -1;
        for (const [h, c] of Object.entries(hourBuckets)) {
          if (c > maxC) { maxC = c; maxH = Number(h); }
        }
        busiestHour = maxH;
      }
    } catch {
      errors.push('Failed to fetch punch card data for hourly distribution');
    }

    // First/last commit
    const sortedDays = allDays.filter(d => d.contributionCount > 0).sort((a, b) => a.date.localeCompare(b.date));
    const firstCommit = sortedDays.length > 0 ? sortedDays[0].date + 'T00:00:00Z' : null;
    const lastCommit = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1].date + 'T00:00:00Z' : null;

    // Avg time between commits
    const totalActiveDays = sortedDays.length;
    const avgTimeBetweenCommits = totalActiveDays > 1 && dailyAverage > 0
      ? Math.round((24 / dailyAverage) * 100) / 100  // hours between commits on active days
      : null;

    const data: CommitMetrics = {
      total: thisYear,
      today,
      thisWeek,
      thisMonth,
      thisYear,
      dailyAverage,
      weeklyAverage,
      monthlyAverage,
      busiestDay: maxDay,
      busiestHour,
      distributionByDay,
      distributionByHour,
      firstCommit,
      lastCommit,
      avgTimeBetweenCommits,
      _meta: {},
    };

    const meta: CommitMetrics['_meta'] = {
      total: { source: 'GRAPHQL', endpoint: 'contributionsCollection.totalCommitContributions', description: 'Total de commits en el período', cached: false },
      today: { source: 'DERIVED', description: 'Commits de hoy, filtrado del contributionCalendar por fecha', cached: false },
      thisWeek: { source: 'DERIVED', description: 'Commits de la semana actual sumados del calendario', cached: false },
      thisMonth: { source: 'DERIVED', description: 'Commits del mes actual sumados del calendario', cached: false },
      thisYear: { source: 'DERIVED', description: 'Commits del año sumados del calendario', cached: false },
      dailyAverage: { source: 'DERIVED', description: 'Promedio de commits por día (total días / total commits)', cached: false },
      weeklyAverage: { source: 'DERIVED', description: 'Promedio de commits por semana', cached: false },
      monthlyAverage: { source: 'DERIVED', description: 'Promedio de commits por mes', cached: false },
      busiestDay: { source: 'DERIVED', description: 'Día con mayor cantidad de commits en el calendario', cached: false },
      busiestHour: { source: 'REST', endpoint: 'GET /repos/{owner}/{repo}/stats/punch_card', description: 'Hora del día con más commits (0-23), agregado de top 5 repos', cached: false },
      distributionByDay: { source: 'DERIVED', description: 'Distribución promedio de commits por día de la semana', cached: false },
      distributionByHour: { source: 'REST', endpoint: 'GET /repos/{owner}/{repo}/stats/punch_card', description: 'Distribución de commits por hora del día', cached: false },
      firstCommit: { source: 'DERIVED', description: 'Primera fecha con commits registrados en el período', cached: false },
      lastCommit: { source: 'DERIVED', description: 'Última fecha con commits registrados', cached: false },
      avgTimeBetweenCommits: { source: 'DERIVED', description: 'Tiempo promedio entre commits (horas). 24/dailyAverage', cached: false },
    };

    return { key: this.key, data, meta, errors, cached: false, elapsed: 0 };
  }
}
