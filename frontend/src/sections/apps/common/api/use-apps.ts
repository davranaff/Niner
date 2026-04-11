import { useQueryClient } from '@tanstack/react-query';

import { useFetch, useMutate } from 'src/hooks/api';
import type {
  ActiveIeltsModule,
  FinishReason,
  MockIntegrityEvent,
  MockQuestionAnswerValue,
} from 'src/_mock/ielts';

import {
  getAttemptById,
  getAttemptIntegrityEvents,
  getAttemptResult,
  getModuleTests,
  getSessionData,
  getStudentAttempts,
  getStudentDashboard,
  getStudentProfile,
  getTeacherAnalytics,
  getTeacherDashboard,
  getTeacherStudentById,
  getTeacherStudents,
  getTestById,
  saveAttemptAnswer,
  saveWritingDraft,
  startAttempt,
  submitAttempt,
  syncAttemptHeartbeat,
  terminateAttempt,
} from './apps-service';
import type { AppsListFilters, MyTestsFilters, TeacherStudentsFilters } from './types';

const rootKey = ['ielts'];

export const appsQueryKeys = {
  root: rootKey,
  studentDashboard: [...rootKey, 'student-dashboard'],
  teacherDashboard: [...rootKey, 'teacher-dashboard'],
  moduleTests: (module: ActiveIeltsModule, filters: AppsListFilters) =>
    [...rootKey, 'module-tests', module, filters] as const,
  testDetails: (module: ActiveIeltsModule, testId: string) =>
    [...rootKey, 'test-details', module, testId] as const,
  attempt: (attemptId: string) => [...rootKey, 'attempt', attemptId] as const,
  session: (attemptId: string) => [...rootKey, 'session', attemptId] as const,
  attemptResult: (attemptId: string) => [...rootKey, 'attempt-result', attemptId] as const,
  studentAttempts: (filters: MyTestsFilters) => [...rootKey, 'student-attempts', filters] as const,
  studentProfile: [...rootKey, 'student-profile'],
  teacherStudents: (filters: TeacherStudentsFilters) =>
    [...rootKey, 'teacher-students', filters] as const,
  teacherStudent: (studentId: string) => [...rootKey, 'teacher-student', studentId] as const,
  teacherAnalytics: [...rootKey, 'teacher-analytics'],
  attemptIntegrity: (attemptId: string) => [...rootKey, 'attempt-integrity', attemptId] as const,
};

export function useStudentDashboardQuery() {
  return useFetch(appsQueryKeys.studentDashboard, getStudentDashboard);
}

export function useTeacherDashboardQuery() {
  return useFetch(appsQueryKeys.teacherDashboard, getTeacherDashboard);
}

export function useModuleTestsQuery(module: ActiveIeltsModule, filters: AppsListFilters) {
  return useFetch(appsQueryKeys.moduleTests(module, filters), () =>
    getModuleTests(module, filters)
  );
}

export function useTestDetailsQuery(module: ActiveIeltsModule, testId: string) {
  return useFetch(appsQueryKeys.testDetails(module, testId), () => getTestById(module, testId), {
    enabled: Boolean(testId),
  });
}

export function useAttemptQuery(attemptId: string) {
  return useFetch(appsQueryKeys.attempt(attemptId), () => getAttemptById(attemptId), {
    enabled: Boolean(attemptId),
  });
}

export function useSessionQuery(attemptId: string) {
  return useFetch(appsQueryKeys.session(attemptId), () => getSessionData(attemptId), {
    enabled: Boolean(attemptId),
    refetchOnWindowFocus: false,
  });
}

export function useAttemptResultQuery(attemptId: string) {
  return useFetch(appsQueryKeys.attemptResult(attemptId), () => getAttemptResult(attemptId), {
    enabled: Boolean(attemptId),
  });
}

export function useStudentAttemptsQuery(filters: MyTestsFilters) {
  return useFetch(appsQueryKeys.studentAttempts(filters), () => getStudentAttempts(filters));
}

export function useStudentProfileQuery() {
  return useFetch(appsQueryKeys.studentProfile, getStudentProfile);
}

export function useTeacherStudentsQuery(filters: TeacherStudentsFilters) {
  return useFetch(appsQueryKeys.teacherStudents(filters), () => getTeacherStudents(filters));
}

export function useTeacherStudentQuery(studentId: string) {
  return useFetch(
    appsQueryKeys.teacherStudent(studentId),
    () => getTeacherStudentById(studentId),
    {
      enabled: Boolean(studentId),
    }
  );
}

export function useTeacherAnalyticsQuery() {
  return useFetch(appsQueryKeys.teacherAnalytics, getTeacherAnalytics);
}

export function useAttemptIntegrityEventsQuery(attemptId: string) {
  return useFetch(
    appsQueryKeys.attemptIntegrity(attemptId),
    () => getAttemptIntegrityEvents(attemptId),
    {
      enabled: Boolean(attemptId),
    }
  );
}

function useInvalidateAppsQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: appsQueryKeys.root });
  };
}

export function useStartAttemptMutation() {
  const invalidate = useInvalidateAppsQueries();

  return useMutate(startAttempt, {
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useSaveAttemptAnswerMutation() {
  const invalidate = useInvalidateAppsQueries();

  return useMutate(saveAttemptAnswer, {
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useAttemptHeartbeatMutation() {
  const invalidate = useInvalidateAppsQueries();

  return useMutate(syncAttemptHeartbeat, {
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useSubmitAttemptMutation() {
  const invalidate = useInvalidateAppsQueries();

  return useMutate(submitAttempt, {
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useTerminateAttemptMutation() {
  const invalidate = useInvalidateAppsQueries();

  return useMutate(terminateAttempt, {
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useSaveWritingDraftMutation() {
  const invalidate = useInvalidateAppsQueries();

  return useMutate(saveWritingDraft, {
    onSuccess: () => {
      invalidate();
    },
  });
}

export type SaveAttemptAnswerInput = {
  attemptId: string;
  questionId: string;
  value: MockQuestionAnswerValue;
  currentSectionId?: string;
  remainingTimeSec?: number;
};

export type TerminateAttemptInput = {
  attemptId: string;
  reason: FinishReason;
  eventType?: MockIntegrityEvent['type'];
  remainingTimeSec?: number;
};
