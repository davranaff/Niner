import { useMemo, useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Iconify from 'src/components/iconify';
import { useAppUserProfile } from 'src/hooks/use-app-user-profile';
import { useLocales } from 'src/locales';
import { RouterLink } from 'src/routes/components';
import { fDate } from 'src/utils/format-time';
import { getModuleAttemptPath } from 'src/sections/apps/common/module-test/utils/module-meta';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';

import { ActivityHeatmap, DashboardHero, StatMiniCard } from './components';
import type { DashboardModule, DashboardQuickLink } from './api/types';
import {
  useStudentDashboardActivityQuery,
  useStudentDashboardHistoryQuery,
  useStudentDashboardQuickLinksQuery,
  useStudentDashboardStatsQuery,
} from './api/use-student-dashboard-api';
import { AppsDashboardSkeleton } from './skeleton';

type DashboardTranslate = (key: string, options?: Record<string, string | number>) => string;
const DASHBOARD_MODULE_ORDER: DashboardModule[] = ['reading', 'listening', 'writing', 'speaking'];

type PaletteColorKey = 'primary' | 'info' | 'success' | 'warning';

function moduleVisual(module: DashboardModule): { icon: string; colorKey: PaletteColorKey } {
  if (module === 'reading') {
    return { icon: 'solar:book-bold-duotone', colorKey: 'primary' };
  }
  if (module === 'listening') {
    return { icon: 'solar:headphones-round-bold-duotone', colorKey: 'success' };
  }
  if (module === 'writing') {
    return { icon: 'solar:pen-bold-duotone', colorKey: 'info' };
  }
  return { icon: 'solar:microphone-3-bold-duotone', colorKey: 'warning' };
}

function quickLinkVisual(link: DashboardQuickLink) {
  if (link.module) {
    return moduleVisual(link.module);
  }
  return { icon: 'solar:user-rounded-bold-duotone', colorKey: 'primary' as const };
}

function bandChipColor(score: number | null): 'success' | 'info' | 'warning' | 'error' {
  if (score == null) return 'info';
  if (score >= 7) return 'success';
  if (score >= 6) return 'info';
  if (score >= 5) return 'warning';
  return 'error';
}

function resolveBandChipLabel(
  score: number | null,
  status: 'in_progress' | 'completed' | 'terminated',
  finishReason: string | null,
  translate: DashboardTranslate
) {
  if (score != null) {
    return formatRoundedBand(score);
  }
  if (status === 'in_progress') {
    return translate('pages.ielts.shared.status_in_progress');
  }
  if (finishReason === 'left' || finishReason === 'time_is_up') {
    return translate(`pages.ielts.shared.finish_${finishReason}`);
  }
  return '-';
}

function attemptResultPath(module: DashboardModule, attemptId: number): string | null {
  if (module === 'speaking') {
    return null;
  }
  return getModuleAttemptPath(module, String(attemptId));
}

function currentYear() {
  return new Date().getFullYear();
}

function moduleLabel(module: DashboardModule, translate: DashboardTranslate) {
  if (module === 'speaking') {
    return translate('layout.nav.speaking');
  }

  return translate(`pages.ielts.${module}.title`);
}

function quickLinkLabel(link: DashboardQuickLink, translate: DashboardTranslate) {
  if (link.module) {
    if (link.module === 'speaking') {
      return translate('layout.nav.speaking');
    }

    return translate(`layout.nav.${link.module}`);
  }

  if (link.path === '/dashboard/profile') {
    return translate('layout.nav.profile');
  }

  return link.label;
}

export default function AppsDashboardView() {
  const theme = useTheme();
  const { tx, currentLang } = useLocales();
  const { user } = useAppUserProfile();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedModules, setSelectedModules] = useState<DashboardModule[]>(DASHBOARD_MODULE_ORDER);

  const statsQuery = useStudentDashboardStatsQuery();
  const activityQuery = useStudentDashboardActivityQuery(selectedYear, selectedModules);
  const historyQuery = useStudentDashboardHistoryQuery(4, 0);
  const quickLinksQuery = useStudentDashboardQuickLinksQuery();

  const heatmapCopy = useMemo(
    () => ({
      summary: (count: number) => String(tx('pages.ielts.analytics.heatmap_summary', { count })),
      settingsLabel: String(tx('pages.ielts.analytics.heatmap_settings')),
      less: String(tx('pages.ielts.analytics.heatmap_less')),
      more: String(tx('pages.ielts.analytics.heatmap_more')),
      rowMon: String(tx('pages.ielts.analytics.heatmap_row_mon')),
      rowWed: String(tx('pages.ielts.analytics.heatmap_row_wed')),
      rowFri: String(tx('pages.ielts.analytics.heatmap_row_fri')),
      cellEmpty: (date: string) => String(tx('pages.ielts.analytics.heatmap_cell_empty', { date })),
      cellActive: (date: string, minutes: number) =>
        String(tx('pages.ielts.analytics.heatmap_cell_active', { date, minutes })),
    }),
    [tx]
  );

  const loading =
    statsQuery.isLoading ||
    activityQuery.isLoading ||
    historyQuery.isLoading ||
    quickLinksQuery.isLoading;

  if (
    loading ||
    !statsQuery.data ||
    !activityQuery.data ||
    !historyQuery.data ||
    !quickLinksQuery.data
  ) {
    return <AppsDashboardSkeleton />;
  }

  const studentName = user.displayName || user.email || 'Student';
  const isSelectedActivityLoaded = activityQuery.data.year === selectedYear && !activityQuery.isFetching;
  const internalQuickLinks = quickLinksQuery.data.filter((item) => item.path.startsWith('/'));
  const moduleQuickLinks = internalQuickLinks.filter(
    (item): item is DashboardQuickLink & { module: DashboardModule } => Boolean(item.module)
  );
  const strongestModuleLink = moduleQuickLinks.reduce<(typeof moduleQuickLinks)[number] | null>(
    (best, item) => {
      if (!best) {
        return item;
      }
      if (item.successfulAttemptsCount > best.successfulAttemptsCount) {
        return item;
      }
      if (
        item.successfulAttemptsCount === best.successfulAttemptsCount &&
        item.attemptsCount > best.attemptsCount
      ) {
        return item;
      }
      return best;
    },
    null
  );
  const weakestModuleLink = moduleQuickLinks.reduce<(typeof moduleQuickLinks)[number] | null>(
    (best, item) => {
      if (!best) {
        return item;
      }
      if (item.failedAttemptsCount > best.failedAttemptsCount) {
        return item;
      }
      if (item.failedAttemptsCount === best.failedAttemptsCount && item.attemptsCount > best.attemptsCount) {
        return item;
      }
      return best;
    },
    null
  );
  const strongestAreaLabel = strongestModuleLink?.module
    ? moduleLabel(strongestModuleLink.module, tx)
    : '-';
  const weakestAreaLabel = weakestModuleLink?.module ? moduleLabel(weakestModuleLink.module, tx) : '-';
  const recommendedPath = weakestModuleLink?.path || '/dashboard/my-tests';

  return (
    <Container maxWidth="lg">
      <DashboardHero
        title={tx('layout.nav.dashboard')}
        description={tx('pages.ielts.dashboard.subtitle', {
          name: studentName,
          band: formatRoundedBand(statsQuery.data.estimatedOverallBand),
        })}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.dashboard.estimated_band')}
            value={formatRoundedBand(statsQuery.data.estimatedOverallBand)}
            icon="solar:medal-ribbon-star-bold-duotone"
            colorKey="primary"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.dashboard.total_attempts')}
            value={String(statsQuery.data.totalAttempts)}
            icon="solar:clipboard-list-bold-duotone"
            colorKey="info"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.dashboard.study_minutes')}
            value={String(statsQuery.data.weeklyStudyMinutes)}
            icon="solar:clock-circle-bold-duotone"
            colorKey="success"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatMiniCard
            label={tx('pages.ielts.dashboard.streak')}
            value={String(statsQuery.data.currentStreak)}
            icon="solar:fire-bold-duotone"
            colorKey="warning"
          />
        </Grid>
      </Grid>

      <ActivityHeatmap
        lang={currentLang.value}
        year={selectedYear}
        availableYears={activityQuery.data.availableYears}
        availableModules={
          activityQuery.data.availableModules.length
            ? activityQuery.data.availableModules
            : DASHBOARD_MODULE_ORDER
        }
        selectedModules={selectedModules}
        onModulesChange={setSelectedModules}
        allModulesLabel={tx('pages.ielts.shared.all_modules')}
        moduleLabel={(module) => moduleLabel(module, tx)}
        practiceDays={isSelectedActivityLoaded ? activityQuery.data.practiceDays : 0}
        days={isSelectedActivityLoaded ? activityQuery.data.days : []}
        onYearChange={setSelectedYear}
        copy={heatmapCopy}
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card
            variant="outlined"
            sx={{
              p: 3,
              height: 1,
              borderColor: alpha(theme.palette.info.main, 0.22),
              bgcolor: alpha(theme.palette.info.main, 0.04),
            }}
          >
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={1}
              >
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {tx('pages.ielts.dashboard.recommended_next')}
                  </Typography>
                  <Typography variant="h6">
                    {weakestModuleLink?.module ? moduleLabel(weakestModuleLink.module, tx) : tx('pages.ielts.dashboard.empty_attempts')}
                  </Typography>
                </Stack>

                <Button
                  component={RouterLink}
                  href={recommendedPath}
                  size="small"
                  color="inherit"
                  variant="outlined"
                  startIcon={<Iconify icon="solar:alt-arrow-right-linear" width={16} />}
                  sx={{ textTransform: 'none' }}
                >
                  {tx('pages.ielts.shared.details')}
                </Button>
              </Stack>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {`${tx('pages.ielts.dashboard.strongest_area')}: ${strongestAreaLabel} · ${tx('pages.ielts.dashboard.weakest_area')}: ${weakestAreaLabel}`}
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={1}
              >
                <Chip
                  size="small"
                  variant="outlined"
                  color="success"
                  label={`${tx('pages.ielts.shared.attempts')}: ${statsQuery.data.totalAttempts}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  color="info"
                  label={`${tx('pages.ielts.dashboard.study_minutes')}: ${statsQuery.data.weeklyStudyMinutes}`}
                />
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined" sx={{ p: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.dashboard.recent_attempts')}
              </Typography>
              <Chip size="small" label={historyQuery.data.length} variant="outlined" />
            </Stack>
            <Stack spacing={1.5}>
              {historyQuery.data.length ? (
                historyQuery.data.map((item) => {
                  const attemptVisual = moduleVisual(item.testType);
                  const resultPath = attemptResultPath(item.testType, item.id);

                  return (
                    <Box
                      key={item.id}
                      sx={{
                        p: 1.75,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.background.neutral, 0.2),
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.5}
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: alpha(theme.palette[attemptVisual.colorKey].main, 0.14),
                              color: `${attemptVisual.colorKey}.main`,
                            }}
                          >
                            <Iconify icon={attemptVisual.icon} width={18} />
                          </Avatar>

                          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap>
                              {item.title}
                            </Typography>

                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                              <Chip
                                size="small"
                                label={moduleLabel(item.testType, tx)}
                                variant="outlined"
                                sx={{ height: 22 }}
                              />
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {fDate(item.testDate)}
                              </Typography>
                              {item.timeTakenSeconds != null && item.timeTakenSeconds > 0 ? (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {`${tx('pages.ielts.shared.time_spent')}: ${Math.round(
                                    item.timeTakenSeconds / 60
                                  )}m`}
                                </Typography>
                              ) : null}
                            </Stack>
                          </Stack>
                        </Stack>

                        <Stack spacing={0.5} alignItems="flex-end">
                          <Chip
                            label={resolveBandChipLabel(
                              item.bandScore,
                              item.status,
                              item.finishReason,
                              tx
                            )}
                            color={bandChipColor(item.bandScore)}
                            sx={{ minWidth: 56, fontWeight: 700 }}
                          />
                          {resultPath ? (
                            <Button
                              component={RouterLink}
                              href={resultPath}
                              color="inherit"
                              size="small"
                              sx={{ textTransform: 'none', minWidth: 0, px: 0.5 }}
                            >
                              {tx('pages.ielts.shared.open_result')}
                            </Button>
                          ) : null}
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })
              ) : (
                <Stack spacing={1} alignItems="center" sx={{ py: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.12),
                      color: 'info.main',
                    }}
                  >
                    <Iconify icon="solar:clipboard-list-bold-duotone" width={20} />
                  </Avatar>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {tx('pages.ielts.dashboard.empty_attempts')}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={1.5} sx={{ height: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {tx('pages.ielts.dashboard.quick_links')}
                </Typography>
                <Chip size="small" label={internalQuickLinks.length} variant="outlined" />
              </Stack>
              <Stack spacing={1.25}>
                {internalQuickLinks.length ? (
                  internalQuickLinks.map((item) => {
                    const linkVisual = quickLinkVisual(item);
                    const quickStatsLabel = `${tx('pages.ielts.shared.attempts')}: ${item.attemptsCount} · ${tx('pages.ielts.shared.review_correct')}: ${item.successfulAttemptsCount} · ${tx('pages.ielts.shared.review_incorrect')}: ${item.failedAttemptsCount}`;

                    return (
                      <Button
                        key={`${item.path}-${item.label}`}
                        component={RouterLink}
                        href={item.path}
                        color="inherit"
                        sx={{
                          width: 1,
                          borderRadius: 2,
                          p: 1.5,
                          textTransform: 'none',
                          justifyContent: 'space-between',
                          border: `1px solid ${alpha(theme.palette[linkVisual.colorKey].main, 0.2)}`,
                          bgcolor: alpha(theme.palette[linkVisual.colorKey].main, 0.05),
                          transition: theme.transitions.create(['transform', 'background-color'], {
                            duration: theme.transitions.duration.shorter,
                          }),
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            bgcolor: alpha(theme.palette[linkVisual.colorKey].main, 0.1),
                          },
                        }}
                      >
                        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                          <Avatar
                            sx={{
                              width: 34,
                              height: 34,
                              bgcolor: alpha(theme.palette[linkVisual.colorKey].main, 0.14),
                              color: `${linkVisual.colorKey}.main`,
                            }}
                          >
                            <Iconify icon={linkVisual.icon} width={18} />
                          </Avatar>
                          <Stack spacing={0.25} sx={{ minWidth: 0, textAlign: 'left' }}>
                            <Typography variant="subtitle2" noWrap>
                              {quickLinkLabel(item, tx)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                              {quickStatsLabel}
                            </Typography>
                          </Stack>
                        </Stack>
                        <Iconify icon="solar:alt-arrow-right-linear" width={16} />
                      </Button>
                    );
                  })
                ) : (
                  <Stack spacing={1} alignItems="center" sx={{ py: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: 'primary.main',
                      }}
                    >
                      <Iconify icon="solar:link-round-angle-bold-duotone" width={20} />
                    </Avatar>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {tx('pages.ielts.dashboard.empty_quick_links')}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
