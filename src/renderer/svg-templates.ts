import type { GitHubMetrics } from '../engine/types/metrics.js';

// ─── Tokyonight palette ───
const C = {
  bg: '#1a1b27',
  card: '#1f2235',
  border: '#2d3355',
  text: '#ffffff',
  heading: '#e0e0e0',
  body: '#a9b1d6',
  muted: '#7c85b0',
  accent: '#7aa2f7',
  green: '#9ece6a',
  orange: '#ff9e64',
  red: '#f7768e',
  purple: '#bb9af7',
  cyan: '#7dcfff',
} as const;

// Identity shown on the profile card. These values are not derivable from the
// GitHub API: the account name is a handle ("LEAV") and the bio is empty, so
// they are declared here instead of guessed from profile fields.
const IDENTITY = {
  name: 'Luis Eduardo Albor Vega',
  role: 'Full-Stack Developer · Colombia (UTC−5)',
  availability: 'abierto a oportunidades remotas',
  seniority: '58 meses escribiendo software en producción',
  current: 'Grupo Educate Colombia · desde feb 2024',
} as const;

export function renderStatsCard(m: GitHubMetrics): string {
  const p = m.profile;
  const r = m.repositories;
  const c = m.commits;
  const ct = m.contributions;
  const i = m.insights;
  const displayName = p?.name ?? p?.login ?? 'GitHub Stats';

  const statItems = [
    { label: 'Repos', value: String(r?.total ?? 0), color: C.accent },
    { label: 'Stars', value: String(r?.totalStarred ?? 0), color: C.orange },
    { label: 'Forks', value: String(r?.totalForked ?? 0), color: C.green },
    { label: 'Followers', value: String(p?.followers ?? 0), color: C.purple },
    { label: 'Following', value: String(p?.following ?? 0), color: C.cyan },
  ];

  const streakItems = [
    { label: 'Current Streak', value: `${ct?.currentStreak ?? 0} days`, color: C.green },
    { label: 'Longest Streak', value: `${ct?.longestStreak ?? 0} days`, color: C.orange },
    { label: 'Commits', value: String(c?.total ?? 0), color: C.accent },
  ];

  const cols = [140, 300, 460];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="320" viewBox="0 0 600 320" role="img">
  <title>${escapeXml(displayName)} — GitHub stats</title>
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#414bd7" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#7aa2f7" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <rect width="600" height="320" rx="12" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>
  <rect width="600" height="320" rx="12" fill="url(#g)"/>

  <!-- Header -->
  ${p?.avatarUrl ? `<image x="20" y="18" width="40" height="40" rx="20" href="${escapeXml(p.avatarUrl)}" clip-path="circle(20px at 40px 38px)"/>` : ''}
  <text x="72" y="34" font-family="Segoe UI, system-ui, sans-serif" font-size="16" font-weight="700" fill="${C.heading}">${escapeXml(displayName)}</text>
  <text x="72" y="52" font-family="Segoe UI, system-ui, sans-serif" font-size="12" fill="${C.text}">@${escapeXml(p?.login ?? '')}</text>

  <!-- Stats Grid -->
  ${statItems.map((item, i) => {
    const col = i < 3 ? cols[i] : cols[i - 3];
    const row = i < 3 ? 80 : 115;
    return `
  <text x="${col}" y="${row}" font-family="Segoe UI, system-ui, sans-serif" font-size="11" fill="${C.text}">${item.label}</text>
  <text x="${col}" y="${row + 18}" font-family="Segoe UI, system-ui, sans-serif" font-size="18" font-weight="700" fill="${item.color}">${item.value}</text>`;
  }).join('')}

  <!-- Divider -->
  <line x1="20" y1="150" x2="580" y2="150" stroke="${C.border}" stroke-width="1"/>

  <!-- Streak & Commits -->
  <text x="20" y="176" font-family="Segoe UI, system-ui, sans-serif" font-size="12" font-weight="600" fill="${C.heading}">Contributions</text>
  ${streakItems.map((item, i) => `
  <text x="${cols[i]}" y="200" font-family="Segoe UI, system-ui, sans-serif" font-size="11" fill="${C.text}">${item.label}</text>
  <text x="${cols[i]}" y="218" font-family="Segoe UI, system-ui, sans-serif" font-size="16" font-weight="700" fill="${item.color}">${item.value}</text>`).join('')}

  <!-- Activity Bar (micro heatmap) -->
  ${renderMiniHeatmap(ct?.calendar ?? [], 230)}

  <!-- Insights footer -->
  <line x1="20" y1="280" x2="580" y2="280" stroke="${C.border}" stroke-width="1"/>
  ${i ? `
  <text x="20" y="300" font-family="Segoe UI, system-ui, sans-serif" font-size="11" fill="${C.text}">Productivity</text>
  <text x="20" y="314" font-family="Segoe UI, system-ui, sans-serif" font-size="16" font-weight="700" fill="${i.productivityScore >= 70 ? C.green : i.productivityScore >= 40 ? C.orange : C.red}">${i.productivityScore}/100</text>

  <text x="140" y="300" font-family="Segoe UI, system-ui, sans-serif" font-size="11" fill="${C.text}">Consistency</text>
  <text x="140" y="314" font-family="Segoe UI, system-ui, sans-serif" font-size="16" font-weight="700" fill="${i.consistencyScore >= 70 ? C.green : i.consistencyScore >= 40 ? C.orange : C.red}">${i.consistencyScore}/100</text>

  <text x="300" y="300" font-family="Segoe UI, system-ui, sans-serif" font-size="11" fill="${C.text}">Activity</text>
  <text x="300" y="314" font-family="Segoe UI, system-ui, sans-serif" font-size="16" font-weight="700" fill="${i.activityScore >= 70 ? C.green : i.activityScore >= 40 ? C.orange : C.red}">${i.activityScore}/100</text>

  <text x="460" y="300" font-family="Segoe UI, system-ui, sans-serif" font-size="11" fill="${C.text}">Active Days</text>
  <text x="460" y="314" font-family="Segoe UI, system-ui, sans-serif" font-size="16" font-weight="700" fill="${C.accent}">${i.activeDaysPercentage}%</text>` : ''}
</svg>`;
}

export function renderLangsCard(m: GitHubMetrics): string {
  const langs = m.languages?.languages ?? [];
  const reposPerLanguage = m.languages?.reposPerLanguage ?? {};
  const totalRepos = m.repositories?.total ?? 0;
  const top = langs.slice(0, 8);
  const maxPct = top[0]?.percentage ?? 100;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${90 + top.length * 32}" viewBox="0 0 360 ${90 + top.length * 32}">
  <rect width="360" height="${90 + top.length * 32}" rx="12" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>

  <text x="20" y="30" font-family="Segoe UI, system-ui, sans-serif" font-size="14" font-weight="700" fill="${C.heading}">Most Used Languages</text>
  <text x="340" y="30" text-anchor="end" font-family="Segoe UI, system-ui, sans-serif" font-size="11" fill="${C.text}">${totalRepos} repos</text>

  ${top.map((lang, i) => {
    const barW = Math.max(4, (lang.percentage / maxPct) * 200);
    const y = 56 + i * 32;
    const color = langColor(lang.name);
    const repoCount = reposPerLanguage[lang.name] ?? 0;
    const repoLabel = repoCount === 1 ? '1 repo' : `${repoCount} repos`;
    return `
  <text x="20" y="${y}" font-family="Segoe UI, system-ui, sans-serif" font-size="11" fill="${C.text}">${escapeXml(lang.name)}</text>
  <rect x="20" y="${y + 6}" width="${barW}" height="12" rx="4" fill="${color}" opacity="0.8"/>
  <text x="${20 + barW + 6}" y="${y + 16}" font-family="Segoe UI, system-ui, sans-serif" font-size="11" fill="${C.text}">${lang.percentage}% · ${repoLabel}</text>`;
  }).join('')}
</svg>`;
}

export function renderMetricsJson(m: GitHubMetrics): string {
  return JSON.stringify(m, null, 2);
}

/**
 * Identity card for the profile README: name and role on the left, the real
 * language mix and the verifiable evidence counters on the right.
 * Everything except IDENTITY comes from collected metrics, so the card stays
 * current when CI regenerates it.
 */
export function renderIdentityCard(m: GitHubMetrics): string {
  const W = 1200;
  const H = 230;
  const sans = 'Segoe UI, system-ui, -apple-system, Roboto, sans-serif';
  const nameSize = 22;

  const languages = (m.languages?.languages ?? []).filter(l => l.percentage >= 1);
  const top = languages.slice(0, 4);
  const rest = 100 - top.reduce((sum, l) => sum + l.percentage, 0);
  const segments = rest > 0.5
    ? [...top, { name: 'Otros', percentage: Number(rest.toFixed(2)), size: 0 }]
    : top;

  const barX = 512;
  const barW = 648;
  let cursor = barX;
  const bars = segments
    .map(lang => {
      const w = (lang.percentage / 100) * barW;
      const rect = `<rect x="${cursor.toFixed(1)}" y="58" width="${Math.max(2, w).toFixed(1)}" height="12" fill="${langColor(lang.name)}" stroke="${C.bg}" stroke-width="1"/>`;
      cursor += w;
      return rect;
    })
    .join('');

  const legend = segments
    .map((lang, i) => {
      const x = barX + i * 128;
      return `<circle cx="${x + 4}" cy="92" r="4" fill="${langColor(lang.name)}"/>
  <text x="${x + 14}" y="96" font-family="${sans}" font-size="11.5" fill="${C.body}">${escapeXml(lang.name)}</text>
  <text x="${x + 112}" y="96" text-anchor="end" font-family="${sans}" font-size="11" fill="${C.muted}">${formatPct(lang.percentage)}</text>`;
    })
    .join('\n  ');

  const evidence = [
    { value: String(m.contributions?.last365Days ?? 0), label: 'contribuciones · 365 d', color: C.green },
    { value: String(m.repositories?.public ?? 0), label: 'repositorios públicos', color: C.cyan },
    { value: String(m.pull_requests?.merged ?? 0), label: 'pull requests mergeados', color: C.purple },
    { value: String(m.commits?.thisMonth ?? 0), label: 'commits · últimos 30 d', color: C.orange },
  ]
    .map((item, i) => {
      const x = barX + i * 162;
      return `<text x="${x}" y="181" font-family="${sans}" font-size="24" font-weight="700" fill="${item.color}">${item.value}</text>
  <text x="${x}" y="199" font-family="${sans}" font-size="10.5" fill="${C.muted}">${escapeXml(item.label)}</text>`;
    })
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="idcard-title">
  <title id="idcard-title">${escapeXml(IDENTITY.name)} — ${escapeXml(IDENTITY.role)}</title>
  <defs>
    <linearGradient id="idbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a1b27"/>
      <stop offset="1" stop-color="#24273d"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="14" fill="url(#idbg)" stroke="${C.border}" stroke-width="1.5"/>

  <!-- Monogram -->
  <rect x="40" y="40" width="72" height="72" rx="16" fill="#20233c" stroke="${C.border}"/>
  <text x="51" y="83" font-family="${sans}" font-size="20" font-weight="700" fill="${C.text}">L</text>
  <text x="63" y="83" font-family="${sans}" font-size="20" font-weight="700" fill="${C.accent}">EAV</text>

  <!-- Name, role, availability -->
  <text x="132" y="66" font-family="${sans}" font-size="${nameSize}" font-weight="700" fill="${C.text}">${escapeXml(IDENTITY.name)}</text>
  <text x="132" y="90" font-family="${sans}" font-size="13" fill="${C.body}">${escapeXml(IDENTITY.role)}</text>
  <rect x="132" y="102" width="196" height="26" rx="13" fill="#1e2a1f" stroke="#33502f"/>
  <circle cx="148" cy="115" r="4" fill="${C.green}"/>
  <text x="160" y="119" font-family="${sans}" font-size="11.5" fill="${C.green}">${escapeXml(IDENTITY.availability)}</text>

  <text x="40" y="164" font-family="${sans}" font-size="11.5" fill="${C.muted}">${escapeXml(IDENTITY.seniority)}</text>
  <text x="40" y="184" font-family="${sans}" font-size="11.5" fill="${C.muted}">${escapeXml(IDENTITY.current)}</text>

  <!-- Divider -->
  <line x1="480" y1="32" x2="480" y2="198" stroke="${C.border}"/>

  <!-- Languages -->
  <text x="${barX}" y="44" font-family="${sans}" font-size="10.5" letter-spacing="1.6" fill="${C.muted}">CÓDIGO QUE ESCRIBO HOY</text>
  ${bars}
  ${legend}

  <line x1="${barX}" y1="124" x2="1160" y2="124" stroke="${C.border}"/>

  <!-- Evidence -->
  <text x="${barX}" y="150" font-family="${sans}" font-size="10.5" letter-spacing="1.6" fill="${C.muted}">EVIDENCIA</text>
  ${evidence}
</svg>`;
}

function formatPct(value: number): string {
  return `${value.toFixed(1).replace('.', ',')} %`;
}

// ─── Helpers ───

function escapeXml(s: string | null | undefined): string {
  if (s == null) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function langColor(name: string): string {
  const colors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572a5',
    Java: '#b07219',
    'C#': '#178600',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Rust: '#dea584',
    Go: '#00add8',
    Ruby: '#701516',
    PHP: '#4f5d95',
    Dart: '#00b4ab',
    Swift: '#ffac45',
    Kotlin: '#a97bff',
    Lua: '#000080',
    Shell: '#89e051',
    Dockerfile: '#384d54',
    Astro: '#ff5a03',
    Svelte: '#ff3e00',
    Vue: '#41b883',
    Zig: '#ec915c',
    Elixir: '#6e4a7e',
    Haskell: '#5e5086',
    Scala: '#c22d40',
  };
  return colors[name] ?? '#6c6c6c';
}

function renderMiniHeatmap(calendar: { date: string; count: number }[], y: number): string {
  const weeks: { date: string; count: number }[][] = [];
  let current: { date: string; count: number }[] = [];

  for (const day of calendar) {
    current.push(day);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }
  if (current.length > 0) weeks.push(current);

  const recentWeeks = weeks.slice(-26);
  const maxCount = Math.max(1, ...recentWeeks.flat().map(d => d.count));

  let bars = '';
  for (let w = 0; w < recentWeeks.length; w++) {
    for (let d = 0; d < recentWeeks[w].length; d++) {
      const day = recentWeeks[w][d];
      const intensity = day.count / maxCount;
      const opacity = day.count > 0 ? Math.max(0.2, intensity) : 0.1;
      const x = 20 + w * 11;
      const yPos = y + d * 11;
      bars += `<rect x="${x}" y="${yPos}" width="9" height="9" rx="2" fill="${C.accent}" opacity="${opacity}"/>`;
    }
  }

  return bars;
}
