// @mui
import Grid from '@mui/material/Grid';
// locales
import { useLocales } from 'src/locales';
// utils
import { fDate } from 'src/utils/format-time';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
// components
import { MetricCard } from 'src/pages/components/apps';
// types
import type { TeacherStudentDetailsData } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type StudentMetricsGridProps = {
  data: TeacherStudentDetailsData;
};

export function StudentMetricsGrid({ data }: StudentMetricsGridProps) {
  const { tx } = useLocales();

  return (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.teacher.latest_band')}
          value={formatRoundedBand(data.analytics.latestBand)}
          icon="solar:medal-ribbon-star-bold-duotone"
          color="primary"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.shared.attempts')}
          value={String(data.analytics.attemptsCount)}
          icon="solar:clipboard-list-bold-duotone"
          color="info"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.teacher.integrity')}
          value={
            data.analytics.integrityFlag
              ? tx('pages.ielts.teacher.integrity_flagged')
              : tx('pages.ielts.teacher.integrity_clear')
          }
          icon="solar:shield-warning-bold-duotone"
          color={data.analytics.integrityFlag ? 'error' : 'success'}
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.teacher.last_activity')}
          value={fDate(data.analytics.lastActivity)}
          icon="solar:calendar-bold-duotone"
          color="warning"
        />
      </Grid>
    </Grid>
  );
}
