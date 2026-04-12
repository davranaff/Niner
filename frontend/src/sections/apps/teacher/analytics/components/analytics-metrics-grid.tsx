// @mui
import Grid from '@mui/material/Grid';
// locales
import { useLocales } from 'src/locales';
// components
import { MetricCard } from 'src/pages/components/apps';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
// types
import type { TeacherAnalyticsData } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type AnalyticsMetricsGridProps = {
  data: TeacherAnalyticsData;
};

export function AnalyticsMetricsGrid({ data }: AnalyticsMetricsGridProps) {
  const { tx } = useLocales();

  return (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.teacher.average_band')}
          value={formatRoundedBand(data.averageOverallBand)}
          icon="solar:medal-ribbon-star-bold-duotone"
          color="primary"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.reading.title')}
          value={formatRoundedBand(data.averageModuleBands.reading)}
          icon="solar:book-bold-duotone"
          color="info"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.listening.title')}
          value={formatRoundedBand(data.averageModuleBands.listening)}
          icon="solar:headphones-round-bold-duotone"
          color="success"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <MetricCard
          label={tx('pages.ielts.writing.title')}
          value={formatRoundedBand(data.averageModuleBands.writing)}
          icon="solar:pen-bold-duotone"
          color="warning"
        />
      </Grid>
    </Grid>
  );
}
