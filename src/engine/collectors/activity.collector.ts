import type { MetricCollector, CollectContext, CollectResult } from '../types/engine.js';
import type { ActivityMetrics } from '../types/metrics.js';

interface ContributionCalendar {
  weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
}

function parseDate(d: string): Date {
  return new Date(d + 'T00:00:00');
}

export class ActivityCollector implements MetricCollector<ActivityMetrics> {
  key = 'activity' as const;

  async collect(ctx: CollectContext): Promise<CollectResult<ActivityMetrics>> {
    const calendar = ctx.shared.get('graphql:contributionCalendar') as ContributionCalendar;
    const allDays = calendar.weeks.flatMap(w => w.contributionDays);

    // By month
    const monthMap: Record<string, number> = {};
    for (const d of allDays) {
      const month = d.date.slice(0, 7);
      monthMap[month] = (monthMap[month] ?? 0) + d.contributionCount;
    }
    const byMonth = Object.entries(monthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // By week
    const weekMap: Record<string, number> = {};
    for (const w of calendar.weeks) {
      if (w.contributionDays.length === 0) continue;
      const weekStart = w.contributionDays[0].date;
      const total = w.contributionDays.reduce((s, d) => s + d.contributionCount, 0);
      weekMap[weekStart] = total;
    }
    const byWeek = Object.entries(weekMap)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // By day of week
    const dayMap: Record<string, number> = {};
    for (const d of allDays) {
      const dow = parseDate(d.date).toLocaleDateString('en-US', { weekday: 'long' });
      dayMap[dow] = (dayMap[dow] ?? 0) + d.contributionCount;
    }
    const byDay = Object.entries(dayMap)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => {
        const order = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return order.indexOf(a.day) - order.indexOf(b.day);
      });

    // By hour (from punch card if available, or empty)
    const byHour: { hour: number; count: number }[] = [];

    // Most productive periods
    const mostProductiveMonth = byMonth.length > 0
      ? byMonth.reduce((best, curr) => curr.count >= best.count ? curr : best)
      : null;
    const mostProductiveWeek = byWeek.length > 0
      ? byWeek.reduce((best, curr) => curr.count >= best.count ? curr : best)
      : null;
    const mostProductiveDay = byDay.length > 0
      ? byDay.reduce((best, curr) => curr.count >= best.count ? curr : best)
      : null;

    const data: ActivityMetrics = {
      byMonth,
      byWeek,
      byDay,
      byHour,
      mostProductiveMonth,
      mostProductiveWeek,
      mostProductiveDay,
      _meta: {},
    };

    const meta: ActivityMetrics['_meta'] = {
      byMonth: { source: 'DERIVED', description: 'Contribuciones agregadas por mes. Calculado agrupando contributionCalendar por YYYY-MM', cached: false },
      byWeek: { source: 'DERIVED', description: 'Contribuciones agregadas por semana. Calculado sumando cada semana del calendario', cached: false },
      byDay: { source: 'DERIVED', description: 'Contribuciones agregadas por día de la semana', cached: false },
      byHour: { source: 'REST', endpoint: 'GET /repos/{owner}/{repo}/stats/punch_card', description: 'Distribución por hora (vacío si no hay datos de punch card)', cached: false },
      mostProductiveMonth: { source: 'DERIVED', description: 'Mes con más contribuciones', cached: false },
      mostProductiveWeek: { source: 'DERIVED', description: 'Semana con más contribuciones', cached: false },
      mostProductiveDay: { source: 'DERIVED', description: 'Día de la semana con más contribuciones', cached: false },
    };

    return { key: this.key, data, meta, errors: [], cached: false, elapsed: 0 };
  }
}
