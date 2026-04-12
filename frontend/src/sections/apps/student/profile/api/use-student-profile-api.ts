import { useFetch } from 'src/hooks/api';
import { useAppUserProfile } from 'src/hooks/use-app-user-profile';

import {
  fetchStudentProfile,
  fetchStudentProfileRecentAttempts,
  fetchStudentProfileStats,
} from './profile-requests';
import type { BackendProfileAttemptItem, StudentProfileData } from './types';

const studentProfileQueryRoot = ['student-profile-api'] as const;

export const studentProfileQueryKeys = {
  root: studentProfileQueryRoot,
  data: (userId: string, email: string) => [...studentProfileQueryRoot, 'data', userId, email] as const,
};

function toNumber(value: number | string | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveAttemptDate(item: BackendProfileAttemptItem) {
  return item.finishedAt ?? item.startedAt ?? item.updatedAt ?? item.createdAt;
}

function toRecentAttempt(item: BackendProfileAttemptItem) {
  return {
    id: item.id,
    module: item.kind,
    title: item.testTitle,
    status: item.status,
    finishReason: item.finishReason,
    estimatedBand:
      typeof item.estimatedBand === 'number' && Number.isFinite(item.estimatedBand)
        ? item.estimatedBand
        : null,
    testDate: resolveAttemptDate(item),
  };
}

export function useStudentProfileQuery() {
  const { user } = useAppUserProfile();

  return useFetch<StudentProfileData>(
    studentProfileQueryKeys.data(user.id, user.email),
    async () => {
      const [profile, stats, recentAttemptsPage] = await Promise.all([
        fetchStudentProfile(),
        fetchStudentProfileStats(),
        fetchStudentProfileRecentAttempts(4, 0),
      ]);

      return {
        studentName: user.displayName || user.email || 'Student',
        studentEmail: user.email || '-',
        targetBand: toNumber(profile.targetBandScore),
        estimatedOverallBand: toNumber(stats.predictedOverallBand),
        totalAttempts: Math.max(0, stats.totalAttempts),
        studyStreak: Math.max(0, stats.currentStreak),
        weeklyStudyMinutes: Math.max(0, stats.minutesThisWeek),
        recentAttempts: recentAttemptsPage.items.map(toRecentAttempt),
      };
    },
    { enabled: Boolean(user.id || user.email) }
  );
}
