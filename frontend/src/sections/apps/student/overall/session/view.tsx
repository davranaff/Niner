import { useEffect, useMemo } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';
import { useParams, useRouter } from 'src/routes/hook';
import { getModuleSessionPath } from 'src/sections/apps/common/module-test/utils/module-meta';

import { useOverallExamContinueMutation, useOverallExamStateQuery } from '../api/use-overall-api';

function formatBreakCountdown(value: number | null | undefined) {
  const safeSeconds = Math.max(0, Number(value ?? 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function AppsOverallExamSessionView() {
  const { tx } = useLocales();
  const router = useRouter();
  const params = useParams();

  const overallId = useMemo(() => Number(params.overallId || 0), [params.overallId]);
  const stateQuery = useOverallExamStateQuery(overallId, {
    enabled: overallId > 0,
    refetchInterval: 1000,
  });
  const continueMutation = useOverallExamContinueMutation();
  const hasFreshState = stateQuery.isFetchedAfterMount;

  useEffect(() => {
    if (!hasFreshState) {
      return;
    }

    const state = stateQuery.data;
    if (!state || overallId <= 0) {
      return;
    }

    if (state.status !== 'in_progress' || state.phase === 'completed' || state.phase === 'terminated') {
      router.replace(paths.ielts.overallExamAttempt(String(overallId)));
      return;
    }

    if (state.phase !== 'module' || !state.currentModule) {
      return;
    }

    const activeModule = state.modules.find((item) => item.module === state.currentModule);
    if (!activeModule || !activeModule.testId || !activeModule.examId) {
      return;
    }

    const basePath = getModuleSessionPath(state.currentModule, String(activeModule.testId));
    const searchParams = new URLSearchParams({
      overallId: String(overallId),
      examId: String(activeModule.examId),
    });
    router.replace(`${basePath}?${searchParams.toString()}`);
  }, [hasFreshState, overallId, router, stateQuery.data]);

  const handleContinue = async () => {
    await continueMutation.mutateAsync(overallId);
    await stateQuery.refetch();
  };

  if (overallId <= 0) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">{tx('pages.ielts.shared.result_unavailable_description')}</Alert>
      </Container>
    );
  }

  if (stateQuery.isLoading || !hasFreshState || !stateQuery.data) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Card variant="outlined" sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {tx('pages.ielts.shared.status_in_progress')}
          </Typography>
        </Card>
      </Container>
    );
  }

  if (stateQuery.data.phase !== 'break') {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Card variant="outlined" sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {tx('pages.ielts.shared.status_in_progress')}
          </Typography>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5">{tx('pages.ielts.overall.break_title')}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {tx('pages.ielts.overall.break_description')}
          </Typography>

          <Typography variant="h3" sx={{ fontWeight: 800 }}>
            {formatBreakCountdown(stateQuery.data.breakRemainingSeconds)}
          </Typography>

          <Alert severity="info">{tx('pages.ielts.overall.break_no_penalty')}</Alert>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => router.push(paths.ielts.overallExam)}
            >
              {tx('pages.ielts.shared.details')}
            </Button>
            <LoadingButton
              variant="contained"
              color="primary"
              loading={continueMutation.isPending}
              onClick={handleContinue}
            >
              {tx('pages.ielts.overall.continue_now')}
            </LoadingButton>
          </Stack>
        </Stack>
      </Card>
    </Container>
  );
}
