import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useLocales } from 'src/locales';
import { useRouter } from 'src/routes/hook';
import type { ActiveIeltsModule, MockQuestionAnswerValue } from 'src/_mock/ielts';
import ConfirmDialog from 'src/components/custom-dialog/confirm-dialog';
import EmptyContent from 'src/components/empty-content';
import {
  ExamPanel,
  ExamShell,
  IntegrityBlockedDialog,
  QuestionNavigator,
  SessionLoadingState,
} from 'src/pages/components/apps/session';
import {
  useSessionAttemptBootstrap,
  useSessionCountdown,
  useSessionIntegrityGuard,
  useSessionTimeoutEffect,
} from 'src/hooks/apps';
import {
  useAttemptHeartbeatMutation,
  useSaveAttemptAnswerMutation,
  useSessionQuery,
  useStartAttemptMutation,
  useSubmitAttemptMutation,
  useTerminateAttemptMutation,
  useTestDetailsQuery,
} from 'src/sections/apps/common/api/use-apps';
import { getModuleAttemptPath } from 'src/sections/apps/common/module-test/utils/module-meta';

import {
  decreaseFontScale,
  formatSessionTimer,
  getPassageParagraphs,
  hasAnswerValue,
  increaseFontScale,
} from './utils';
import { QuestionAnswerFields } from './components/question-answer-fields';

type ObjectiveSessionViewProps = {
  module: Extract<ActiveIeltsModule, 'reading' | 'listening'>;
  testId: string;
};

export function ObjectiveSessionView({ module, testId }: ObjectiveSessionViewProps) {
  const { tx } = useLocales();
  const router = useRouter();

  const [resolvedAttemptId, setResolvedAttemptId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [remainingTimeSec, setRemainingTimeSec] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, MockQuestionAnswerValue>>({});
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);
  const [playerRunning, setPlayerRunning] = useState(false);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [activeQuestionId, setActiveQuestionId] = useState('');

  const startAttemptMutation = useStartAttemptMutation();
  const detailQuery = useTestDetailsQuery(module, testId);
  const sessionQuery = useSessionQuery(resolvedAttemptId);
  const saveAnswerMutation = useSaveAttemptAnswerMutation();
  const heartbeatMutation = useAttemptHeartbeatMutation();
  const submitAttemptMutation = useSubmitAttemptMutation();
  const terminateAttemptMutation = useTerminateAttemptMutation();

  const initializedAttemptRef = useRef('');
  const integrityTriggeredRef = useRef(false);
  const allowExitRef = useRef(false);
  const finalizingRef = useRef(false);
  const remainingTimeRef = useRef(0);
  const currentSectionRef = useRef('');
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useSessionAttemptBootstrap({
    detailData: detailQuery.data,
    resolvedAttemptId,
    testId,
    onResolve: setResolvedAttemptId,
    startAttempt: startAttemptMutation.mutateAsync,
  });

  useEffect(() => {
    if (!sessionQuery.data) {
      return;
    }

    const currentAttemptId = sessionQuery.data.attempt.id;
    if (initializedAttemptRef.current === currentAttemptId) {
      return;
    }

    initializedAttemptRef.current = currentAttemptId;
    setSelectedSectionId(
      sessionQuery.data.attempt.currentSectionId || sessionQuery.data.sections[0]?.id || ''
    );
    setRemainingTimeSec(sessionQuery.data.attempt.remainingTimeSec);
    setAnswers(
      Object.fromEntries(
        Object.entries(sessionQuery.data.attempt.answers).map(([questionId, answer]) => [
          questionId,
          answer.value,
        ])
      )
    );
    setBlockedDialogOpen(
      sessionQuery.data.attempt.status === 'terminated' &&
        sessionQuery.data.attempt.finishReason === 'tab_switch'
    );
  }, [sessionQuery.data]);

  const sessionData = sessionQuery.data;
  const activeAttempt = sessionData?.attempt;
  const activeAttemptId = activeAttempt?.id || '';
  const activeAttemptStatus = activeAttempt?.status || '';
  const currentSection =
    sessionData?.sections.find((section) => section.id === selectedSectionId) ||
    sessionData?.sections[0];
  const listeningDuration = currentSection?.audioDurationSec || 1;
  const currentQuestions = useMemo(
    () =>
      sessionData
        ? sessionData.questions.filter((question) => question.sectionId === currentSection?.id)
        : [],
    [currentSection?.id, sessionData]
  );
  const answeredCount = sessionData
    ? sessionData.questions.filter((question) => hasAnswerValue(answers[question.id])).length
    : 0;
  const totalQuestions = sessionData?.questions.length || 0;
  const progress = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const unansweredCount = totalQuestions - answeredCount;
  const effectiveRemainingTimeSec = remainingTimeSec ?? activeAttempt?.remainingTimeSec ?? 0;
  const currentPassage = currentSection?.passageId
    ? sessionData?.passages.find((passage) => passage.id === currentSection.passageId) || null
    : null;
  const passageParagraphs = getPassageParagraphs(currentPassage?.body);
  const questionNavigatorItems = currentQuestions.map((question) => ({
    id: question.id,
    label: String(question.number),
    answered: hasAnswerValue(answers[question.id]),
    active: question.id === activeQuestionId,
  }));

  useEffect(() => {
    remainingTimeRef.current = effectiveRemainingTimeSec;
    currentSectionRef.current = currentSection?.id || '';
  }, [currentSection?.id, effectiveRemainingTimeSec]);

  useEffect(() => {
    setActiveQuestionId(currentQuestions[0]?.id || '');
  }, [currentQuestions]);

  useEffect(() => {
    if (module !== 'listening') {
      return;
    }

    setPlayerRunning(false);
    setPlayerProgress(0);
  }, [currentSection?.id, module]);

  useSessionIntegrityGuard({
    attemptId: activeAttemptId,
    attemptStatus: activeAttemptStatus,
    allowExitRef,
    integrityTriggeredRef,
    remainingTimeRef,
    onBlocked: () => setBlockedDialogOpen(true),
  });

  useSessionCountdown({
    attemptId: activeAttemptId,
    attemptStatus: activeAttemptStatus,
    blocked: blockedDialogOpen,
    remainingTimeSec,
    onTick: setRemainingTimeSec,
  });

  const handleTimeout = useCallback(async () => {
    allowExitRef.current = true;

    try {
      const attempt = await terminateAttemptMutation.mutateAsync({
        attemptId: activeAttemptId,
        reason: 'timeout',
        remainingTimeSec: 0,
      });
      router.replace(getModuleAttemptPath(module, attempt.id));
    } catch {
      allowExitRef.current = false;
      throw new Error('timeout_termination_failed');
    }
  }, [activeAttemptId, module, router, terminateAttemptMutation]);

  useSessionTimeoutEffect({
    attemptId: activeAttemptId,
    attemptStatus: activeAttemptStatus,
    remainingTimeSec,
    finalizingRef,
    onTimeout: handleTimeout,
  });

  useEffect(() => {
    if (!activeAttemptId || activeAttemptStatus !== 'in_progress') {
      return undefined;
    }

    const interval = window.setInterval(() => {
      heartbeatMutation.mutate({
        attemptId: activeAttemptId,
        remainingTimeSec: remainingTimeRef.current,
        currentSectionId: currentSectionRef.current,
      });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [activeAttemptId, activeAttemptStatus, heartbeatMutation]);

  useEffect(() => {
    if (module !== 'listening' || !playerRunning || !currentSection?.audioDurationSec) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setPlayerProgress((previous) => {
        const next = previous + 100 / listeningDuration;
        return next >= 100 ? 100 : next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [currentSection?.audioDurationSec, listeningDuration, module, playerRunning]);

  const handleAnswerChange = useCallback(
    (questionId: string, value: MockQuestionAnswerValue) => {
      if (!activeAttempt) return;

      setAnswers((previous) => ({ ...previous, [questionId]: value }));
      saveAnswerMutation.mutate({
        attemptId: activeAttempt.id,
        questionId,
        value,
        remainingTimeSec: remainingTimeRef.current,
        currentSectionId: currentSectionRef.current,
      });
    },
    [activeAttempt, saveAnswerMutation]
  );

  const handleSubmit = useCallback(async () => {
    if (!activeAttempt) return;

    finalizingRef.current = true;
    allowExitRef.current = true;

    try {
      const attempt = await submitAttemptMutation.mutateAsync({
        attemptId: activeAttempt.id,
        remainingTimeSec: effectiveRemainingTimeSec,
      });
      router.push(getModuleAttemptPath(module, attempt.id));
    } catch {
      finalizingRef.current = false;
      allowExitRef.current = false;
    }
  }, [activeAttempt, effectiveRemainingTimeSec, module, router, submitAttemptMutation]);

  const handleQuestionSelect = useCallback((questionId: string) => {
    setActiveQuestionId(questionId);
    questionRefs.current[questionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (
    detailQuery.isLoading ||
    startAttemptMutation.isPending ||
    !resolvedAttemptId ||
    sessionQuery.isLoading ||
    !sessionData
  ) {
    return <SessionLoadingState />;
  }

  const stableAttempt = sessionData.attempt;
  const questionProgressLabel = `${progress}%`;

  let passageContent = <EmptyContent title={tx('pages.ielts.shared.no_passage')} />;
  if (currentPassage) {
    if (passageParagraphs.length) {
      passageContent = (
        <Stack spacing={2}>
          {passageParagraphs.map((paragraph, index) => (
            <Typography key={`${currentPassage.id}-${index}`} variant="body1" lineHeight={1.8}>
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  mr: 1,
                  px: 0.75,
                  py: 0.125,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  bgcolor: 'rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                }}
              >
                {String.fromCharCode(65 + index)}
              </Box>
              {paragraph}
            </Typography>
          ))}
        </Stack>
      );
    } else if (currentPassage.supportingNote) {
      passageContent = (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {currentPassage.supportingNote}
        </Typography>
      );
    }
  }

  return (
    <ExamShell
      title={sessionData.test.title}
      subtitle={currentSection?.title || detailQuery.data?.test.description}
      timerLabel={formatSessionTimer(effectiveRemainingTimeSec)}
      timerWarning={effectiveRemainingTimeSec < 300}
      onDecreaseFontSize={() => setFontScale(decreaseFontScale)}
      onIncreaseFontSize={() => setFontScale(increaseFontScale)}
      submitLabel={tx('pages.ielts.shared.submit_test')}
      onSubmit={() => setSubmitDialogOpen(true)}
      extraActions={
        module === 'listening' ? (
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setPlayerRunning((previous) => !previous)}
            sx={{
              borderRadius: 999,
              fontWeight: 700,
              color: 'common.black',
              borderColor: 'rgba(0, 0, 0, 0.12)',
              bgcolor: 'rgba(0, 0, 0, 0.04)',
            }}
          >
            {playerRunning ? tx('pages.ielts.shared.pause') : tx('pages.ielts.shared.play')}
          </Button>
        ) : null
      }
    >
      <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
        {stableAttempt.status !== 'in_progress' ? (
          <Alert severity={stableAttempt.finishReason === 'tab_switch' ? 'error' : 'warning'}>
            {stableAttempt.finishReason === 'tab_switch'
              ? tx('pages.ielts.shared.integrity_terminated')
              : tx('pages.ielts.shared.session_locked')}
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
            title={currentPassage?.title || currentSection?.title || sessionData.test.title}
            meta={currentSection?.instructions}
            actions={
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {sessionData.sections.map((section) => (
                  <Button
                    key={section.id}
                    size="small"
                    variant={section.id === currentSection?.id ? 'contained' : 'outlined'}
                    color={section.id === currentSection?.id ? 'inherit' : 'inherit'}
                    onClick={() => setSelectedSectionId(section.id)}
                    sx={{ minWidth: 40, borderRadius: 999, fontWeight: 700 }}
                  >
                    {section.order}
                  </Button>
                ))}
              </Stack>
            }
            sx={{ flex: { xs: '1 1 auto', lg: '0 0 58%' } }}
            bodySx={{ fontSize: `${fontScale}rem` }}
          >
            <Stack spacing={2.5}>
              {module === 'listening' ? (
                <Box
                  sx={(theme) => ({
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid rgba(0, 0, 0, 0.1)`,
                    bgcolor: 'rgba(255, 255, 255, 0.35)',
                  })}
                >
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2">
                      {tx('pages.ielts.shared.audio_player')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {currentSection?.audioLabel || tx('pages.ielts.shared.mock_audio_shell')}
                    </Typography>
                    <LinearProgress variant="determinate" value={playerProgress} color="inherit" />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {currentPassage?.supportingNote || tx('pages.ielts.shared.audio_progress')}
                    </Typography>
                  </Stack>
                </Box>
              ) : null}

              {currentSection?.instructions ? (
                <Alert severity="info">{currentSection.instructions}</Alert>
              ) : null}

              {passageContent}
            </Stack>
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
            title={currentSection?.title || sessionData.test.title}
            meta={tx('pages.ielts.shared.answered_count', {
              answered: answeredCount,
              total: totalQuestions,
            })}
            sx={{ flex: { xs: '1 1 auto', lg: '0 0 42%' } }}
            footer={
              currentQuestions.length ? (
                <QuestionNavigator items={questionNavigatorItems} onSelect={handleQuestionSelect} />
              ) : null
            }
          >
            <Stack spacing={2}>
              <Stack spacing={1.25}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.25}
                  justifyContent="space-between"
                >
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {tx('pages.ielts.shared.answered_count', {
                      answered: answeredCount,
                      total: totalQuestions,
                    })}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {questionProgressLabel}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={progress} />
              </Stack>

              {currentQuestions.length ? (
                currentQuestions.map((question) => {
                  const isAnswered = hasAnswerValue(answers[question.id]);
                  const isActive = question.id === activeQuestionId;
                  let borderColor = 'rgba(0, 0, 0, 0.1)';
                  let backgroundColor = 'transparent';

                  if (isActive) {
                    borderColor = 'rgba(0, 0, 0, 0.36)';
                    backgroundColor = 'rgba(0, 0, 0, 0.03)';
                  } else if (isAnswered) {
                    borderColor = 'rgba(0, 0, 0, 0.18)';
                    backgroundColor = 'rgba(0, 0, 0, 0.015)';
                  }

                  return (
                    <Box
                      key={question.id}
                      ref={(node: HTMLDivElement | null) => {
                        questionRefs.current[question.id] = node;
                      }}
                      onFocusCapture={() => setActiveQuestionId(question.id)}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${borderColor}`,
                        bgcolor: backgroundColor,
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Stack spacing={0.75}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {tx('pages.ielts.shared.question_label', { number: question.number })}
                          </Typography>
                          <Typography variant="body2">{question.prompt}</Typography>
                          {question.instructions ? (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {question.instructions}
                            </Typography>
                          ) : null}
                        </Stack>

                        <QuestionAnswerFields
                          question={question}
                          value={answers[question.id]}
                          onChange={(value) => handleAnswerChange(question.id, value)}
                          disabled={stableAttempt.status !== 'in_progress'}
                        />
                      </Stack>
                    </Box>
                  );
                })
              ) : (
                <EmptyContent title={tx('pages.ielts.shared.no_questions')} />
              )}
            </Stack>
          </ExamPanel>
        </Box>
      </Stack>

      <ConfirmDialog
        open={submitDialogOpen}
        onClose={() => setSubmitDialogOpen(false)}
        title={tx('pages.ielts.shared.submit_confirm_title')}
        content={
          unansweredCount > 0
            ? tx('pages.ielts.shared.submit_confirm_description', { count: unansweredCount })
            : tx('pages.ielts.shared.submit_test')
        }
        action={
          <Button variant="contained" color="inherit" onClick={handleSubmit}>
            {tx('pages.ielts.shared.submit_test')}
          </Button>
        }
      />

      <IntegrityBlockedDialog
        open={blockedDialogOpen}
        onOpenResult={() => {
          allowExitRef.current = true;
          router.replace(getModuleAttemptPath(module, stableAttempt.id));
        }}
      />
    </ExamShell>
  );
}
