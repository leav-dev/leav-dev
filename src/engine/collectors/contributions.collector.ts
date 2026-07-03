import type { MetricCollector, CollectContext, CollectResult } from '../types/engine.js';
import type { ContributionMetrics, ContributionDay } from '../types/metrics.js';

interface ContributionCalendar {
  totalContributions: number;
  weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
}

function parseDate(d: string): Date {
  return new Date(d + 'T00:00:00');
}

export class ContributionsCollector implements MetricCollector<ContributionMetrics> {
  key = 'contributions' as const;

  async collect(ctx: CollectContext): Promise<CollectResult<ContributionMetrics>> {
    const calendar = ctx.shared.get('graphql:contributionCalendar') as ContributionCalendar;
    const now = ctx.config.now ?? new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const allDays: ContributionDay[] = calendar.weeks.flatMap(w =>
      w.contributionDays.map(d => ({ date: d.date, count: d.contributionCount })),
    );

    // Period sums
    const total = calendar.totalContributions;
    const today = allDays.find(d => d.date === todayStr)?.count ?? 0;

    const last7Days = allDays
      .filter(d => parseDate(d.date) >= new Date(now.getTime() - 7 * 86400000))
      .reduce((s, d) => s + d.count, 0);

    const last30Days = allDays
      .filter(d => parseDate(d.date) >= new Date(now.getTime() - 30 * 86400000))
      .reduce((s, d) => s + d.count, 0);

    const last365Days = allDays
      .filter(d => parseDate(d.date) >= new Date(now.getTime() - 365 * 86400000))
      .reduce((s, d) => s + d.count, 0);

    // Streak calculation
    const sorted = [...allDays].sort((a, b) => b.date.localeCompare(a.date));

    let currentStreak = 0;
    for (const day of sorted) {
      if (day.count > 0) {
        currentStreak++;
      } else {
        if (day.date === todayStr) continue;  // skip today if no activity yet
        break;
      }
    }

    let longestStreak = 0;
    let tempStreak = 0;
    const chronological = [...allDays].sort((a, b) => a.date.localeCompare(b.date));
    for (const day of chronological) {
      if (day.count > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    const activeDays = allDays.filter(d => d.count > 0).length;
    const inactiveDays = allDays.length - activeDays;

    const data: ContributionMetrics = {
      total,
      today,
      last7Days,
      last30Days,
      last365Days,
      currentStreak,
      longestStreak,
      activeDays,
      inactiveDays,
      calendar: allDays,
      _meta: {},
    };

    const meta: ContributionMetrics['_meta'] = {
      total: { source: 'GRAPHQL', endpoint: 'contributionsCollection.contributionCalendar.totalContributions', description: 'Total de contribuciones en el período', cached: false },
      today: { source: 'DERIVED', description: 'Contribuciones de hoy del calendario', cached: false },
      last7Days: { source: 'DERIVED', description: 'Suma de los últimos 7 días del calendario', cached: false },
      last30Days: { source: 'DERIVED', description: 'Suma de los últimos 30 días del calendario', cached: false },
      last365Days: { source: 'DERIVED', description: 'Suma de los últimos 365 días del calendario', cached: false },
      currentStreak: { source: 'DERIVED', description: 'Racha actual de días consecutivos con contribuciones. Se calcula iterando desde hoy hacia atrás hasta encontrar un día sin actividad.', cached: false },
      longestStreak: { source: 'DERIVED', description: 'Racha más larga de días consecutivos con contribuciones en el período', cached: false },
      activeDays: { source: 'DERIVED', description: 'Días con al menos 1 contribución', cached: false },
      inactiveDays: { source: 'DERIVED', description: 'Días sin contribuciones (totalDays - activeDays)', cached: false },
      calendar: { source: 'GRAPHQL', endpoint: 'contributionsCollection.contributionCalendar.weeks{contributionDays}', description: 'Array plano de todos los días del calendario con su count', cached: false },
    };

    return { key: this.key, data, meta, errors: [], cached: false, elapsed: 0 };
  }
}
