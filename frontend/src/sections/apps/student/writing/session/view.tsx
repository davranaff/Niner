import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';
import { useRouter, useParams } from 'src/routes/hook';
import ConfirmDialog from 'src/components/custom-dialog/confirm-dialog';
import { useUrlQueryState } from 'src/hooks/use-url-query-state';
import {
  ExamPanel,
  ExamShell,
  SessionLoadingState,
} from 'src/pages/components/apps/session';
import { useSessionCountdown } from 'src/hooks/apps';
import { useExamIntegrityGuard } from 'src/sections/apps/student/module-test/session/use-exam-integrity-guard';
import {
  decreaseFontScale,
  formatSessionTimer,
  increaseFontScale,
} from 'src/sections/apps/student/module-test/session/utils';

import { WritingPartTabs, WritingPromptAssets } from '../components';
import {
  useMyWritingExamsQuery,
  useSaveWritingExamDraftMutation,
  useStartWritingFlowMutation,
  useSubmitWritingExamMutation,
  useWritingDetailQuery,
  useWritingExamResultMutation,
} from '../api/use-writing-api';
import {
  buildWritingSubmitPayload,
  clearWritingActiveExam,
  clearWritingDraftResponses,
  findLatestUnfinishedWritingExamForTest,
  getWritingActiveExamId,
  getWritingDraftResponses,
  getWritingParts,
  getWritingTaskCount,
  getWritingTimeLimit,
  resolveWritingRemainingTimeSeconds,
  setWritingActiveExam,
  setWritingDraftResponses,
  setWritingStoredResult,
  toWritingStoredResult,
} from '../api/utils';
import {
  countCompletedWritingTasks,
  getMissingWritingParts,
  getWritingSuggestedMinWords,
  getWritingWordCount,
  writingSessionQuerySchema,
} from '../utils';

export default function AppsWritingSessionView() {
  const { tx } = useLocales();
  const router = useRouter();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const testId = Number(params.testId || 0);
  const overallId = Number(searchParams.get('overallId') || 0);
  const preferredExamId = Number(searchParams.get('examId') || 0);

  const detailQuery = useWritingDetailQuery(testId, testId > 0);
  const examsQuery = useMyWritingExamsQuery({ enabled: testId > 0 });
  const startWritingFlowMutation = useStartWritingFlowMutation();
  const submitWritingExamMutation = useSubmitWritingExamMutation();
  const saveWritingDraftMutation = useSaveWritingExamDraftMutation();
  const writingExamResultMutation = useWritingExamResultMutation();
  const { values: sessionQuery, setValues: setSessionQuery } =
    useUrlQueryState(writingSessionQuerySchema);

  const [fontScale, setFontScale] = useState(1);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [remainingTimeSec, setRemainingTimeSec] = useState<number | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [activeExamId, setActiveExamId] = useState<number | null>(null);
  const [activeExamStartedAt, setActiveExamStartedAt] = useState<string | null>(null);
  const [timeoutPromptShown, setTimeoutPromptShown] = useState(false);
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);

  const bootstrapTestRef = useRef<number | null>(null);
  const allowExitRef = useRef(false);
  const finalizingRef = useRef(false);
  const draftSyncTimerRef = useRef<number | null>(null);

  const detail = detailQuery.data;
  const examItems = useMemo(() => examsQuery.data?.items ?? [], [examsQuery.data]);
  const writingParts = useMemo(() => (detail ? getWritingParts(detail) : []), [detail]);
  const selectedTaskOrder = sessionQuery.task;
  const totalTasks = useMemo(() => (detail ? getWritingTaskCount(detail) : 0), [detail]);

  useEffect(() => {
    if (
      !detail ||
      examsQuery.isLoading ||
      bootstrapTestRef.current === testId ||
      startWritingFlowMutation.isPending
    ) {
      return;
    }

    bootstrapTestRef.current = testId;

    const storedActiveExamId = getWritingActiveExamId(testId);
    const latestActiveExam = findLatestUnfinishedWritingExamForTest(testId, examItems);

    startWritingFlowMutation
      .mutateAsync({
        testId,
        examId:
          (preferredExamId > 0 ? preferredExamId : null) ??
          storedActiveExamId ??
          latestActiveExam?.id,
      })
      .then((exam) => {
        if (overallId > 0 && exam.status === 'completed') {
          router.replace(paths.ielts.overallExamSession(String(overallId)));
          return;
        }

        setActiveExamId(exam.id);
        setActiveExamStartedAt(exam.startedAt);
        setWritingActiveExam(testId, exam.id);
        setResponses(getWritingDraftResponses(exam.id));
        setRemainingTimeSec(
          resolveWritingRemainingTimeSeconds(exam.startedAt, getWritingTimeLimit(detail))
        );
      })
      .catch(() => {
        bootstrapTestRef.current = null;
      });
  }, [
    detail,
    examItems,
    examsQuery.isLoading,
    overallId,
    preferredExamId,
    router,
    startWritingFlowMutation,
    testId,
  ]);

  const selectedPart =
    writingParts.find((item) => item.order === selectedTaskOrder) ?? writingParts[0] ?? null;

  useEffect(() => {
    if (!selectedPart || selectedPart.order === selectedTaskOrder) {
      return;
    }

    setSessionQuery({ task: selectedPart.order });
  }, [selectedPart, selectedTaskOrder, setSessionQuery]);

  useEffect(() => {
    if (!activeExamId || !detail) {
      return undefined;
    }

    setWritingDraftResponses(activeExamId, responses);

    if (draftSyncTimerRef.current) {
      window.clearTimeout(draftSyncTimerRef.current);
    }

    const payload = buildWritingSubmitPayload(detail, responses);
    draftSyncTimerRef.current = window.setTimeout(() => {
      if (finalizingRef.current) {
        return;
      }
      saveWritingDraftMutation.mutate({
        examId: activeExamId,
        parts: payload,
      });
    }, 700);

    return () => {
      if (draftSyncTimerRef.current) {
        window.clearTimeout(draftSyncTimerRef.current);
        draftSyncTimerRef.current = null;
      }
    };
  }, [activeExamId, detail, responses, saveWritingDraftMutation]);

  useSessionCountdown({
    attemptId: activeExamId ? String(activeExamId) : '',
    attemptStatus: activeExamId ? 'in_progress' : '',
    blocked: false,
    remainingTimeSec,
    onTick: setRemainingTimeSec,
  });

  const finalizeWritingExam = useCallback(
    async ({ finishReason }: { finishReason?: 'left' | 'time_is_up' } = {}) => {
      if (!detail || !activeExamId || finalizingRef.current) {
        return;
      }

      finalizingRef.current = true;
      allowExitRef.current = true;
      setSubmitDialogOpen(false);
      if (draftSyncTimerRef.current) {
        window.clearTimeout(draftSyncTimerRef.current);
        draftSyncTimerRef.current = null;
      }

      const finishedAt = new Date().toISOString();
      const startedAt = activeExamStartedAt ?? finishedAt;
      const submittedParts = buildWritingSubmitPayload(detail, responses);

      try {
        const submitResult = await submitWritingExamMutation.mutateAsync({
          examId: activeExamId,
          parts: submittedParts,
          finishReason,
        });
        const canonicalResult = await writingExamResultMutation
          .mutateAsync(activeExamId)
          .catch(() => submitResult);

        setWritingStoredResult(
          toWritingStoredResult({
            exam: {
              id: activeExamId,
              userId: 0,
              startedAt,
              finishedAt,
              finishReason: finishReason ?? null,
              testId,
              kind: 'writing',
              status: 'completed',
            },
            detail,
            submitResult: canonicalResult,
            submittedParts,
            finishedAt,
          })
        );

        clearWritingActiveExam(testId);
        clearWritingDraftResponses(activeExamId);
        if (overallId > 0) {
          router.replace(paths.ielts.overallExamSession(String(overallId)));
        } else {
          router.replace(paths.ielts.writingAttempt(String(activeExamId)));
        }
      } catch {
        finalizingRef.current = false;
        allowExitRef.current = false;
      }
    },
    [
      activeExamId,
      activeExamStartedAt,
      detail,
      overallId,
      responses,
      router,
      submitWritingExamMutation,
      testId,
      writingExamResultMutation,
    ]
  );

  useExamIntegrityGuard({
    enabled: Boolean(activeExamId),
    allowExitRef,
    blockClipboard: true,
    onViolation: () => {
      setSubmitDialogOpen(false);
      setLeaveWarningOpen(true);
    },
  });

  useEffect(() => {
    if (remainingTimeSec !== 0 || timeoutPromptShown) {
      return;
    }

    setTimeoutPromptShown(true);
    finalizeWritingExam({ finishReason: 'time_is_up' }).catch(() => {});
  }, [finalizeWritingExam, remainingTimeSec, timeoutPromptShown]);

  const completedTasks = useMemo(
    () => countCompletedWritingTasks(writingParts, responses),
    [responses, writingParts]
  );
  const missingParts = useMemo(
    () => getMissingWritingParts(writingParts, responses),
    [responses, writingParts]
  );
  const selectedWordCount = useMemo(
    () => getWritingWordCount(selectedPart?.id, responses),
    [responses, selectedPart?.id]
  );

  const handlePartChange = useCallback(
    (order: number) => {
      setSessionQuery({ task: order });
    },
    [setSessionQuery]
  );

  const handleEssayChange = useCallback((partId: number, essay: string) => {
    setResponses((previous) => ({
      ...previous,
      [String(partId)]: essay,
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    await finalizeWritingExam();
  }, [finalizeWritingExam]);

  const handleFinishAfterLeaveWarning = useCallback(async () => {
    setLeaveWarningOpen(false);
    await finalizeWritingExam({ finishReason: 'left' });
  }, [finalizeWritingExam]);

  if (detailQuery.isLoading || !detail || startWritingFlowMutation.isPending || !activeExamId) {
    return <SessionLoadingState />;
  }

  return (
    <>
      <ExamShell
        title={detail.title}
        subtitle={
          selectedPart
            ? tx('pages.ielts.shared.task_label', { number: selectedPart.order })
            : undefined
        }
        timerLabel={formatSessionTimer(remainingTimeSec)}
        timerWarning={(remainingTimeSec ?? 0) <= 300}
        onDecreaseFontSize={() => setFontScale((previous) => decreaseFontScale(previous))}
        onIncreaseFontSize={() => setFontScale((previous) => increaseFontScale(previous))}
        submitLabel={tx('pages.ielts.shared.submit_test')}
        onSubmit={() => setSubmitDialogOpen(true)}
        extraActions={
          <Chip
            variant="outlined"
            label={tx('pages.ielts.shared.answered_count', {
              answered: completedTasks,
              total: totalTasks,
            })}
          />
        }
      >
        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
          {remainingTimeSec === 0 ? (
            <Alert severity="warning">{tx('pages.ielts.shared.time_is_up_notice')}</Alert>
          ) : null}

          <Alert severity="info">{tx('pages.ielts.shared.exam_strict_mode_notice')}</Alert>

          {missingParts.length ? (
            <Alert severity="info">
              {tx('pages.ielts.shared.submit_requires_writing_answers', {
                count: missingParts.length,
              })}
            </Alert>
          ) : null}

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: 1.5,
            }}
          >
            <ExamPanel
              title={
                <Stack
                  direction={{ xs: 'column', xl: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'flex-start', xl: 'center' }}
                  justifyContent="space-between"
                  sx={{ width: 1 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'common.black' }}>
                    {selectedPart
                      ? tx('pages.ielts.shared.task_label', { number: selectedPart.order })
                      : detail.title}
                  </Typography>

                  <WritingPartTabs
                    parts={writingParts}
                    selectedPartId={selectedPart?.id}
                    onSelect={handlePartChange}
                  />
                </Stack>
              }
              meta={selectedPart?.task}
              sx={{ flex: { xs: '1 1 auto', lg: '0 0 42%' } }}
              bodySx={{ fontSize: `${fontScale}rem`, lineHeight: 1.8 }}
            >
              {selectedPart ? (
                <Stack spacing={2.5}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedPart.prompt.text}
                  </Typography>

                  <WritingPromptAssets
                    imageUrls={selectedPart.prompt.imageUrls}
                    fileUrls={selectedPart.prompt.fileUrls}
                  />
                </Stack>
              ) : null}
            </ExamPanel>

            <Box
              sx={{
                display: { xs: 'none', lg: 'block' },
                width: 10,
                borderRadius: 999,
                bgcolor: 'rgba(0, 0, 0, 0.12)',
                alignSelf: 'stretch',
                my: 2,
              }}
            />

            <ExamPanel
              title={
                selectedPart ? tx('pages.ielts.shared.task_label', { number: selectedPart.order }) : detail.title
              }
              meta={
                selectedPart
                  ? `${tx('pages.ielts.shared.min_words')}: ${getWritingSuggestedMinWords(selectedPart.order)}+`
                  : undefined
              }
              actions={
                selectedPart ? (
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'common.black' }}>
                    {selectedWordCount} {tx('pages.ielts.shared.words')}
                  </Typography>
                ) : null
              }
              sx={{ flex: { xs: '1 1 auto', lg: '0 0 58%' } }}
              bodySx={{ p: 0 }}
              footer={
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {tx('pages.ielts.shared.answered_count', {
                    answered: completedTasks,
                    total: totalTasks,
                  })}
                </Typography>
              }
            >
              <Box sx={{ p: 2, height: 1 }}>
                <TextField
                  multiline
                  fullWidth
                  minRows={18}
                  value={selectedPart ? responses[String(selectedPart.id)] ?? '' : ''}
                  onChange={(event) => {
                    if (!selectedPart) {
                      return;
                    }

                    handleEssayChange(selectedPart.id, event.target.value);
                  }}
                  sx={{
                    height: 1,
                    '& .MuiInputBase-root': {
                      height: 1,
                      alignItems: 'stretch',
                      borderRadius: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    },
                    '& .MuiInputBase-inputMultiline': {
                      height: '100% !important',
                      overflow: 'auto !important',
                      fontSize: `${fontScale}rem`,
                      lineHeight: 1.8,
                    },
                  }}
                />
              </Box>
            </ExamPanel>
          </Box>
        </Stack>
      </ExamShell>

      <ConfirmDialog
        open={submitDialogOpen}
        onClose={() => setSubmitDialogOpen(false)}
        title={tx('pages.ielts.shared.submit_confirm_title')}
        cancelText={tx('pages.ielts.shared.continue')}
        content={
          <Stack spacing={1.5}>
            {remainingTimeSec === 0 ? (
              <Alert severity="warning">{tx('pages.ielts.shared.time_is_up_notice')}</Alert>
            ) : null}

            <Typography variant="body2">
              {missingParts.length
                ? tx('pages.ielts.shared.submit_requires_writing_answers', {
                    count: missingParts.length,
                  })
                : tx('pages.ielts.shared.writing_submit_confirm')}
            </Typography>
          </Stack>
        }
        action={
          <LoadingButton
            variant="contained"
            color="error"
            loading={submitWritingExamMutation.isPending}
            onClick={handleSubmit}
          >
            {tx('pages.ielts.shared.submit_test')}
          </LoadingButton>
        }
      />

      <ConfirmDialog
        open={leaveWarningOpen}
        onClose={() => setLeaveWarningOpen(false)}
        title={tx('pages.ielts.shared.leave_warning_title')}
        cancelText={tx('pages.ielts.shared.leave_warning_close')}
        content={
          <Typography variant="body2">
            {tx('pages.ielts.shared.leave_warning_description')}
          </Typography>
        }
        action={
          <LoadingButton
            variant="contained"
            color="error"
            loading={submitWritingExamMutation.isPending}
            onClick={handleFinishAfterLeaveWarning}
          >
            {tx('pages.ielts.shared.leave_warning_finish')}
          </LoadingButton>
        }
      />
    </>
  );
}
