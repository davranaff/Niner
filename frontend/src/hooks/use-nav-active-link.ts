import { useSearchParams } from 'react-router-dom';

import { usePathname } from 'src/routes/hook';
import { useActiveLink } from 'src/routes/hook/use-active-link';
import { paths } from 'src/routes/paths';
import { isBreadcrumbFromMyTests, isStudentModuleAttemptOrSessionPath } from 'src/routes/breadcrumb-from';

// ----------------------------------------------------------------------

/**
 * Sidebar / nav active state: when opening attempt or session from My tests (`bc_from=my-tests`),
 * highlight My tests instead of the Reading/Listening/Writing parent.
 */
export function useNavActiveLink(path: string, hasChild: boolean, deepMatch?: boolean): boolean {
  const pathname = usePathname();
  const [searchParams] = useSearchParams();
  const baseActive = useActiveLink(path, hasChild || Boolean(deepMatch));

  const fromMyTestsContext =
    isBreadcrumbFromMyTests(searchParams) && isStudentModuleAttemptOrSessionPath(pathname);

  if (!fromMyTestsContext) {
    return baseActive;
  }

  if (path === paths.ielts.myTests) {
    return true;
  }

  if (
    deepMatch &&
    ((path === paths.ielts.reading && pathname.startsWith('/dashboard/reading/')) ||
      (path === paths.ielts.listening && pathname.startsWith('/dashboard/listening/')) ||
      (path === paths.ielts.writing && pathname.startsWith('/dashboard/writing/')))
  ) {
    return false;
  }

  return baseActive;
}
