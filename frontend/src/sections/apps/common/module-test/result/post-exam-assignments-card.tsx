import { useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import LoadingButton from '@mui/lab/LoadingButton';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSnackbar } from 'src/components/snackbar';
import { useLocales } from 'src/locales';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { getModuleTestPath } from 'src/sections/apps/common/module-test/utils/module-meta';
import {
  assignmentQueryKeys,
  useAssignmentsQuery,
  useGenerateAssignmentTestMutation,
} from 'src/sections/apps/student/assignments/api/use-assignments-api';
import type { AssignmentModule, AssignmentStatus } from 'src/sections/apps/student/assignments/api/types';

function toStatusColor(status: string): 'default' | 'warning' | 'info' | 'success' {
  if (status === 'completed') {
    return 'success';
  }
  if (status === 'in_progress') {
    return 'info';
  }
  if (status === 'recommended') {
    return 'warning';
  }
  return 'default';
}

function translateAssignmentStatus(
  status: AssignmentStatus,
  translate: (key: string, options?: Record<string, string | number>) => string
) {
  if (status === 'completed') {
    return translate('pages.ielts.shared.status_completed');
  }
  if (status === 'in_progress') {
    return translate('pages.ielts.shared.status_in_progress');
  }
  if (status === 'recommended') {
    return translate('pages.ielts.assignments.status_recommended');
  }
  return translate('pages.ielts.assignments.status_cancelled');
}

type PostExamAssignmentsCardProps = {
  module: AssignmentModule;
  examId: number;
};

function buildAssignmentsHref(module: AssignmentModule, examId: number, assignmentId?: number) {
  const params = new URLSearchParams({
    module,
    exam: String(examId),
  });

  if (assignmentId) {
    params.set('assignment', String(assignmentId));
  }

  return `${paths.ielts.assignments}?${params.toString()}`;
}

export function PostExamAssignmentsCard({ module, examId }: PostExamAssignmentsCardProps) {
  const { tx } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const generateTestMutation = useGenerateAssignmentTestMutation();
  const assignmentsQuery = useAssignmentsQuery({ module, limit: 100, offset: 0 });

  const assignments = useMemo(() => {
    if (!assignmentsQuery.data?.items?.length) {
      return [];
    }

    return assignmentsQuery.data.items
      .filter((item) => item.sourceExamId === examId)
      .slice(0, 4);
  }, [assignmentsQuery.data?.items, examId]);

  if (assignmentsQuery.isPending || assignments.length === 0) {
    return null;
  }

  const handleGenerateTest = async (assignmentId: number) => {
    await generateTestMutation.mutateAsync({ assignmentId });
    await queryClient.invalidateQueries({ queryKey: assignmentQueryKeys.root });
    enqueueSnackbar(tx('pages.ielts.assignments.generate_test_queued'), { variant: 'success' });
  };

  return (
    <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {tx('pages.ielts.assignments.post_exam_title')}
          </Typography>
          <Button
            component={RouterLink}
            href={buildAssignmentsHref(module, examId)}
            size="small"
            variant="contained"
            color="primary"
          >
            {tx('pages.ielts.assignments.practice_weak_areas')}
          </Button>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.assignments.post_exam_description')}
        </Typography>

        <Stack spacing={1.5}>
          {assignments.map((assignment) => (
            <Card key={assignment.id} variant="outlined" sx={{ p: 1.75 }}>
              <Stack spacing={0.75}>
                <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                  <Typography variant="subtitle2">{assignment.title}</Typography>
                  <Chip
                    size="small"
                    color={toStatusColor(assignment.status)}
                    label={translateAssignmentStatus(assignment.status, tx)}
                  />
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {assignment.instructions}
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  color={assignment.generatedTest.status === 'ready' ? 'success' : 'default'}
                  label={tx(`pages.ielts.assignments.generation_status_${assignment.generatedTest.status}`)}
                />
                {assignment.generatedTest.status === 'queued' ||
                assignment.generatedTest.status === 'processing' ? (
                  <LinearProgress
                    variant="determinate"
                    value={assignment.generatedTest.progressPercent}
                    sx={{ height: 6, borderRadius: 999 }}
                  />
                ) : null}
                <Stack direction="row" justifyContent="flex-end" spacing={1}>
                  {assignment.generatedTest.status === 'ready' && assignment.generatedTest.testId ? (
                    <Button
                      component={RouterLink}
                      href={getModuleTestPath(module, String(assignment.generatedTest.testId))}
                      size="small"
                    >
                      {tx('pages.ielts.assignments.open_generated_test')}
                    </Button>
                  ) : (
                    <LoadingButton
                      size="small"
                      loading={
                        generateTestMutation.isPending &&
                        generateTestMutation.variables?.assignmentId === assignment.id
                      }
                      disabled={
                        assignment.generatedTest.status === 'queued' ||
                        assignment.generatedTest.status === 'processing'
                      }
                      onClick={() => handleGenerateTest(assignment.id)}
                    >
                      {tx('pages.ielts.assignments.generate_test')}
                    </LoadingButton>
                  )}
                  <Button
                    component={RouterLink}
                    href={buildAssignmentsHref(module, examId, assignment.id)}
                    size="small"
                  >
                    {tx('pages.ielts.assignments.open_assignment')}
                  </Button>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
