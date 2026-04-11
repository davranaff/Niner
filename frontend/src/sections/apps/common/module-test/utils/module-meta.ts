import type { ActiveIeltsModule } from 'src/_mock/ielts';
import { paths } from 'src/routes/paths';

export function getModulePath(module: ActiveIeltsModule) {
  if (module === 'reading') return paths.ielts.reading;
  if (module === 'listening') return paths.ielts.listening;
  return paths.ielts.writing;
}

export function getModuleTestPath(module: ActiveIeltsModule, testId: string) {
  if (module === 'reading') return paths.ielts.readingTest(testId);
  if (module === 'listening') return paths.ielts.listeningTest(testId);
  return paths.ielts.writingTest(testId);
}

export function getModuleSessionPath(module: ActiveIeltsModule, testId: string) {
  if (module === 'reading') return paths.ielts.readingSession(testId);
  if (module === 'listening') return paths.ielts.listeningSession(testId);
  return paths.ielts.writingSession(testId);
}

export function getModuleAttemptPath(module: ActiveIeltsModule, attemptId: string) {
  if (module === 'reading') return paths.ielts.readingAttempt(attemptId);
  if (module === 'listening') return paths.ielts.listeningAttempt(attemptId);
  return paths.ielts.writingAttempt(attemptId);
}
