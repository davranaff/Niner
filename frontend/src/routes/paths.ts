import type { UserRole } from 'src/auth/api/types'

// ----------------------------------------------------------------------

export const paths = {
  login: '/login',
  register: '/register',
  confirm: '/confirm',
  confirmToken: (token: string) => `/confirm/${token}`,

  dashboard: '/dashboard',

  afterLogin: (role?: UserRole) => (role === 'teacher' ? '/dashboard/teacher' : '/dashboard'),

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

    myTests: '/dashboard/my-tests',
    profile: '/dashboard/profile',

    teacher: {
      root: '/dashboard/teacher',
      students: '/dashboard/teacher/students',
      student: (studentId: string) => `/dashboard/teacher/students/${studentId}`,
      attempt: (attemptId: string) => `/dashboard/teacher/attempts/${attemptId}`,
      analytics: '/dashboard/teacher/analytics',
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
