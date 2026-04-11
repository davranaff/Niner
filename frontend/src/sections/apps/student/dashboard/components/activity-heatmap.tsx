import { useMemo } from 'react';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
// @mui
import { alpha, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { DashboardActivityDay, DashboardModule } from '../api/types';
import { getHeatmapMonthLabels, resolveHeatmapDateLocale, type HeatmapLevel } from '../utils/heatmap-mock';

// ----------------------------------------------------------------------

const CELL = 11;
const GAP = 3;
const ALL_MODULES_VALUE = '__all_modules__';

type ActivityHeatmapProps = {
  lang: string;
  year: number;
  availableYears: number[];
  availableModules: DashboardModule[];
  selectedModules: DashboardModule[];
  onModulesChange: (modules: DashboardModule[]) => void;
  allModulesLabel: string;
  moduleLabel: (module: DashboardModule) => string;
  practiceDays: number;
  days: DashboardActivityDay[];
  onYearChange: (year: number) => void;
  copy: {
    summary: (count: number) => string;
    settingsLabel: string;
    less: string;
    more: string;
    rowMon: string;
    rowWed: string;
    rowFri: string;
    cellEmpty: (date: string) => string;
    cellActive: (date: string, minutes: number) => string;
  };
};

type HeatmapCell = {
  date: Date;
  level: HeatmapLevel;
  minutes: number;
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

function normalizeLevel(value: number): HeatmapLevel {
  if (value <= 0) return 0;
  if (value >= 4) return 4;
  return Math.round(value) as HeatmapLevel;
}

function dateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function resolveAvailableYears(year: number, availableYears: number[]) {
  if (!availableYears.length) {
    return [year];
  }

  const unique = Array.from(new Set(availableYears));
  return unique.sort((a, b) => b - a);
}

function orderedModules(modules: DashboardModule[]) {
  const order: DashboardModule[] = ['reading', 'listening', 'writing', 'speaking'];
  const unique = new Set(modules);
  return order.filter((module) => unique.has(module));
}

function modulesEqual(left: DashboardModule[], right: DashboardModule[]) {
  const leftOrdered = orderedModules(left);
  const rightOrdered = orderedModules(right);

  return (
    leftOrdered.length === rightOrdered.length &&
    leftOrdered.every((module, index) => module === rightOrdered[index])
  );
}

function buildHeatmapCells(year: number, days: DashboardActivityDay[]) {
  const dayMap = new Map(days.map((item) => [item.date, item]));

  const firstDay = new Date(year, 0, 1, 12, 0, 0, 0);
  const lastDay = new Date(year, 11, 31, 12, 0, 0, 0);
  const oldestSunday = startOfWeek(firstDay, { weekStartsOn: 0 });
  const lastSaturday = endOfWeek(lastDay, { weekStartsOn: 0 });

  const totalDays =
    Math.floor((lastSaturday.getTime() - oldestSunday.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const weekCount = Math.ceil(totalDays / 7);

  const columns: HeatmapCell[][] = Array.from({ length: weekCount }, (_week, wi) =>
    Array.from({ length: 7 }, (_day, di) => {
      const date = addDays(oldestSunday, wi * 7 + di);
      const inYear = date.getFullYear() === year;

      if (!inYear) {
        return {
          date,
          level: 0,
          minutes: 0,
        };
      }

      const payload = dayMap.get(dateKey(date));

      return {
        date,
        level: normalizeLevel(payload?.intensity ?? 0),
        minutes: payload?.totalMinutes ?? 0,
      };
    })
  );

  return {
    columns,
    oldestSunday,
    weekCount,
  };
}

export function ActivityHeatmap({
  lang,
  year,
  availableYears,
  availableModules,
  selectedModules,
  onModulesChange,
  allModulesLabel,
  moduleLabel,
  practiceDays,
  days,
  onYearChange,
  copy,
}: ActivityHeatmapProps) {
  const theme = useTheme();
  const locale = resolveHeatmapDateLocale(lang);

  const years = useMemo(() => resolveAvailableYears(year, availableYears), [year, availableYears]);
  const modules = useMemo(() => orderedModules(availableModules), [availableModules]);
  const selected = useMemo(() => orderedModules(selectedModules), [selectedModules]);
  const allModulesSelected = useMemo(() => modulesEqual(selected, modules), [selected, modules]);

  const { columns, oldestSunday, weekCount } = useMemo(
    () => buildHeatmapCells(year, days),
    [year, days]
  );

  const monthLabels = useMemo(
    () => getHeatmapMonthLabels(oldestSunday, weekCount, lang),
    [oldestSunday, weekCount, lang]
  );

  const handleModulesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const nextValues = typeof value === 'string' ? value.split(',') : value;

    if (nextValues.includes(ALL_MODULES_VALUE)) {
      onModulesChange(modules);
      return;
    }

    const nextModules = orderedModules(
      nextValues.filter((item): item is DashboardModule =>
        modules.includes(item as DashboardModule)
      )
    );

    onModulesChange(nextModules.length ? nextModules : modules);
  };

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
              {copy.summary(practiceDays)}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 210, flexShrink: 0 }}>
              <Select<string[]>
                multiple
                displayEmpty
                value={selected}
                onChange={handleModulesChange}
                input={<OutlinedInput />}
                aria-label={copy.settingsLabel}
                renderValue={(value) => {
                  const selectedValues = value as string[];
                  const selectedAsModules = orderedModules(
                    selectedValues.filter((item): item is DashboardModule =>
                      modules.includes(item as DashboardModule)
                    )
                  );

                  if (modulesEqual(selectedAsModules, modules)) {
                    return `${copy.settingsLabel}: ${allModulesLabel}`;
                  }

                  return `${copy.settingsLabel}: ${selectedAsModules
                    .map((module) => moduleLabel(module))
                    .join(', ')}`;
                }}
                MenuProps={{ PaperProps: { sx: { minWidth: 240 } } }}
              >
                <MenuItem value={ALL_MODULES_VALUE}>
                  <Checkbox checked={allModulesSelected} disableRipple size="small" />
                  <ListItemText primary={allModulesLabel} />
                </MenuItem>
                {modules.map((module) => (
                  <MenuItem key={module} value={module}>
                    <Checkbox checked={selected.includes(module)} disableRipple size="small" />
                    <ListItemText primary={moduleLabel(module)} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
                  minWidth: weekCount * (CELL + GAP),
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

              <Stack direction="row" spacing={`${GAP}px`} sx={{ minWidth: weekCount * (CELL + GAP) }}>
                {columns.map((col, wi) => (
                  <Stack key={wi} spacing={`${GAP}px`}>
                    {col.map((cell, di) => {
                      const dateStr = format(cell.date, 'd MMM yyyy', { locale });
                      const title =
                        cell.level === 0
                          ? copy.cellEmpty(dateStr)
                          : copy.cellActive(dateStr, cell.minutes);

                      return (
                        <Tooltip key={di} title={title} enterTouchDelay={0}>
                          <Box
                            component="span"
                            sx={{
                              width: CELL,
                              height: CELL,
                              borderRadius: 0.5,
                              bgcolor: levelColor(cell.level, theme),
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

          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
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
                        `1px solid ${alpha(t.palette.divider, t.palette.mode === 'dark' ? 0.35 : 0.6)}`,
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
          {years.map((itemYear) => (
            <Button
              key={itemYear}
              size="small"
              onClick={() => onYearChange(itemYear)}
              variant={year === itemYear ? 'contained' : 'text'}
              color={year === itemYear ? 'primary' : 'inherit'}
              sx={{
                minWidth: 72,
                justifyContent: 'center',
                fontWeight: year === itemYear ? 700 : 500,
                color: year === itemYear ? 'primary.contrastText' : 'text.secondary',
              }}
            >
              {itemYear}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
