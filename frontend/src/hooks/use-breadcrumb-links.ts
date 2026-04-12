import { useMemo } from 'react';
import { matchPath, useSearchParams } from 'react-router-dom';

import type { BreadcrumbsLinkProps } from 'src/components/custom-breadcrumbs/types';
import { isBreadcrumbFromMyTests } from 'src/routes/breadcrumb-from';
import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hook';
import { useLocales } from 'src/locales';

// ----------------------------------------------------------------------

export type BreadcrumbTranslate = (
  key: string,
  options?: Record<string, string | number>
) => string;

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.replace(/\/+$/, '');
  }
  return pathname;
}

function buildDashboardBreadcrumbs(
  pathname: string,
  searchParams: URLSearchParams,
  tx: BreadcrumbTranslate
): BreadcrumbsLinkProps[] {
  const d: BreadcrumbsLinkProps = { name: tx('layout.nav.dashboard'), href: paths.dashboard };
  const fromMyTests = isBreadcrumbFromMyTests(searchParams);
  const myTests: BreadcrumbsLinkProps = { name: tx('layout.nav.my_tests'), href: paths.ielts.myTests };

  const readingSession = matchPath({ path: '/dashboard/reading/tests/:testId/session', end: true }, pathname);
  if (readingSession?.params.testId) {
    const testId = String(readingSession.params.testId);
    const tail: BreadcrumbsLinkProps[] = [
      { name: tx('layout.nav.reading'), href: paths.ielts.reading },
      { name: tx('layout.breadcrumbs.test'), href: paths.ielts.readingTest(testId) },
      { name: tx('layout.breadcrumbs.session') },
    ];
    return fromMyTests ? [d, myTests, ...tail] : [d, ...tail];
  }

  const listeningSession = matchPath({ path: '/dashboard/listening/tests/:testId/session', end: true }, pathname);
  if (listeningSession?.params.testId) {
    const testId = String(listeningSession.params.testId);
    const tail: BreadcrumbsLinkProps[] = [
      { name: tx('layout.nav.listening'), href: paths.ielts.listening },
      { name: tx('layout.breadcrumbs.test'), href: paths.ielts.listeningTest(testId) },
      { name: tx('layout.breadcrumbs.session') },
    ];
    return fromMyTests ? [d, myTests, ...tail] : [d, ...tail];
  }

  const writingSession = matchPath({ path: '/dashboard/writing/tests/:testId/session', end: true }, pathname);
  if (writingSession?.params.testId) {
    const testId = String(writingSession.params.testId);
    const tail: BreadcrumbsLinkProps[] = [
      { name: tx('layout.nav.writing'), href: paths.ielts.writing },
      { name: tx('layout.breadcrumbs.test'), href: paths.ielts.writingTest(testId) },
      { name: tx('layout.breadcrumbs.session') },
    ];
    return fromMyTests ? [d, myTests, ...tail] : [d, ...tail];
  }

  const speakingSession = matchPath({ path: '/dashboard/speaking/tests/:testId/session', end: true }, pathname);
  if (speakingSession?.params.testId) {
    const testId = String(speakingSession.params.testId);
    const tail: BreadcrumbsLinkProps[] = [
      { name: tx('layout.nav.speaking'), href: paths.ielts.speaking },
      { name: tx('layout.breadcrumbs.test'), href: paths.ielts.speakingTest(testId) },
      { name: tx('layout.breadcrumbs.session') },
    ];
    return fromMyTests ? [d, myTests, ...tail] : [d, ...tail];
  }

  const readingAttempt = matchPath({ path: '/dashboard/reading/attempts/:attemptId', end: true }, pathname);
  if (readingAttempt?.params.attemptId) {
    const tail: BreadcrumbsLinkProps[] = [
      { name: tx('layout.nav.reading'), href: paths.ielts.reading },
      { name: tx('layout.breadcrumbs.result') },
    ];
    return fromMyTests ? [d, myTests, ...tail] : [d, ...tail];
  }

  const listeningAttempt = matchPath({ path: '/dashboard/listening/attempts/:attemptId', end: true }, pathname);
  if (listeningAttempt?.params.attemptId) {
    const tail: BreadcrumbsLinkProps[] = [
      { name: tx('layout.nav.listening'), href: paths.ielts.listening },
      { name: tx('layout.breadcrumbs.result') },
    ];
    return fromMyTests ? [d, myTests, ...tail] : [d, ...tail];
  }

  const writingAttempt = matchPath({ path: '/dashboard/writing/attempts/:attemptId', end: true }, pathname);
  if (writingAttempt?.params.attemptId) {
    const tail: BreadcrumbsLinkProps[] = [
      { name: tx('layout.nav.writing'), href: paths.ielts.writing },
      { name: tx('layout.breadcrumbs.result') },
    ];
    return fromMyTests ? [d, myTests, ...tail] : [d, ...tail];
  }

  const speakingAttempt = matchPath({ path: '/dashboard/speaking/attempts/:attemptId', end: true }, pathname);
  if (speakingAttempt?.params.attemptId) {
    const tail: BreadcrumbsLinkProps[] = [
      { name: tx('layout.nav.speaking'), href: paths.ielts.speaking },
      { name: tx('layout.breadcrumbs.result') },
    ];
    return fromMyTests ? [d, myTests, ...tail] : [d, ...tail];
  }

  const readingTest = matchPath({ path: '/dashboard/reading/tests/:testId', end: true }, pathname);
  if (readingTest?.params.testId) {
    return [
      d,
      { name: tx('layout.nav.reading'), href: paths.ielts.reading },
      { name: tx('layout.breadcrumbs.test') },
    ];
  }

  const listeningTest = matchPath({ path: '/dashboard/listening/tests/:testId', end: true }, pathname);
  if (listeningTest?.params.testId) {
    return [
      d,
      { name: tx('layout.nav.listening'), href: paths.ielts.listening },
      { name: tx('layout.breadcrumbs.test') },
    ];
  }

  const writingTest = matchPath({ path: '/dashboard/writing/tests/:testId', end: true }, pathname);
  if (writingTest?.params.testId) {
    return [
      d,
      { name: tx('layout.nav.writing'), href: paths.ielts.writing },
      { name: tx('layout.breadcrumbs.test') },
    ];
  }

  const speakingTest = matchPath({ path: '/dashboard/speaking/tests/:testId', end: true }, pathname);
  if (speakingTest?.params.testId) {
    return [
      d,
      { name: tx('layout.nav.speaking'), href: paths.ielts.speaking },
      { name: tx('layout.breadcrumbs.test') },
    ];
  }

  if (matchPath({ path: '/dashboard/reading', end: true }, pathname)) {
    return [d, { name: tx('layout.nav.reading') }];
  }
  if (matchPath({ path: '/dashboard/listening', end: true }, pathname)) {
    return [d, { name: tx('layout.nav.listening') }];
  }
  if (matchPath({ path: '/dashboard/writing', end: true }, pathname)) {
    return [d, { name: tx('layout.nav.writing') }];
  }
  if (matchPath({ path: '/dashboard/speaking', end: true }, pathname)) {
    return [d, { name: tx('layout.nav.speaking') }];
  }
  if (matchPath({ path: '/dashboard/my-tests', end: true }, pathname)) {
    return [d, { name: tx('layout.nav.my_tests') }];
  }
  if (matchPath({ path: '/dashboard/profile', end: true }, pathname)) {
    return [d, { name: tx('layout.nav.profile') }];
  }

  const teacherStudent = matchPath({ path: '/dashboard/teacher/students/:studentId', end: true }, pathname);
  if (teacherStudent?.params.studentId) {
    return [
      d,
      { name: tx('layout.nav.teacher_dashboard'), href: paths.ielts.teacher.root },
      { name: tx('layout.nav.students'), href: paths.ielts.teacher.students },
      { name: tx('layout.breadcrumbs.student') },
    ];
  }

  const teacherAttempt = matchPath({ path: '/dashboard/teacher/attempts/:attemptId', end: true }, pathname);
  if (teacherAttempt?.params.attemptId) {
    return [
      d,
      { name: tx('layout.nav.teacher_dashboard'), href: paths.ielts.teacher.root },
      { name: tx('layout.breadcrumbs.attempt_review') },
    ];
  }

  if (matchPath({ path: '/dashboard/teacher/students', end: true }, pathname)) {
    return [
      d,
      { name: tx('layout.nav.teacher_dashboard'), href: paths.ielts.teacher.root },
      { name: tx('layout.nav.students') },
    ];
  }

  if (matchPath({ path: '/dashboard/teacher/analytics', end: true }, pathname)) {
    return [
      d,
      { name: tx('layout.nav.teacher_dashboard'), href: paths.ielts.teacher.root },
      { name: tx('layout.nav.analytics') },
    ];
  }

  if (matchPath({ path: '/dashboard/teacher', end: true }, pathname)) {
    return [d, { name: tx('layout.nav.teacher_dashboard') }];
  }

  if (matchPath({ path: '/dashboard', end: true }, pathname)) {
    return [d];
  }

  return [d, { name: tx('layout.breadcrumbs.page') }];
}

function buildUtilityBreadcrumbs(pathname: string, tx: BreadcrumbTranslate): BreadcrumbsLinkProps[] {
  const home: BreadcrumbsLinkProps = { name: tx('layout.breadcrumbs.home'), href: '/' };

  if (matchPath({ path: '/confirm/:token', end: true }, pathname)) {
    return [home, { name: tx('auth.confirm.title') }];
  }

  if (pathname.startsWith('/components')) {
    const hub: BreadcrumbsLinkProps = {
      name: tx('layout.breadcrumbs.components_demo'),
      href: paths.components,
    };
    if (pathname === '/components') {
      return [home, { name: tx('layout.breadcrumbs.components_demo') }];
    }
    return [home, hub, { name: tx('layout.breadcrumbs.page') }];
  }

  const staticLabels: Record<string, string> = {
    '/404': tx('layout.breadcrumbs.not_found'),
    '/403': tx('layout.breadcrumbs.forbidden'),
    '/500': tx('layout.breadcrumbs.server_error'),
    '/maintenance': tx('layout.breadcrumbs.maintenance'),
    '/login': tx('auth.login.title'),
    '/register': tx('auth.register.title'),
  };

  const label = staticLabels[pathname];
  if (label) {
    return [home, { name: label }];
  }

  return [home, { name: tx('layout.breadcrumbs.page') }];
}

export function buildBreadcrumbLinks(
  pathname: string,
  searchParams: URLSearchParams,
  tx: BreadcrumbTranslate
): BreadcrumbsLinkProps[] {
  const normalized = normalizePathname(pathname);
  if (normalized.startsWith('/dashboard')) {
    return buildDashboardBreadcrumbs(normalized, searchParams, tx);
  }
  return buildUtilityBreadcrumbs(normalized, tx);
}

// ----------------------------------------------------------------------

export function useBreadcrumbLinks(): BreadcrumbsLinkProps[] {
  const pathname = usePathname();
  const [searchParams] = useSearchParams();
  const { tx } = useLocales();

  return useMemo(
    () => buildBreadcrumbLinks(pathname, searchParams, tx),
    [pathname, searchParams, tx]
  );
}
