import { useMemo } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { InsightListCard } from 'src/pages/components/apps';
import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';

import { useStudentDashboardQuery } from 'src/sections/apps/common/api/use-apps';
import { getModulePath } from 'src/sections/apps/common/module-test/utils/module-meta';
import {
  ActivityHeatmap,
  DashboardHero,
  ModuleCard,
  RecentActivityCard,
  SkillsProgressCard,
  StatMiniCard,
} from './components';
import { AppsDashboardSkeleton } from './skeleton';

function dashboardModuleMeta(module: string) {
  if (module === 'reading') {
    return {
      icon: 'solar:book-bold-duotone',
      colorKey: 'primary' as const,
    };
  }

  if (module === 'listening') {
    return {
      icon: 'solar:headphones-round-bold-duotone',
      colorKey: 'success' as const,
    };
  }

  if (module === 'writing') {
    return {
      icon: 'solar:pen-bold-duotone',
      colorKey: 'info' as const,
    };
  }

  return {
    icon: 'solar:microphone-3-bold-duotone',
    colorKey: 'warning' as const,
  };
}

export default function AppsDashboardView() {
  const { tx, currentLang } = useLocales();
  const dashboardQuery = useStudentDashboardQuery();

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

  if (dashboardQuery.isLoading || !dashboardQuery.data) {
    return <AppsDashboardSkeleton />;
  }

  const { data } = dashboardQuery;
  const skillRows = [
    {
      key: 'reading',
      label: tx('pages.ielts.reading.title'),
      pct: Math.round((data.moduleBands.reading / 9) * 100),
      barColor: '#2065D1',
    },
    {
      key: 'listening',
      label: tx('pages.ielts.listening.title'),
      pct: Math.round((data.moduleBands.listening / 9) * 100),
      barColor: '#00A76F',
    },
    {
      key: 'writing',
      label: tx('pages.ielts.writing.title'),
      pct: Math.round((data.moduleBands.writing / 9) * 100),
      barColor: '#FFA500',
    },
  ];

  const activities = data.recentActivity.map(
    (activity) => `${activity.title} · ${activity.description}`
  );

  return (
    <Container maxWidth="lg">
      <DashboardHero
        title={tx('pages.ielts.headline')}
        description={tx('pages.ielts.dashboard.subtitle', {
          name: data.student.name,
          band: data.estimatedOverallBand.toFixed(1),
        })}
        demoBadge={tx('pages.ielts.demo_badge')}
      />

      <ActivityHeatmap lang={currentLang.value} copy={heatmapCopy} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.dashboard.estimated_band')}
            value={data.estimatedOverallBand.toFixed(1)}
            icon="solar:medal-ribbon-star-bold-duotone"
            colorKey="primary"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.dashboard.total_attempts')}
            value={String(data.totalAttempts)}
            icon="solar:clipboard-list-bold-duotone"
            colorKey="info"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.dashboard.study_minutes')}
            value={String(data.weeklyStudyMinutes)}
            icon="solar:clock-circle-bold-duotone"
            colorKey="success"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.dashboard.streak')}
            value={String(data.currentStreak)}
            icon="solar:fire-bold-duotone"
            colorKey="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <SkillsProgressCard title={tx('pages.ielts.analytics.skills_title')} rows={skillRows} />
        </Grid>
        <Grid item xs={12} md={5}>
          <RecentActivityCard
            title={tx('pages.ielts.analytics.activity_title')}
            lines={activities}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <InsightListCard
            title={tx('pages.ielts.dashboard.recommended_next')}
            items={[data.recommendedNextStep]}
            emptyLabel="-"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <InsightListCard
            title={tx('pages.ielts.dashboard.strongest_area')}
            items={[tx(`pages.ielts.${data.strongestArea}.title`)]}
            emptyLabel="-"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <InsightListCard
            title={tx('pages.ielts.dashboard.weakest_area')}
            items={[tx(`pages.ielts.${data.weakestArea}.title`)]}
            emptyLabel="-"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
            {tx('pages.ielts.modules_title')}
          </Typography>
          <Grid container spacing={3}>
            {data.moduleCards.map((item) => (
              <Grid key={item.module} item xs={12} md={6}>
                {(() => {
                  const meta = dashboardModuleMeta(item.module);
                  let title = tx('layout.nav.speaking');
                  let description = tx('pages.ielts.dashboard.speaking_coming_soon');
                  let badgeLabel = tx('pages.ielts.shared.status_not_started');

                  if (item.module !== 'speaking') {
                    title = tx(`pages.ielts.${item.module}.title`);
                    description = tx(`pages.ielts.${item.module}.description`);
                  }

                  if (item.status === 'coming_soon') {
                    badgeLabel = tx('layout.nav.speaking_caption');
                  } else if (item.bestBand) {
                    badgeLabel = `${tx('pages.ielts.dashboard.best')} ${item.bestBand.toFixed(1)}`;
                  }

                  return (
                    <ModuleCard
                      title={title}
                      description={description}
                      icon={meta.icon}
                      colorKey={meta.colorKey}
                      href={item.module === 'speaking' ? undefined : getModulePath(item.module)}
                      actionLabel={
                        item.module === 'speaking'
                          ? undefined
                          : tx('pages.ielts.shared.open_module')
                      }
                      badgeLabel={badgeLabel}
                      disabled={item.status === 'coming_soon'}
                    />
                  );
                })()}
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ p: 3, height: 1 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.dashboard.plan_title')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {data.planSnapshot.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.dashboard.plan_attempts', {
                  used: data.planSnapshot.attemptsUsed,
                  limit: data.planSnapshot.attemptsLimit,
                })}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.dashboard.plan_renewal', {
                  date: new Date(data.planSnapshot.renewalDate).toLocaleDateString(),
                })}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.dashboard.plan_cta')}
              </Typography>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
              {tx('pages.ielts.dashboard.recent_attempts')}
            </Typography>
            <Stack spacing={1.5}>
              {data.recentAttempts.map((item) => (
                <Card key={item.attempt.id} variant="outlined" sx={{ p: 2.5 }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2">{item.test.title}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {tx(`pages.ielts.${item.attempt.module}.title`)} ·{' '}
                        {new Date(item.attempt.updatedAt).toLocaleDateString()}
                      </Typography>
                    </Stack>

                    <Typography variant="subtitle2">
                      {item.result
                        ? item.result.estimatedBand.toFixed(1)
                        : tx('pages.ielts.shared.status_in_progress')}
                    </Typography>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.dashboard.quick_links')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.dashboard.quick_links_description')}
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">{`• ${tx('layout.nav.reading')} → ${
                  paths.ielts.reading
                }`}</Typography>
                <Typography variant="body2">{`• ${tx('layout.nav.listening')} → ${
                  paths.ielts.listening
                }`}</Typography>
                <Typography variant="body2">{`• ${tx('layout.nav.writing')} → ${
                  paths.ielts.writing
                }`}</Typography>
                <Typography variant="body2">{`• ${tx('layout.nav.profile')} → ${
                  paths.ielts.profile
                }`}</Typography>
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
