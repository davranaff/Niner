import { keepPreviousData } from '@tanstack/react-query';

import { useFetch } from 'src/hooks/api';

import {
  fetchDashboardActivity,
  fetchDashboardHistory,
  fetchDashboardQuickLinks,
  fetchDashboardStats,
} from './dashboard-requests';
import type {
  DashboardActivity,
  DashboardHistoryAttempt,
  DashboardModule,
  DashboardQuickLink,
  DashboardStats,
} from './types';

const dashboardQueryRoot = ['student-dashboard-api'] as const;
const MODULE_ORDER: DashboardModule[] = ['reading', 'listening', 'writing', 'speaking'];

export const studentDashboardQueryKeys = {
  root: dashboardQueryRoot,
  stats: [...dashboardQueryRoot, 'stats'] as const,
  activity: (year: number, modules: DashboardModule[]) =>
    [...dashboardQueryRoot, 'activity', year, modules] as const,
  history: (limit: number, offset: number) =>
    [...dashboardQueryRoot, 'history', { limit, offset }] as const,
  quickLinks: [...dashboardQueryRoot, 'quick-links'] as const,
};

function toNumber(value: number | string | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampIntensity(value: number) {
  if (value <= 0) return 0;
  if (value >= 4) return 4;
  return Math.round(value);
}

function normalizeModules(modules: DashboardModule[]) {
  const unique = new Set(modules);
  return MODULE_ORDER.filter((module) => unique.has(module));
}

export function useStudentDashboardStatsQuery() {
  return useFetch<DashboardStats>(studentDashboardQueryKeys.stats, async () => {
    const response = await fetchDashboardStats();

    return {
      estimatedOverallBand: toNumber(response.predictedOverallBand),
      totalAttempts: Math.max(0, response.totalAttempts),
      weeklyStudyMinutes: Math.max(0, response.minutesThisWeek),
      currentStreak: Math.max(0, response.currentStreak),
    };
  });
}

export function useStudentDashboardActivityQuery(year: number, modules: DashboardModule[]) {
  const normalizedModules = normalizeModules(modules);

  return useFetch<DashboardActivity>(
    studentDashboardQueryKeys.activity(year, normalizedModules),
    async () => {
      const response = await fetchDashboardActivity(year, normalizedModules);
      const availableYears = Array.from(new Set(response.settings.availableYears)).sort((a, b) => b - a);

      return {
        year: response.year,
        availableYears,
        availableModules: normalizeModules(response.settings.availableModules),
        selectedModules: normalizeModules(response.settings.selectedModules),
        practiceDays: Math.max(0, response.summary.practiceDays),
        days: response.days.map((item) => ({
          date: item.date,
          attempts: Math.max(0, item.attempts),
          totalMinutes: Math.max(0, item.totalMinutes),
          intensity: clampIntensity(item.intensity),
        })),
      };
    },
    {
      placeholderData: keepPreviousData,
      enabled: Number.isFinite(year),
    }
  );
}

export function useStudentDashboardHistoryQuery(limit = 4, offset = 0) {
  return useFetch<DashboardHistoryAttempt[]>(studentDashboardQueryKeys.history(limit, offset), async () => {
    const response = await fetchDashboardHistory(limit, offset);

    return response.items.map((item) => ({
      id: item.id,
      title: item.title,
      testDate: item.testDate,
      testType: item.testType,
      bandScore: toNumber(item.bandScore),
      timeTakenSeconds: Math.max(0, item.timeTakenSeconds ?? 0),
    }));
  });
}

export function useStudentDashboardQuickLinksQuery() {
  return useFetch<DashboardQuickLink[]>(studentDashboardQueryKeys.quickLinks, async () => {
    const response = await fetchDashboardQuickLinks();

    return response.items;
  });
}
