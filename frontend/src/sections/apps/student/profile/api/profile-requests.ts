import { request } from 'src/utils/axios';

import type {
  BackendDashboardStatsResponse,
  BackendProfileAttemptsPage,
  BackendProfileResponse,
} from './types';

const profileUrls = {
  profile: '/api/v1/profile',
  dashboardStats: '/api/v1/dashboard/stats',
  myTests: '/api/v1/exams/my-tests',
} as const;

export function fetchStudentProfile() {
  return request<BackendProfileResponse>({
    method: 'GET',
    url: profileUrls.profile,
  });
}

export function fetchStudentProfileStats() {
  return request<BackendDashboardStatsResponse>({
    method: 'GET',
    url: profileUrls.dashboardStats,
  });
}

export function fetchStudentProfileRecentAttempts(limit = 4, offset = 0) {
  return request<BackendProfileAttemptsPage>({
    method: 'GET',
    url: profileUrls.myTests,
    params: {
      limit,
      offset,
      ordering: '-updated_at',
    },
  });
}

