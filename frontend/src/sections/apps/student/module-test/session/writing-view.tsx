import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useLocales } from 'src/locales';
import { useRouter } from 'src/routes/hook';
import ConfirmDialog from 'src/components/custom-dialog/confirm-dialog';
import {
  ExamPanel,
  ExamShell,
  IntegrityBlockedDialog,
  SessionLoadingState,
} from 'src/pages/components/apps/session';
import {
  useSessionAttemptBootstrap,
  useSessionCountdown,
  useSessionIntegrityGuard,
  useSessionTimeoutEffect,
} from 'src/hooks/apps';
import {
  useSaveWritingDraftMutation,
  useSessionQuery,
  useStartAttemptMutation,
  useSubmitAttemptMutation,
  useTerminateAttemptMutation,
  useTestDetailsQuery,
} from 'src/sections/apps/common/api/use-apps';
import { getModuleAttemptPath } from 'src/sections/apps/common/module-test/utils/module-meta';
import { countWords } from 'src/sections/apps/common/module-test/utils/scoring';

import { decreaseFontScale, formatSessionTimer, increaseFontScale } from './utils';

type WritingSessionViewProps = {
  testId: string;
};

export function WritingSessionView({ testId }: WritingSessionViewProps) {
  const { tx } = useLocales();
  const router = useRouter();

  const [resolvedAttemptId, setResolvedAttemptId] = useState('');
  const [remainingTimeSec, setRemainingTimeSec] = useState<number | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [activePromptId, setActivePromptId] = useState('');

  const startAttemptMutation = useStartAttemptMutation();
  const detailQuery = useTestDetailsQuery('writing', testId);
  const sessionQuery = useSessionQuery(resolvedAttemptId);
  const saveDraftMutation = useSaveWritingDraftMutation();
  const submitAttemptMutation = useSubmitAttemptMutation();
  const terminateAttemptMutation = useTerminateAttemptMutation();

  const initializedAttemptRef = useRef('');
  const integrityTriggeredRef = useRef(false);
  const allowExitRef = useRef(false);
  const finalizingRef = useRef(false);
  const remainingTimeRef = useRef(0);

  useSessionAttemptBootstrap({
    detailData: detailQuery.data,
    resolvedAttemptId,
    testId,
    onResolve: setResolvedAttemptId,
    startAttempt: startAttemptMutation.mutateAsync,
  });

  useEffect(() => {
    if (!sessionQuery.data) return;

    const currentAttemptId = sessionQuery.data.attempt.id;
    if (initializedAttemptRef.current === currentAttemptId) return;

    initializedAttemptRef.current = currentAttemptId;
    setRemainingTimeSec(sessionQuery.data.attempt.remainingTimeSec);
    setResponses(sessionQuery.data.writingSubmission?.responses || {});
    setBlockedDialogOpen(
      sessionQuery.data.attempt.status === 'terminated' &&
        sessionQuery.data.attempt.finishReason === 'tab_switch'
    );
  }, [sessionQuery.data]);

  const sessionData = sessionQuery.data;
  const activeAttempt = sessionData?.attempt;
  const activeAttemptId = activeAttempt?.id || '';
  const activeAttemptStatus = activeAttempt?.status || '';
  const effectiveRemainingTimeSec = remainingTimeSec ?? activeAttempt?.remainingTimeSec ?? 0;
  const prompts = useMemo(() => sessionData?.writingPrompts || [], [sessionData?.writingPrompts]);
  const wordCounts = useMemo(
    () =>
      prompts.reduce<Record<string, number>>((acc, prompt) => {
        acc[prompt.id] = countWords(responses[prompt.id] || '');
        return acc;
      }, {}),
    [prompts, responses]
  );
  const activePrompt = prompts.find((prompt) => prompt.id === activePromptId) || prompts[0];

  useEffect(() => {
    if (!activePromptId && prompts[0]) {
      setActivePromptId(prompts[0].id);
      return;
    }

    if (activePromptId && !prompts.some((prompt) => prompt.id === activePromptId)) {
      setActivePromptId(prompts[0]?.id || '');
    }
  }, [activePromptId, prompts]);

  useEffect(() => {
    remainingTimeRef.current = effectiveRemainingTimeSec;
  }, [effectiveRemainingTimeSec]);

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
      router.replace(getModuleAttemptPath('writing', attempt.id));
    } catch {
      allowExitRef.current = false;
      throw new Error('timeout_termination_failed');
    }
  }, [activeAttemptId, router, terminateAttemptMutation]);

  useSessionTimeoutEffect({
    attemptId: activeAttemptId,
    attemptStatus: activeAttemptStatus,
    remainingTimeSec,
    finalizingRef,
    onTimeout: handleTimeout,
  });

  const handleDraftChange = useCallback(
    (promptId: string, content: string) => {
      if (!activeAttempt) return;

      setResponses((previous) => ({ ...previous, [promptId]: content }));
      saveDraftMutation.mutate({
        attemptId: activeAttempt.id,
        promptId,
        content,
        remainingTimeSec: remainingTimeRef.current,
      });
    },
    [activeAttempt, saveDraftMutation]
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
      router.push(getModuleAttemptPath('writing', attempt.id));
    } catch {
      finalizingRef.current = false;
      allowExitRef.current = false;
    }
  }, [activeAttempt, effectiveRemainingTimeSec, router, submitAttemptMutation]);

  if (
    detailQuery.isLoading ||
    startAttemptMutation.isPending ||
    !resolvedAttemptId ||
    sessionQuery.isLoading ||
    !sessionData
  ) {
    return <SessionLoadingState />;
  }

  return (
    <ExamShell
      title={sessionData.test.title}
      subtitle={activePrompt?.title || detailQuery.data?.test.description}
      timerLabel={formatSessionTimer(effectiveRemainingTimeSec)}
      timerWarning={effectiveRemainingTimeSec < 300}
      onDecreaseFontSize={() => setFontScale(decreaseFontScale)}
      onIncreaseFontSize={() => setFontScale(increaseFontScale)}
      submitLabel={tx('pages.ielts.shared.submit_test')}
      onSubmit={() => setSubmitDialogOpen(true)}
    >
      <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
        {activeAttempt?.status !== 'in_progress' ? (
          <Alert severity={activeAttempt?.finishReason === 'tab_switch' ? 'error' : 'warning'}>
            {activeAttempt?.finishReason === 'tab_switch'
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
            title={activePrompt?.title || sessionData.test.title}
            meta={activePrompt?.taskLabel}
            actions={
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {prompts.map((prompt) => (
                  <Button
                    key={prompt.id}
                    size="small"
                    variant={prompt.id === activePrompt?.id ? 'contained' : 'outlined'}
                    color="inherit"
                    onClick={() => setActivePromptId(prompt.id)}
                    sx={{ borderRadius: 999, fontWeight: 700 }}
                  >
                    {prompt.taskLabel}
                  </Button>
                ))}
              </Stack>
            }
            sx={{ flex: { xs: '1 1 auto', lg: '0 0 42%' } }}
            bodySx={{ fontSize: `${fontScale}rem` }}
          >
            {activePrompt ? (
              <Stack spacing={2.5}>
                <Typography variant="body1" lineHeight={1.8}>
                  {activePrompt.prompt}
                </Typography>

                {activePrompt.chartSummary ? (
                  <Alert severity="info">{activePrompt.chartSummary}</Alert>
                ) : null}

                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                  {activePrompt.guidance}
                </Typography>

                <Stack spacing={1}>
                  {sessionData.test.instructions.map((instruction) => (
                    <Typography key={instruction} variant="body2" sx={{ color: 'text.secondary' }}>
                      {instruction}
                    </Typography>
                  ))}
                </Stack>
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
            title={activePrompt?.taskLabel || sessionData.test.title}
            meta={
              activePrompt
                ? `${tx('pages.ielts.shared.min_words')}: ${activePrompt.minWords}+`
                : undefined
            }
            actions={
              activePrompt ? (
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'common.black' }}>
                  {wordCounts[activePrompt.id] || 0} {tx('pages.ielts.shared.words')}
                </Typography>
              ) : null
            }
            sx={{ flex: { xs: '1 1 auto', lg: '0 0 58%' } }}
            bodySx={{ p: 0 }}
            footer={
              activePrompt ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {tx('pages.ielts.shared.answered_count', {
                    answered: prompts.filter(
                      (prompt) => (responses[prompt.id] || '').trim().length > 0
                    ).length,
                    total: prompts.length,
                  })}
                </Typography>
              ) : null
            }
          >
            <Box sx={{ p: 2, height: 1 }}>
              <TextField
                multiline
                fullWidth
                minRows={18}
                value={activePrompt ? responses[activePrompt.id] || '' : ''}
                disabled={activeAttempt?.status !== 'in_progress'}
                onChange={(event) => {
                  if (!activePrompt) return;
                  handleDraftChange(activePrompt.id, event.target.value);
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

      <ConfirmDialog
        open={submitDialogOpen}
        onClose={() => setSubmitDialogOpen(false)}
        title={tx('pages.ielts.shared.submit_confirm_title')}
        content={tx('pages.ielts.shared.writing_submit_confirm')}
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
          router.replace(getModuleAttemptPath('writing', activeAttempt?.id || ''));
        }}
      />
    </ExamShell>
  );
}
