import { useMemo, useState } from 'react';
import { format } from 'date-fns';
// @mui
import { alpha, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
// components
import Iconify from 'src/components/iconify';
//
import { HEATMAP_WEEK_COUNT, HEATMAP_YEAR_OPTIONS } from '../constants';
import {
  buildHeatmapModel,
  cellDateForIndex,
  getHeatmapMonthLabels,
  resolveHeatmapDateLocale,
  type HeatmapLevel,
} from '../utils/heatmap-mock';

// ----------------------------------------------------------------------

const CELL = 11;
const GAP = 3;
type ActivityHeatmapProps = {
  lang: string;
  copy: {
    summary: (count: number) => string;
    settingsLabel: string;
    less: string;
    more: string;
    learn: string;
    rowMon: string;
    rowWed: string;
    rowFri: string;
    cellEmpty: (date: string) => string;
    cellActive: (date: string, minutes: number) => string;
  };
};

const LEVEL_ALPHA: Record<Exclude<HeatmapLevel, 0>, number> = {
  1: 0.32,
  2: 0.5,
  3: 0.72,
  4: 1,
};

function levelColor(level: HeatmapLevel, theme: Theme) {
  if (level === 0) {
    const a = theme.palette.mode === 'dark' ? 0.14 : 0.18;
    return alpha(theme.palette.grey[500], a);
  }
  return alpha(theme.palette.success.main, LEVEL_ALPHA[level]);
}

function dayGutterLabel(di: number, copy: ActivityHeatmapProps['copy']) {
  if (di === 1) return copy.rowMon;
  if (di === 3) return copy.rowWed;
  if (di === 5) return copy.rowFri;
  return '';
}

function anchorForYear(year: number): Date {
  const now = new Date();
  if (year === now.getFullYear()) {
    return now;
  }
  return new Date(year, 11, 31, 12, 0, 0, 0);
}

export function ActivityHeatmap({ lang, copy }: ActivityHeatmapProps) {
  const theme = useTheme();
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const locale = resolveHeatmapDateLocale(lang);

  const { columns, oldestSunday, activeDays } = useMemo(() => {
    const anchor = anchorForYear(year);
    const seed = year * 11003 + HEATMAP_WEEK_COUNT;
    return buildHeatmapModel(anchor, HEATMAP_WEEK_COUNT, seed);
  }, [year]);

  const monthLabels = useMemo(
    () => getHeatmapMonthLabels(oldestSunday, HEATMAP_WEEK_COUNT, lang),
    [oldestSunday, lang]
  );

  return (
    <Card
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        mb: 3,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        justifyContent="space-between"
      >
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={1}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {copy.summary(activeDays)}
            </Typography>
            <Button
              size="small"
              color="inherit"
              aria-label={copy.settingsLabel}
              endIcon={<Iconify icon="solar:alt-arrow-down-bold" width={16} />}
              sx={{
                color: 'text.secondary',
                textTransform: 'none',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {copy.settingsLabel}
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Stack sx={{ width: 36, flexShrink: 0 }}>
              <Box sx={{ height: 20 }} />
              <Stack spacing={`${GAP}px`}>
                {[0, 1, 2, 3, 4, 5, 6].map((di) => (
                  <Box
                    key={di}
                    sx={{
                      height: CELL,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      pr: 0.25,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
                      {dayGutterLabel(di, copy)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>

            <Box sx={{ flex: 1, minWidth: 0, overflowX: 'auto', pb: 0.5 }}>
              <Box
                sx={{
                  position: 'relative',
                  height: 20,
                  minWidth: HEATMAP_WEEK_COUNT * (CELL + GAP),
                }}
              >
                {monthLabels.map(({ col, label }) => (
                  <Typography
                    key={`${col}-${label}`}
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      left: col * (CELL + GAP),
                      top: 0,
                      fontSize: 10,
                      color: 'text.disabled',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </Typography>
                ))}
              </Box>

              <Stack
                direction="row"
                spacing={`${GAP}px`}
                sx={{ minWidth: HEATMAP_WEEK_COUNT * (CELL + GAP) }}
              >
                {columns.map((col, wi) => (
                  <Stack key={wi} spacing={`${GAP}px`}>
                    {col.map((level, di) => {
                      const d = cellDateForIndex(oldestSunday, wi, di);
                      const dateStr = format(d, 'd MMM yyyy', { locale });
                      const minutes = level > 0 ? 12 + level * 22 + ((wi + di) % 9) * 3 : 0;
                      const title =
                        level === 0 ? copy.cellEmpty(dateStr) : copy.cellActive(dateStr, minutes);
                      return (
                        <Tooltip key={di} title={title} enterTouchDelay={0}>
                          <Box
                            component="span"
                            sx={{
                              width: CELL,
                              height: CELL,
                              borderRadius: 0.5,
                              bgcolor: levelColor(level, theme),
                              border: (t) =>
                                `1px solid ${alpha(
                                  t.palette.divider,
                                  t.palette.mode === 'dark' ? 0.35 : 0.6
                                )}`,
                              display: 'block',
                              flexShrink: 0,
                              cursor: 'default',
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Typography
              component="button"
              type="button"
              variant="caption"
              onClick={(e) => e.preventDefault()}
              sx={{
                border: 'none',
                background: 'none',
                p: 0,
                cursor: 'pointer',
                color: 'primary.main',
                textAlign: 'left',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {copy.learn}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {copy.less}
              </Typography>
              <Stack direction="row" spacing="3px" alignItems="center">
                {([0, 1, 2, 3, 4] as const).map((lv) => (
                  <Box
                    key={lv}
                    sx={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 0.5,
                      bgcolor: levelColor(lv, theme),
                      border: (t) =>
                        `1px solid ${alpha(
                          t.palette.divider,
                          t.palette.mode === 'dark' ? 0.35 : 0.6
                        )}`,
                    }}
                  />
                ))}
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {copy.more}
              </Typography>
            </Stack>
          </Stack>
        </Stack>

        <Stack
          spacing={0.5}
          sx={{
            flexShrink: 0,
            alignSelf: { xs: 'flex-start', md: 'stretch' },
            minWidth: 72,
          }}
        >
          {HEATMAP_YEAR_OPTIONS.map((y) => (
            <Button
              key={y}
              size="small"
              onClick={() => setYear(y)}
              variant={year === y ? 'contained' : 'text'}
              color={year === y ? 'primary' : 'inherit'}
              sx={{
                minWidth: 72,
                justifyContent: 'center',
                fontWeight: year === y ? 700 : 500,
                color: year === y ? 'primary.contrastText' : 'text.secondary',
              }}
            >
              {y}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
