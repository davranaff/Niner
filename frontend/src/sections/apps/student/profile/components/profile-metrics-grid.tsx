// @mui
import Grid from '@mui/material/Grid';
// locales
import { useLocales } from 'src/locales';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
// components
import { MetricCard } from 'src/pages/components/apps';
// types
import type { StudentProfileData } from '../api/types';

// ----------------------------------------------------------------------

type ProfileMetricsGridProps = {
  data: StudentProfileData;
};

export function ProfileMetricsGrid({ data }: ProfileMetricsGridProps) {
  const { tx } = useLocales();

  return (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.profile.current_band')}
          value={formatRoundedBand(data.estimatedOverallBand)}
          icon="solar:medal-ribbon-star-bold-duotone"
          color="primary"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.dashboard.total_attempts')}
          value={String(data.totalAttempts)}
          icon="solar:clipboard-list-bold-duotone"
          color="info"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.dashboard.streak')}
          value={String(data.studyStreak)}
          icon="solar:fire-bold-duotone"
          color="warning"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.dashboard.study_minutes')}
          value={String(data.weeklyStudyMinutes)}
          icon="solar:clock-circle-bold-duotone"
          color="success"
        />
      </Grid>
    </Grid>
  );
}
