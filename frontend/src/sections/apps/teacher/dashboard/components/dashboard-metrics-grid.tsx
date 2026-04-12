// @mui
import Grid from '@mui/material/Grid';
// locales
import { useLocales } from 'src/locales';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
// components
import { MetricCard } from 'src/pages/components/apps';
// types
import type { TeacherDashboardData } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type DashboardMetricsGridProps = {
  data: TeacherDashboardData;
};

export function DashboardMetricsGrid({ data }: DashboardMetricsGridProps) {
  const { tx } = useLocales();

  return (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.teacher.total_students')}
          value={String(data.totalStudents)}
          icon="solar:users-group-rounded-bold-duotone"
          color="primary"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.teacher.active_students')}
          value={String(data.activeStudents)}
          icon="solar:bolt-bold-duotone"
          color="success"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.teacher.average_band')}
          value={formatRoundedBand(data.averageOverallBand)}
          icon="solar:medal-ribbon-star-bold-duotone"
          color="info"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.teacher.integrity_alerts')}
          value={String(data.integrityAlerts.length)}
          icon="solar:shield-warning-bold-duotone"
          color="warning"
        />
      </Grid>
    </Grid>
  );
}
