/* eslint-disable import/no-duplicates --
 * `date-fns` and `date-fns/locale` share typings; plugin flags both as duplicate.
 */
import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';

// ----------------------------------------------------------------------

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

const HEATMAP_DATE_FNS_LOCALES = {
  en: enUS,
  ru,
  uz: enUS,
} as const;

export function resolveHeatmapDateLocale(lang: string) {
  return HEATMAP_DATE_FNS_LOCALES[lang as keyof typeof HEATMAP_DATE_FNS_LOCALES] ?? enUS;
}

/** Park–Miller LCG — deterministic, no bitwise ops (eslint-friendly). */
function createSeededRandom(seed: number) {
  let state = Math.abs(Math.floor(seed)) % 2147483646;
  if (state === 0) {
    state = 2147483645;
  }
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Rolling year of weeks ending at `anchor` (inclusive), GitHub-style (columns = weeks, rows = Sun–Sat). */
export function buildHeatmapModel(
  anchor: Date,
  weekCount: number,
  seed: number
): {
  columns: HeatmapLevel[][];
  oldestSunday: Date;
  activeDays: number;
} {
  const rnd = createSeededRandom(seed);
  const anchorDay = new Date(anchor);
  anchorDay.setHours(12, 0, 0, 0);
  const effectiveToday = endOfDay(anchorDay);

  const lastSunday = startOfWeek(anchorDay, { weekStartsOn: 0 });
  const oldestSunday = subWeeks(lastSunday, weekCount - 1);

  const columns: HeatmapLevel[][] = [];
  let activeDays = 0;

  for (let c = 0; c < weekCount; c += 1) {
    const weekSunday = addWeeks(oldestSunday, c);
    const col: HeatmapLevel[] = [];
    for (let d = 0; d < 7; d += 1) {
      const cellDate = addDays(weekSunday, d);
      cellDate.setHours(12, 0, 0, 0);
      if (cellDate > effectiveToday) {
        col.push(0);
      } else {
        const r = rnd();
        let level: HeatmapLevel = 0;
        if (r > 0.52) level = 1;
        if (r > 0.7) level = 2;
        if (r > 0.82) level = 3;
        if (r > 0.92) level = 4;
        if (level > 0) activeDays += 1;
        col.push(level);
      }
    }
    columns.push(col);
  }

  return { columns, oldestSunday, activeDays };
}

export function getHeatmapMonthLabels(
  oldestSunday: Date,
  weekCount: number,
  lang: string
): { col: number; label: string }[] {
  const locale = resolveHeatmapDateLocale(lang);
  const labels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let c = 0; c < weekCount; c += 1) {
    const d = addWeeks(oldestSunday, c);
    if (d.getMonth() !== lastMonth) {
      labels.push({ col: c, label: format(d, 'LLL', { locale }) });
      lastMonth = d.getMonth();
    }
  }
  return labels;
}

export function cellDateForIndex(oldestSunday: Date, weekIndex: number, dayIndex: number) {
  return addDays(addWeeks(oldestSunday, weekIndex), dayIndex);
}
