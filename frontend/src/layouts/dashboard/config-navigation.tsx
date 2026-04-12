import { useMemo } from 'react'
// routes
import { paths } from 'src/routes/paths'
// locales
import { useLocales } from 'src/locales'
// components
import Iconify from 'src/components/iconify'
import SvgColor from 'src/components/svg-color'

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />
)

const ICONS = {
  dashboard: icon('ic_dashboard'),
  overallExam: <Iconify icon="solar:clipboard-check-bold-duotone" width={24} />,
  reading: <Iconify icon="solar:book-bold-duotone" width={24} />,
  listening: <Iconify icon="solar:headphones-round-bold-duotone" width={24} />,
  writing: <Iconify icon="solar:pen-bold-duotone" width={24} />,
  speaking: <Iconify icon="solar:microphone-3-bold-duotone" width={24} />,
  tests: <Iconify icon="solar:clipboard-list-bold-duotone" width={24} />,
  profile: <Iconify icon="solar:user-circle-bold-duotone" width={24} />,
  students: <Iconify icon="solar:users-group-rounded-bold-duotone" width={24} />,
  analytics: <Iconify icon="solar:chart-2-bold-duotone" width={24} />,
}

// ----------------------------------------------------------------------

export function useNavData(currentRole: string = 'student') {
  const { tx } = useLocales()

  return useMemo(() => {
    const teacherGroup = {
      subheader: tx('layout.nav.group'),
      items: [
        {
          title: tx('layout.nav.teacher_dashboard'),
          path: paths.ielts.teacher.root,
          icon: ICONS.dashboard,
          roles: ['teacher'],
        },
        {
          title: tx('layout.nav.students'),
          path: paths.ielts.teacher.students,
          deepMatch: true,
          icon: ICONS.students,
          roles: ['teacher'],
        },
        {
          title: tx('layout.nav.analytics'),
          path: paths.ielts.teacher.analytics,
          icon: ICONS.analytics,
          roles: ['teacher'],
        },
      ],
    }

    if (currentRole === 'teacher') {
      return [teacherGroup]
    }

    return [
      {
        subheader: tx('layout.nav.group'),
        items: [
          {
            title: tx('layout.nav.dashboard'),
            path: paths.dashboard,
            icon: ICONS.dashboard,
            roles: ['student'],
          },
          {
            title: tx('layout.nav.my_tests'),
            path: paths.ielts.myTests,
            icon: ICONS.tests,
            roles: ['student'],
          },
          {
            title: tx('layout.nav.profile'),
            path: paths.ielts.profile,
            icon: ICONS.profile,
            roles: ['student'],
          },
        ],
      },
      {
        subheader: tx('layout.nav.group_exams'),
        items: [
          {
            title: tx('layout.nav.overall_exam'),
            path: paths.ielts.overallExam,
            deepMatch: true,
            icon: ICONS.overallExam,
            roles: ['student'],
          },
          {
            title: tx('layout.nav.reading'),
            path: paths.ielts.reading,
            deepMatch: true,
            icon: ICONS.reading,
            roles: ['student'],
          },
          {
            title: tx('layout.nav.writing'),
            path: paths.ielts.writing,
            deepMatch: true,
            icon: ICONS.writing,
            roles: ['student'],
          },
          {
            title: tx('layout.nav.speaking'),
            path: paths.ielts.speaking,
            deepMatch: true,
            icon: ICONS.speaking,
            roles: ['student'],
          },
          {
            title: tx('layout.nav.listening'),
            path: paths.ielts.listening,
            deepMatch: true,
            icon: ICONS.listening,
            roles: ['student'],
          },
        ],
      },
    ]
  }, [tx, currentRole])
}
