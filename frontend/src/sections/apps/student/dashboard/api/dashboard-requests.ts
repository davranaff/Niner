import { request } from 'src/utils/axios';

import type {
  BackendOffsetPage,
  DashboardActivityResponse,
  DashboardHistoryAttemptResponse,
  DashboardModule,
  DashboardQuickLinksResponse,
  DashboardStatsResponse,
} from './types';

const dashboardUrls = {
  activity: '/api/v1/dashboard/activity',
  stats: '/api/v1/dashboard/stats',
  history: '/api/v1/dashboard/history',
  quickLinks: '/api/v1/dashboard/quick-links',
} as const;

export function fetchDashboardActivity(year: number, modules?: DashboardModule[]) {
  const params = new URLSearchParams();
  params.set('year', String(year));

  if (modules?.length) {
    modules.forEach((module) => {
      params.append('modules', module);
    });
  }

  return request<DashboardActivityResponse>({
    method: 'GET',
    url: dashboardUrls.activity,
    params,
  });
}

export function fetchDashboardStats() {
  return request<DashboardStatsResponse>({
    method: 'GET',
    url: dashboardUrls.stats,
  });
}

export function fetchDashboardHistory(limit: number, offset = 0) {
  return request<BackendOffsetPage<DashboardHistoryAttemptResponse>>({
    method: 'GET',
    url: dashboardUrls.history,
    params: { limit, offset },
  });
}

export function fetchDashboardQuickLinks() {
  return request<DashboardQuickLinksResponse>({
    method: 'GET',
    url: dashboardUrls.quickLinks,
  });
}
