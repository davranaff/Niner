import { useMemo } from 'react';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAssignmentsQuery } from 'src/sections/apps/student/assignments/api/use-assignments-api';
import type { AssignmentModule } from 'src/sections/apps/student/assignments/api/types';

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

type PostExamAssignmentsCardProps = {
  module: AssignmentModule;
  examId: number;
};

export function PostExamAssignmentsCard({ module, examId }: PostExamAssignmentsCardProps) {
  const assignmentsQuery = useAssignmentsQuery({ module, limit: 50, offset: 0 });

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

  return (
    <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Post-exam assignments
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          These tasks were generated from your mistakes and weak skills in this attempt.
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
                    label={assignment.status.replace('_', ' ')}
                  />
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {assignment.instructions}
                </Typography>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
