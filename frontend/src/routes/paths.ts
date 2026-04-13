import type { UserRole } from 'src/auth/api/types'

// ----------------------------------------------------------------------

export const paths = {
  login: '/login',
  register: '/register',
  confirm: '/confirm',
  confirmToken: (token: string) => `/confirm/${token}`,

  dashboard: '/dashboard',

  afterLogin: (role?: UserRole) => {
    if (role === 'teacher') {
      return '/dashboard/teacher';
    }

    if (role === 'admin') {
      return '/dashboard/admin';
    }

    return '/dashboard';
  },

  ielts: {
    home: '/dashboard',
    reading: '/dashboard/reading',
    readingTest: (testId: string) => `/dashboard/reading/tests/${testId}`,
    readingSession: (testId: string) => `/dashboard/reading/tests/${testId}/session`,
    readingAttempt: (attemptId: string) => `/dashboard/reading/attempts/${attemptId}`,

    listening: '/dashboard/listening',
    listeningTest: (testId: string) => `/dashboard/listening/tests/${testId}`,
    listeningSession: (testId: string) => `/dashboard/listening/tests/${testId}/session`,
    listeningAttempt: (attemptId: string) => `/dashboard/listening/attempts/${attemptId}`,

    writing: '/dashboard/writing',
    writingTest: (testId: string) => `/dashboard/writing/tests/${testId}`,
    writingSession: (testId: string) => `/dashboard/writing/tests/${testId}/session`,
    writingAttempt: (attemptId: string) => `/dashboard/writing/attempts/${attemptId}`,

    speaking: '/dashboard/speaking',
    speakingTest: (testId: string) => `/dashboard/speaking/tests/${testId}`,
    speakingSession: (testId: string) => `/dashboard/speaking/tests/${testId}/session`,
    speakingAttempt: (attemptId: string) => `/dashboard/speaking/attempts/${attemptId}`,

    overallExam: '/dashboard/overall-exam',
    overallExamSession: (overallId: string) => `/dashboard/overall-exam/session/${overallId}`,
    overallExamAttempt: (overallId: string) => `/dashboard/overall-exam/attempts/${overallId}`,

    myTests: '/dashboard/my-tests',
    assignments: '/dashboard/assignments',
    profile: '/dashboard/profile',

    teacher: {
      root: '/dashboard/teacher',
      students: '/dashboard/teacher/students',
      student: (studentId: string) => `/dashboard/teacher/students/${studentId}`,
      attempt: (attemptId: string) => `/dashboard/teacher/attempts/${attemptId}`,
      analytics: '/dashboard/teacher/analytics',
    },
    admin: {
      root: '/dashboard/admin',
      reading: '/dashboard/admin/reading',
      readingTest: (testId: string) => `/dashboard/admin/reading/tests/${testId}`,
      listening: '/dashboard/admin/listening',
      listeningTest: (testId: string) => `/dashboard/admin/listening/tests/${testId}`,
      writing: '/dashboard/admin/writing',
      writingTest: (testId: string) => `/dashboard/admin/writing/tests/${testId}`,
      lessons: '/dashboard/admin/lessons',
      exams: '/dashboard/admin/exams',
    },
  },

  components: '/components',
  maintenance: '/maintenance',
  page403: '/403',
  page404: '/404',
  page500: '/500',

  docs: 'https://docs.minimals.cc',
  changelog: 'https://docs.minimals.cc/changelog',

  auth: {
    jwt: {
      login: '/login',
      register: '/register',
      confirm: '/confirm',
      confirmToken: (token: string) => `/confirm/${token}`,
    },
  },
}
