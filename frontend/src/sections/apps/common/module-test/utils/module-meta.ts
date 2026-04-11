import type { ActiveIeltsModule } from 'src/_mock/ielts';
import { appendBreadcrumbFromMyTests } from 'src/routes/breadcrumb-from';
import { paths } from 'src/routes/paths';

export type ModuleNavLinkOptions = {
  /** Set when the link is opened from My tests (breadcrumbs + back path). */
  fromMyTests?: boolean;
};

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

export function getModuleSessionPath(
  module: ActiveIeltsModule,
  testId: string,
  options?: ModuleNavLinkOptions
) {
  let path: string;
  if (module === 'reading') path = paths.ielts.readingSession(testId);
  else if (module === 'listening') path = paths.ielts.listeningSession(testId);
  else path = paths.ielts.writingSession(testId);
  return options?.fromMyTests ? appendBreadcrumbFromMyTests(path) : path;
}

export function getModuleAttemptPath(
  module: ActiveIeltsModule,
  attemptId: string,
  options?: ModuleNavLinkOptions
) {
  let path: string;
  if (module === 'reading') path = paths.ielts.readingAttempt(attemptId);
  else if (module === 'listening') path = paths.ielts.listeningAttempt(attemptId);
  else path = paths.ielts.writingAttempt(attemptId);
  return options?.fromMyTests ? appendBreadcrumbFromMyTests(path) : path;
}
