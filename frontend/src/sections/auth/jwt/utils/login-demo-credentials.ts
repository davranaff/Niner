/** Prefilled login values for mock vs real API (demo accounts). */
const MOCK = {
  student: { email: 'student@ieltsmock.dev', password: 'demo1234' },
  teacher: { email: 'teacher@ieltsmock.dev', password: 'demo1234' },
} as const;

const BACKEND = {
  student: { email: 'student.demo@bandnine.uz', password: 'StudentDemo123' },
  teacher: { email: 'teacher.demo@bandnine.uz', password: 'TeacherDemo123' },
} as const;

export type LoginDemoCredentials = {
  student: { email: string; password: string };
  teacher: { email: string; password: string };
};

export function getLoginDemoCredentials(isMock: boolean): LoginDemoCredentials {
  return isMock ? MOCK : BACKEND;
}
