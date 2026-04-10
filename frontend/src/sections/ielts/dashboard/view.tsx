import { useMemo } from 'react';
// @mui
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
// locales
import { useLocales } from 'src/locales';
//
import { MOCK_SKILLS, MOCK_STATS } from './constants';
import {
  ActivityHeatmap,
  DashboardHero,
  ModuleCard,
  RecentActivityCard,
  SkillsProgressCard,
  StatMiniCard,
} from './components';

// ----------------------------------------------------------------------

function skillModuleTitle(
  tx: (key: string) => string,
  key: (typeof MOCK_SKILLS)[number]['key']
) {
  if (key === 'reading') return tx('pages.ielts.reading.title');
  if (key === 'writing') return tx('pages.ielts.writing.title');
  return tx('pages.ielts.listening.title');
}

export default function IeltsDashboardView() {
  const { tx, currentLang } = useLocales();

  const heroDescription = `${tx('pages.ielts.subtitle')} ${tx('pages.ielts.analytics.demo_hint')}`;

  const heatmapCopy = useMemo(
    () => ({
      summary: (count: number) => String(tx('pages.ielts.analytics.heatmap_summary', { count })),
      settingsLabel: String(tx('pages.ielts.analytics.heatmap_settings')),
      less: String(tx('pages.ielts.analytics.heatmap_less')),
      more: String(tx('pages.ielts.analytics.heatmap_more')),
      learn: String(tx('pages.ielts.analytics.heatmap_learn')),
      rowMon: String(tx('pages.ielts.analytics.heatmap_row_mon')),
      rowWed: String(tx('pages.ielts.analytics.heatmap_row_wed')),
      rowFri: String(tx('pages.ielts.analytics.heatmap_row_fri')),
      cellEmpty: (date: string) => String(tx('pages.ielts.analytics.heatmap_cell_empty', { date })),
      cellActive: (date: string, minutes: number) =>
        String(tx('pages.ielts.analytics.heatmap_cell_active', { date, minutes })),
    }),
    [tx]
  );

  const skillRows = useMemo(
    () =>
      MOCK_SKILLS.map((s) => ({
        key: s.key,
        label: skillModuleTitle(tx, s.key),
        pct: s.pct,
        barColor: s.color,
      })),
    [tx]
  );

  const modules = useMemo(
    () =>
      [
        {
          title: tx('pages.ielts.reading.title'),
          description: tx('pages.ielts.reading.description'),
          icon: 'solar:book-bold-duotone',
          colorKey: 'primary' as const,
        },
        {
          title: tx('pages.ielts.writing.title'),
          description: tx('pages.ielts.writing.description'),
          icon: 'solar:pen-bold-duotone',
          colorKey: 'info' as const,
        },
        {
          title: tx('pages.ielts.listening.title'),
          description: tx('pages.ielts.listening.description'),
          icon: 'solar:headphones-round-bold-duotone',
          colorKey: 'success' as const,
        },
      ] as const,
    [tx]
  );

  const activities = useMemo(
    () => [
      tx('pages.ielts.analytics.activity_1'),
      tx('pages.ielts.analytics.activity_2'),
      tx('pages.ielts.analytics.activity_3'),
    ],
    [tx]
  );

  return (
    <Container maxWidth="lg">
      <DashboardHero
        title={tx('pages.ielts.headline')}
        description={heroDescription}
        demoBadge={tx('pages.ielts.demo_badge')}
      />

      <ActivityHeatmap lang={currentLang.value} copy={heatmapCopy} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.analytics.stat_attempts')}
            value={String(MOCK_STATS.attempts)}
            icon="solar:clipboard-list-bold-duotone"
            colorKey="primary"
            hint={tx('pages.ielts.analytics.trend_positive', { value: MOCK_STATS.trendAttempts })}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.analytics.stat_band')}
            value={MOCK_STATS.band}
            icon="solar:medal-ribbon-star-bold-duotone"
            colorKey="info"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.analytics.stat_streak')}
            value={String(MOCK_STATS.streak)}
            icon="solar:fire-bold-duotone"
            colorKey="warning"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.analytics.stat_week')}
            value={String(MOCK_STATS.weekMinutes)}
            icon="solar:clock-circle-bold-duotone"
            colorKey="success"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <SkillsProgressCard title={tx('pages.ielts.analytics.skills_title')} rows={skillRows} />
        </Grid>
        <Grid item xs={12} md={5}>
          <RecentActivityCard title={tx('pages.ielts.analytics.activity_title')} lines={activities} />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        {tx('pages.ielts.modules_title')}
      </Typography>
      <Grid container spacing={3}>
        {modules.map((m) => (
          <Grid key={m.title} item xs={12} md={4}>
            <ModuleCard {...m} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
