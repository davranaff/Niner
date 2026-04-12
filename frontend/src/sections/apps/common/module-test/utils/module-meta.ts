import { appendBreadcrumbFromMyTests } from 'src/routes/breadcrumb-from';
import { paths } from 'src/routes/paths';

export type StudentActiveModule = 'reading' | 'listening' | 'writing' | 'speaking';

export type ModuleNavLinkOptions = {
  /** Set when the link is opened from My tests (breadcrumbs + back path). */
  fromMyTests?: boolean;
};

export function getModulePath(module: StudentActiveModule) {
  if (module === 'reading') return paths.ielts.reading;
  if (module === 'listening') return paths.ielts.listening;
  if (module === 'writing') return paths.ielts.writing;
  return paths.ielts.speaking;
}

export function getModuleTestPath(module: StudentActiveModule, testId: string) {
  if (module === 'reading') return paths.ielts.readingTest(testId);
  if (module === 'listening') return paths.ielts.listeningTest(testId);
  if (module === 'writing') return paths.ielts.writingTest(testId);
  return paths.ielts.speakingTest(testId);
}

export function getModuleSessionPath(
  module: StudentActiveModule,
  testId: string,
  options?: ModuleNavLinkOptions
) {
  let path: string;
  if (module === 'reading') path = paths.ielts.readingSession(testId);
  else if (module === 'listening') path = paths.ielts.listeningSession(testId);
  else if (module === 'writing') path = paths.ielts.writingSession(testId);
  else path = paths.ielts.speakingSession(testId);
  return options?.fromMyTests ? appendBreadcrumbFromMyTests(path) : path;
}

export function getModuleAttemptPath(
  module: StudentActiveModule,
  attemptId: string,
  options?: ModuleNavLinkOptions
) {
  let path: string;
  if (module === 'reading') path = paths.ielts.readingAttempt(attemptId);
  else if (module === 'listening') path = paths.ielts.listeningAttempt(attemptId);
  else if (module === 'writing') path = paths.ielts.writingAttempt(attemptId);
  else path = paths.ielts.speakingAttempt(attemptId);
  return options?.fromMyTests ? appendBreadcrumbFromMyTests(path) : path;
}
