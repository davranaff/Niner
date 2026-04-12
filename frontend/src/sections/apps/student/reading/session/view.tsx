import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
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
  QuestionNavigator,
  SessionLoadingState,
} from 'src/pages/components/apps/session';
import { useSessionCountdown } from 'src/hooks/apps';
import { useExamIntegrityGuard } from 'src/sections/apps/student/module-test/session/use-exam-integrity-guard';
import {
  decreaseFontScale,
  formatSessionTimer,
  getPassageParagraphs,
  increaseFontScale,
} from 'src/sections/apps/student/module-test/session/utils';

import { ReadingPassageTabs, ReadingSessionQuestionList } from '../components';
import {
  useMyReadingExamsQuery,
  useSaveReadingExamDraftMutation,
  useReadingExamResultMutation,
  useReadingDetailQuery,
  useStartReadingFlowMutation,
  useSubmitReadingExamMutation,
} from '../api/use-reading-api';
import {
  buildReadingSubmitPayload,
  clearReadingActiveExam,
  clearReadingDraftAnswers,
  findLatestUnfinishedReadingExamForTest,
  flattenReadingQuestions,
  getReadingActiveExamId,
  getReadingDraftAnswers,
  getReadingPassages,
  getReadingTimeLimit,
  getReadingTotalQuestions,
  resolveReadingRemainingTimeSeconds,
  setReadingActiveExam,
  setReadingDraftAnswers,
  setReadingStoredResult,
  toReadingStoredResult,
} from '../api/utils';
import {
  buildReadingNavigatorItems,
  countAnsweredReadingQuestions,
  getMissingChoiceReadingQuestions,
  getReadingSelectedQuestionRangeLabel,
  getUnansweredReadingQuestions,
  readingSessionQuerySchema,
} from '../utils';

export default function AppsReadingSessionView() {
  const { tx } = useLocales();
  const router = useRouter();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const testId = Number(params.testId || 0);
  const overallId = Number(searchParams.get('overallId') || 0);
  const preferredExamId = Number(searchParams.get('examId') || 0);

  const detailQuery = useReadingDetailQuery(testId, testId > 0);
  const examsQuery = useMyReadingExamsQuery({ enabled: testId > 0 });
  const startReadingFlowMutation = useStartReadingFlowMutation();
  const submitReadingExamMutation = useSubmitReadingExamMutation();
  const saveReadingDraftMutation = useSaveReadingExamDraftMutation();
  const readingExamResultMutation = useReadingExamResultMutation();
  const { values: sessionQuery, setValues: setSessionQuery } =
    useUrlQueryState(readingSessionQuerySchema);

  const [fontScale, setFontScale] = useState(1);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState('');
  const [remainingTimeSec, setRemainingTimeSec] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeExamId, setActiveExamId] = useState<number | null>(null);
  const [activeExamStartedAt, setActiveExamStartedAt] = useState<string | null>(null);
  const [timeoutPromptShown, setTimeoutPromptShown] = useState(false);
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);

  const bootstrapTestRef = useRef<number | null>(null);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const allowExitRef = useRef(false);
  const finalizingRef = useRef(false);
  const draftSyncTimerRef = useRef<number | null>(null);

  const detail = detailQuery.data;
  const questions = useMemo(() => (detail ? flattenReadingQuestions(detail) : []), [detail]);
  const examItems = useMemo(() => examsQuery.data?.items ?? [], [examsQuery.data]);
  const readingPassages = useMemo(() => (detail ? getReadingPassages(detail) : []), [detail]);
  const selectedPassageNumber = sessionQuery.passage;
  const totalQuestions = useMemo(
    () => (detail ? getReadingTotalQuestions(detail) : 0),
    [detail]
  );

  useEffect(() => {
    if (
      !detail ||
      examsQuery.isLoading ||
      bootstrapTestRef.current === testId ||
      startReadingFlowMutation.isPending
    ) {
      return;
    }

    bootstrapTestRef.current = testId;

    const storedActiveExamId = getReadingActiveExamId(testId);
    const latestActiveExam = findLatestUnfinishedReadingExamForTest(testId, examItems);

    startReadingFlowMutation
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
        setReadingActiveExam(testId, exam.id);
        setAnswers(getReadingDraftAnswers(exam.id));
        setRemainingTimeSec(
          resolveReadingRemainingTimeSeconds(exam.startedAt, getReadingTimeLimit(detail))
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
    startReadingFlowMutation,
    testId,
  ]);

  const selectedPassage =
    readingPassages.find((item) => item.passageNumber === selectedPassageNumber) ??
    readingPassages[0] ??
    null;
  const selectedPassageQuestions = questions.filter((item) => item.partId === selectedPassage?.id);

  useEffect(() => {
    if (!selectedPassage || selectedPassage.passageNumber === selectedPassageNumber) {
      return;
    }

    setSessionQuery({ passage: selectedPassage.passageNumber });
  }, [selectedPassage, selectedPassageNumber, setSessionQuery]);

  useEffect(() => {
    if (!selectedPassageQuestions.length) {
      return;
    }

    const hasActiveQuestionInSelectedPassage = selectedPassageQuestions.some(
      (item) => String(item.question.id) === activeQuestionId
    );

    if (!hasActiveQuestionInSelectedPassage) {
      setActiveQuestionId(String(selectedPassageQuestions[0].question.id));
    }
  }, [activeQuestionId, selectedPassageQuestions]);

  useEffect(() => {
    if (!activeQuestionId) {
      return;
    }

    window.requestAnimationFrame(() => {
      questionRefs.current[activeQuestionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }, [activeQuestionId, selectedPassageNumber]);

  useEffect(() => {
    if (!activeExamId || !detail) {
      return undefined;
    }

    setReadingDraftAnswers(activeExamId, answers);

    if (draftSyncTimerRef.current) {
      window.clearTimeout(draftSyncTimerRef.current);
    }

    const payload = buildReadingSubmitPayload(detail, answers);
    draftSyncTimerRef.current = window.setTimeout(() => {
      if (finalizingRef.current) {
        return;
      }
      saveReadingDraftMutation.mutate({
        examId: activeExamId,
        answers: payload,
      });
    }, 700);

    return () => {
      if (draftSyncTimerRef.current) {
        window.clearTimeout(draftSyncTimerRef.current);
        draftSyncTimerRef.current = null;
      }
    };
  }, [activeExamId, answers, detail, saveReadingDraftMutation]);

  useSessionCountdown({
    attemptId: activeExamId ? String(activeExamId) : '',
    attemptStatus: activeExamId ? 'in_progress' : '',
    blocked: false,
    remainingTimeSec,
    onTick: setRemainingTimeSec,
  });

  const finalizeReadingExam = useCallback(
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

      try {
        const submitResult = await submitReadingExamMutation.mutateAsync({
          examId: activeExamId,
          answers: buildReadingSubmitPayload(detail, answers),
          finishReason,
        });
        const canonicalResult = await readingExamResultMutation
          .mutateAsync(activeExamId)
          .catch(() => submitResult);

        setReadingStoredResult(
          toReadingStoredResult({
            exam: {
              id: activeExamId,
              userId: 0,
              startedAt,
              finishedAt,
              finishReason: finishReason ?? null,
              testId,
              kind: 'reading',
              status: 'completed',
            },
            detail,
            submitResult: canonicalResult,
            finishedAt,
          })
        );

        clearReadingActiveExam(testId);
        clearReadingDraftAnswers(activeExamId);
        if (overallId > 0) {
          router.replace(paths.ielts.overallExamSession(String(overallId)));
        } else {
          router.replace(paths.ielts.readingAttempt(String(activeExamId)));
        }
      } catch {
        finalizingRef.current = false;
        allowExitRef.current = false;
      }
    },
    [
      activeExamId,
      activeExamStartedAt,
      answers,
      detail,
      overallId,
      readingExamResultMutation,
      router,
      submitReadingExamMutation,
      testId,
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
    finalizeReadingExam({ finishReason: 'time_is_up' }).catch(() => {});
  }, [finalizeReadingExam, remainingTimeSec, timeoutPromptShown]);

  const passageParagraphs = getPassageParagraphs(selectedPassage?.content);
  const answeredCount = useMemo(
    () => countAnsweredReadingQuestions(questions, answers),
    [answers, questions]
  );
  const unansweredQuestions = useMemo(
    () => getUnansweredReadingQuestions(questions, answers),
    [answers, questions]
  );
  const missingChoiceQuestions = useMemo(
    () => getMissingChoiceReadingQuestions(questions, answers),
    [answers, questions]
  );
  const selectedQuestionRangeLabel = useMemo(
    () => getReadingSelectedQuestionRangeLabel(selectedPassage),
    [selectedPassage]
  );
  const navigatorItems = useMemo(
    () => buildReadingNavigatorItems(selectedPassageQuestions, answers, activeQuestionId),
    [activeQuestionId, answers, selectedPassageQuestions]
  );

  const handlePassageChange = useCallback(
    (passageNumber: number) => {
      setSessionQuery({ passage: passageNumber });

      const firstQuestionInPassage = questions.find((item) => item.passageNumber === passageNumber);
      if (firstQuestionInPassage) {
        setActiveQuestionId(String(firstQuestionInPassage.question.id));
      }
    },
    [questions, setSessionQuery]
  );

  const handleQuestionSelect = useCallback(
    (questionId: string) => {
      const nextQuestion = questions.find((item) => String(item.question.id) === questionId);

      if (!nextQuestion) {
        return;
      }

      setSessionQuery({ passage: nextQuestion.passageNumber });
      setActiveQuestionId(questionId);
    },
    [questions, setSessionQuery]
  );

  const handleAnswerChange = useCallback((questionId: number, value: string) => {
    setAnswers((previous) => ({
      ...previous,
      [String(questionId)]: value,
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    await finalizeReadingExam();
  }, [finalizeReadingExam]);

  const handleFinishAfterLeaveWarning = useCallback(async () => {
    setLeaveWarningOpen(false);
    await finalizeReadingExam({ finishReason: 'left' });
  }, [finalizeReadingExam]);

  if (detailQuery.isLoading || !detail || startReadingFlowMutation.isPending || !activeExamId) {
    return <SessionLoadingState />;
  }

  return (
    <>
      <ExamShell
        title={detail.title}
        subtitle={
          selectedPassage
            ? tx('pages.ielts.shared.passage_label', { number: selectedPassage.passageNumber })
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
              answered: answeredCount,
              total: totalQuestions,
            })}
          />
        }
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'minmax(0, 1.08fr) minmax(380px, 0.92fr)',
            },
            gridTemplateRows: {
              xs: 'minmax(0, 38dvh) minmax(0, 1fr)',
              md: 'minmax(0, 34dvh) minmax(0, 1fr)',
              lg: '1fr',
            },
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
                  {selectedPassage?.title || tx('pages.ielts.shared.no_passage')}
                </Typography>

                <ReadingPassageTabs
                  passages={readingPassages}
                  selectedPassageId={selectedPassage?.id}
                  onSelect={handlePassageChange}
                />
              </Stack>
            }
            meta={
              selectedPassage
                ? `${tx('pages.ielts.shared.question_count')}: ${selectedPassage.questionsCount}`
                : undefined
            }
            bodySx={{
              px: { xs: 1.5, md: 2.5 },
              py: { xs: 1.5, md: 2.25 },
              fontSize: `${fontScale}rem`,
              lineHeight: 1.8,
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
            }}
          >
            {passageParagraphs.length ? (
              <Stack spacing={2.5} sx={{ maxWidth: 780 }}>
                {passageParagraphs.map((paragraph) => (
                  <Typography key={paragraph} variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {paragraph}
                  </Typography>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.shared.no_passage')}
              </Typography>
            )}
          </ExamPanel>

          <ExamPanel
            title={tx('pages.ielts.shared.questions')}
            meta={
              selectedQuestionRangeLabel
                ? `${tx('pages.ielts.shared.answered_count', {
                    answered: answeredCount,
                    total: totalQuestions,
                  })} • ${tx('pages.ielts.shared.questions')} ${selectedQuestionRangeLabel}`
                : tx('pages.ielts.shared.answered_count', {
                    answered: answeredCount,
                    total: totalQuestions,
                  })
            }
            footer={
              <Box
                sx={{
                  maxHeight: { xs: 72, md: 80 },
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  pr: 0.25,
                }}
              >
                <QuestionNavigator items={navigatorItems} onSelect={handleQuestionSelect} />
              </Box>
            }
            bodySx={{
              px: { xs: 1, md: 1.25 },
              py: { xs: 1, md: 1.25 },
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
            }}
          >
            {remainingTimeSec === 0 ? (
              <Alert
                severity="warning"
                sx={{
                  py: 0,
                  '& .MuiAlert-icon, & .MuiAlert-message': {
                    py: 0.5,
                  },
                }}
              >
                {tx('pages.ielts.shared.time_is_up_notice')}
              </Alert>
            ) : null}

            <Alert
              severity="info"
              sx={{
                py: 0,
                '& .MuiAlert-icon, & .MuiAlert-message': {
                  py: 0.5,
                },
              }}
            >
              {tx('pages.ielts.shared.exam_strict_mode_notice')}
            </Alert>

            {missingChoiceQuestions.length ? (
              <Alert
                severity="info"
                sx={{
                  py: 0,
                  '& .MuiAlert-icon, & .MuiAlert-message': {
                    py: 0.5,
                  },
                }}
              >
                {tx('pages.ielts.shared.submit_requires_choice_answers', {
                  count: missingChoiceQuestions.length,
                })}
              </Alert>
            ) : null}

            <ReadingSessionQuestionList
              passage={selectedPassage}
              activeQuestionId={activeQuestionId}
              answers={answers}
              questionRefs={questionRefs}
              onAnswerChange={handleAnswerChange}
            />
          </ExamPanel>
        </Box>
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
              {missingChoiceQuestions.length
                ? tx('pages.ielts.shared.submit_requires_choice_answers', {
                    count: missingChoiceQuestions.length,
                  })
                : tx('pages.ielts.shared.submit_confirm_description', {
                    count: unansweredQuestions.length,
                  })}
            </Typography>
          </Stack>
        }
        action={
          <LoadingButton
            variant="contained"
            color="error"
            loading={submitReadingExamMutation.isPending}
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
            loading={submitReadingExamMutation.isPending}
            onClick={handleFinishAfterLeaveWarning}
          >
            {tx('pages.ielts.shared.leave_warning_finish')}
          </LoadingButton>
        }
      />
    </>
  );
}
