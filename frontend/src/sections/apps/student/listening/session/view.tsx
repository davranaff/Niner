import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
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
  increaseFontScale,
} from 'src/sections/apps/student/module-test/session/utils';

import {
  ListeningPartTabs,
  ListeningSessionQuestionList,
  ListeningStrictPlayer,
} from '../components';
import {
  useListeningDetailQuery,
  useMyListeningExamsQuery,
  useSaveListeningExamDraftMutation,
  useStartListeningFlowMutation,
  useSubmitListeningExamMutation,
} from '../api/use-listening-api';
import {
  buildListeningSubmitPayload,
  clearListeningActiveExam,
  clearListeningDraftAnswers,
  findLatestUnfinishedListeningExamForTest,
  flattenListeningQuestions,
  getListeningActiveExamId,
  getListeningDraftAnswers,
  getListeningParts,
  getListeningTimeLimit,
  getListeningTotalQuestions,
  resolveListeningRemainingTimeSeconds,
  setListeningActiveExam,
  setListeningDraftAnswers,
} from '../api/utils';
import {
  buildListeningNavigatorItems,
  countAnsweredListeningQuestions,
  getListeningSelectedQuestionRangeLabel,
  getUnansweredListeningQuestions,
  listeningSessionQuerySchema,
} from '../utils';

export default function AppsListeningSessionView() {
  const { tx } = useLocales();
  const router = useRouter();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const testId = Number(params.testId || 0);
  const overallId = Number(searchParams.get('overallId') || 0);
  const preferredExamId = Number(searchParams.get('examId') || 0);

  const detailQuery = useListeningDetailQuery(testId, testId > 0);
  const examsQuery = useMyListeningExamsQuery({ enabled: testId > 0 });
  const startListeningFlowMutation = useStartListeningFlowMutation();
  const submitListeningExamMutation = useSubmitListeningExamMutation();
  const saveListeningDraftMutation = useSaveListeningExamDraftMutation();
  const { values: sessionQuery, setValues: setSessionQuery } =
    useUrlQueryState(listeningSessionQuerySchema);

  const [fontScale, setFontScale] = useState(1);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState('');
  const [remainingTimeSec, setRemainingTimeSec] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeExamId, setActiveExamId] = useState<number | null>(null);
  const [timeoutPromptShown, setTimeoutPromptShown] = useState(false);
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);

  const bootstrapTestRef = useRef<number | null>(null);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const allowExitRef = useRef(false);
  const finalizingRef = useRef(false);
  const draftSyncTimerRef = useRef<number | null>(null);

  const detail = detailQuery.data;
  const questions = useMemo(() => (detail ? flattenListeningQuestions(detail) : []), [detail]);
  const examItems = useMemo(() => examsQuery.data?.items ?? [], [examsQuery.data]);
  const listeningParts = useMemo(() => (detail ? getListeningParts(detail) : []), [detail]);
  const selectedSectionNumber = sessionQuery.section;
  const totalQuestions = useMemo(
    () => (detail ? getListeningTotalQuestions(detail) : 0),
    [detail]
  );

  useEffect(() => {
    if (
      !detail ||
      examsQuery.isLoading ||
      bootstrapTestRef.current === testId ||
      startListeningFlowMutation.isPending
    ) {
      return;
    }

    bootstrapTestRef.current = testId;

    const storedActiveExamId = getListeningActiveExamId(testId);
    const latestActiveExam = findLatestUnfinishedListeningExamForTest(testId, examItems);

    startListeningFlowMutation
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
        setListeningActiveExam(testId, exam.id);
        setAnswers(getListeningDraftAnswers(exam.id));
        setRemainingTimeSec(
          resolveListeningRemainingTimeSeconds(exam.startedAt, getListeningTimeLimit(detail))
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
    startListeningFlowMutation,
    testId,
  ]);

  const selectedPart =
    listeningParts.find((item) => item.partNumber === selectedSectionNumber) ??
    listeningParts[0] ??
    null;
  const selectedPartQuestions = questions.filter((item) => item.partId === selectedPart?.id);

  useEffect(() => {
    if (!selectedPart || selectedPart.partNumber === selectedSectionNumber) {
      return;
    }

    setSessionQuery({ section: selectedPart.partNumber });
  }, [selectedPart, selectedSectionNumber, setSessionQuery]);

  useEffect(() => {
    if (!selectedPartQuestions.length) {
      return;
    }

    const hasActiveQuestionInSelectedPart = selectedPartQuestions.some(
      (item) => String(item.question.id) === activeQuestionId
    );

    if (!hasActiveQuestionInSelectedPart) {
      setActiveQuestionId(String(selectedPartQuestions[0].question.id));
    }
  }, [activeQuestionId, selectedPartQuestions]);

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
  }, [activeQuestionId, selectedSectionNumber]);

  useEffect(() => {
    if (!activeExamId || !detail) {
      return undefined;
    }

    setListeningDraftAnswers(activeExamId, answers);

    if (draftSyncTimerRef.current) {
      window.clearTimeout(draftSyncTimerRef.current);
    }

    const payload = buildListeningSubmitPayload(detail, answers);
    draftSyncTimerRef.current = window.setTimeout(() => {
      if (finalizingRef.current) {
        return;
      }
      saveListeningDraftMutation.mutate({
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
  }, [activeExamId, answers, detail, saveListeningDraftMutation]);

  useSessionCountdown({
    attemptId: activeExamId ? String(activeExamId) : '',
    attemptStatus: activeExamId ? 'in_progress' : '',
    blocked: false,
    remainingTimeSec,
    onTick: setRemainingTimeSec,
  });

  const finalizeListeningExam = useCallback(
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

      try {
        await submitListeningExamMutation.mutateAsync({
          examId: activeExamId,
          answers: buildListeningSubmitPayload(detail, answers),
          finishReason,
        });

        clearListeningActiveExam(testId);
        clearListeningDraftAnswers(activeExamId);
        if (overallId > 0) {
          router.replace(paths.ielts.overallExamSession(String(overallId)));
        } else {
          router.replace(paths.ielts.listeningAttempt(String(activeExamId)));
        }
      } catch {
        finalizingRef.current = false;
        allowExitRef.current = false;
      }
    },
    [activeExamId, answers, detail, overallId, router, submitListeningExamMutation, testId]
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
    finalizeListeningExam({ finishReason: 'time_is_up' }).catch(() => {});
  }, [finalizeListeningExam, remainingTimeSec, timeoutPromptShown]);

  const answeredCount = useMemo(
    () => countAnsweredListeningQuestions(questions, answers),
    [answers, questions]
  );
  const unansweredQuestions = useMemo(
    () => getUnansweredListeningQuestions(questions, answers),
    [answers, questions]
  );
  const selectedQuestionRangeLabel = useMemo(
    () => getListeningSelectedQuestionRangeLabel(selectedPart),
    [selectedPart]
  );
  const navigatorItems = useMemo(
    () => buildListeningNavigatorItems(selectedPartQuestions, answers, activeQuestionId),
    [activeQuestionId, answers, selectedPartQuestions]
  );

  const handlePartChange = useCallback(
    (partNumber: number) => {
      setSessionQuery({ section: partNumber });

      const firstQuestionInPart = questions.find((item) => item.partNumber === partNumber);
      if (firstQuestionInPart) {
        setActiveQuestionId(String(firstQuestionInPart.question.id));
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

      setSessionQuery({ section: nextQuestion.partNumber });
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
    await finalizeListeningExam();
  }, [finalizeListeningExam]);

  const handleFinishAfterLeaveWarning = useCallback(async () => {
    setLeaveWarningOpen(false);
    await finalizeListeningExam({ finishReason: 'left' });
  }, [finalizeListeningExam]);

  if (detailQuery.isLoading || !detail || startListeningFlowMutation.isPending || !activeExamId) {
    return <SessionLoadingState />;
  }

  const audioUrl = detail.audioUrl || detail.voiceUrl || '';

  return (
    <>
      <ExamShell
        title={detail.title}
        subtitle={
          selectedPart
            ? tx('pages.ielts.shared.task_label', { number: selectedPart.partNumber })
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
        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
          {remainingTimeSec === 0 ? (
            <Alert severity="warning">{tx('pages.ielts.shared.time_is_up_notice')}</Alert>
          ) : null}

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                lg: 'minmax(0, 1.04fr) minmax(380px, 0.96fr)',
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
                    {selectedPart?.title || detail.title}
                  </Typography>

                  <ListeningPartTabs
                    parts={listeningParts}
                    selectedPartId={selectedPart?.id}
                    onSelect={handlePartChange}
                  />
                </Stack>
              }
              meta={
                selectedPart
                  ? `${tx('pages.ielts.shared.question_count')}: ${selectedPart.questionsCount}`
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
              <Stack spacing={2}>
                <Alert severity="info">{tx('pages.ielts.shared.exam_strict_mode_notice')}</Alert>

                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {tx('pages.ielts.shared.audio_player')}
                </Typography>

                {audioUrl ? (
                  <ListeningStrictPlayer audioUrl={audioUrl} />
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {tx('pages.ielts.shared.mock_audio_shell')}
                  </Typography>
                )}

                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {selectedPart?.title}
                </Typography>
              </Stack>
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
              {unansweredQuestions.length ? (
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
                    count: unansweredQuestions.length,
                  })}
                </Alert>
              ) : null}

              <ListeningSessionQuestionList
                part={selectedPart}
                activeQuestionId={activeQuestionId}
                answers={answers}
                questionRefs={questionRefs}
                onAnswerChange={handleAnswerChange}
              />
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
              {tx('pages.ielts.shared.submit_confirm_description', {
                count: unansweredQuestions.length,
              })}
            </Typography>
          </Stack>
        }
        action={
          <LoadingButton
            variant="contained"
            color="error"
            loading={submitListeningExamMutation.isPending}
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
            loading={submitListeningExamMutation.isPending}
            onClick={handleFinishAfterLeaveWarning}
          >
            {tx('pages.ielts.shared.leave_warning_finish')}
          </LoadingButton>
        }
      />
    </>
  );
}
