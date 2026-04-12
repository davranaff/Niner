import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import GlobalStyles from '@mui/material/GlobalStyles';
import { alpha } from '@mui/material/styles';

import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';
import { useParams, useRouter, useSearchParams } from 'src/routes/hook';
import { appendBreadcrumbFromMyTests, isBreadcrumbFromMyTests } from 'src/routes/breadcrumb-from';
import { SessionLoadingState } from 'src/pages/components/apps/session';

import {
  findLatestUnfinishedSpeakingExamForTest,
  getSpeakingActiveExamId,
  setSpeakingActiveExam,
} from '../api/utils';
import { fetchSpeakingSession } from '../api/speaking-requests';
import {
  useMySpeakingExamsQuery,
  useSpeakingDetailQuery,
  useStartSpeakingFlowMutation,
} from '../api/use-speaking-api';
import { createSpeakingSessionSnapshot } from '../services/speaking-session-store';
import { useSpeakingExamGuard } from '../hooks/use-speaking-exam-guard';
import { useSpeakingLiveSession } from '../hooks/use-speaking-live-session';
import type { SpeakingAttempt, SpeakingSessionSnapshot } from '../types';

type RuntimeProps = {
  examId: number;
  initialSnapshot: SpeakingSessionSnapshot;
  onFinalized: (attempt: SpeakingAttempt) => void;
};

function VoiceOrb({
  speaker,
  level,
}: {
  speaker: 'examiner' | 'user' | 'none';
  level: number;
}) {
  const orbScale = 1 + Math.min(0.38, level * 0.55);
  const haloScale = 1.1 + Math.min(0.72, level * 0.9);
  const ringOpacity = speaker === 'none' ? 0.28 : 0.65;

  return (
    <Box
      sx={{
        position: 'relative',
        width: { xs: 196, md: 264 },
        height: { xs: 196, md: 264 },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: -54,
          borderRadius: '50%',
          filter: 'blur(44px)',
          transition: 'transform 120ms linear, opacity 120ms linear',
          transform: `scale(${haloScale})`,
          bgcolor: (theme) => {
            if (speaker === 'examiner') {
              return alpha(theme.palette.warning.main, 0.5);
            }
            if (speaker === 'user') {
              return alpha(theme.palette.primary.main, 0.5);
            }
            return alpha(theme.palette.common.white, 0.2);
          },
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: -22,
          borderRadius: '50%',
          border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.22)}`,
          opacity: ringOpacity,
          animation: 'speakingPulse 2.1s ease-in-out infinite',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
          transform: `scale(${orbScale})`,
          transition: 'transform 120ms linear, background 200ms ease',
          boxShadow: (theme) =>
            `0 34px 64px ${alpha(theme.palette.common.black, 0.48)}, inset 0 0 0 1px ${alpha(
              theme.palette.common.white,
              0.1
            )}`,
          background: (theme) => {
            if (speaker === 'examiner') {
              return `radial-gradient(circle at 30% 30%, ${alpha(theme.palette.warning.light, 0.95)}, ${alpha(
                theme.palette.warning.dark,
                0.88
              )})`;
            }
            if (speaker === 'user') {
              return `radial-gradient(circle at 30% 30%, ${alpha(theme.palette.primary.light, 0.92)}, ${alpha(
                theme.palette.primary.dark,
                0.88
              )})`;
            }
            return `radial-gradient(circle at 30% 30%, ${alpha(theme.palette.grey[300], 0.9)}, ${alpha(
              theme.palette.grey[700],
              0.84
            )})`;
          },
          animation: 'speakingBreath 3s ease-in-out infinite',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: { xs: 44, md: 58 },
          borderRadius: '50%',
          bgcolor: (theme) => alpha(theme.palette.common.white, 0.18),
          border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.32)}`,
        }}
      />
    </Box>
  );
}

function SpeakingRuntime({ examId, initialSnapshot, onFinalized }: RuntimeProps) {
  const { tx } = useLocales();
  const { snapshot, client } = useSpeakingLiveSession({
    examId,
    snapshot: initialSnapshot,
    onFinalized,
  });

  const [tick, setTick] = useState(0);
  const totalDurationSec = Math.max(1, snapshot.test.durationMinutes * 60);
  const remainingTimeSec = Math.max(0, totalDurationSec - snapshot.elapsedSeconds);

  const guardActive = snapshot.status !== 'finished' && snapshot.status !== 'terminated';

  useSpeakingExamGuard(guardActive, (type) => {
    client.registerIntegrityEvent(type, type === 'refresh_attempt' ? 'critical' : 'warning');
  });

  useEffect(() => {
    if (remainingTimeSec !== 0 || client.isTerminal()) {
      return;
    }

    client.endExam('manual').catch((error) => {
      console.error('Failed to auto-end speaking session:', error);
    });
  }, [client, remainingTimeSec]);

  useEffect(
    () => () => {
      if (!client.isTerminal()) {
        client.registerIntegrityEvent('route_leave', 'critical');
        client.endExam('integrity').catch((error) => {
          console.error('Failed to end speaking session after route leave:', error);
        });
      }
      client.destroy();
    },
    [client]
  );

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 88);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const speaker: 'examiner' | 'user' | 'none' =
    snapshot.currentSpeaker === 'examiner' || snapshot.currentSpeaker === 'user'
      ? snapshot.currentSpeaker
      : 'none';

  const reactiveLevel = useMemo(() => {
    if (speaker === 'examiner') {
      if (!snapshot.speakerOutput.isSpeaking) {
        return 0.08;
      }

      const examinerWave = (Math.sin(tick * 0.36) + 1) / 2;
      return 0.55 + examinerWave * 0.38;
    }

    if (speaker === 'user') {
      return Math.min(1, Math.max(0.08, snapshot.microphone.level * 1.9));
    }

    return 0.06;
  }, [snapshot.microphone.level, snapshot.speakerOutput.isSpeaking, speaker, tick]);

  const muteLabel = snapshot.microphone.isMuted
    ? tx('pages.ielts.speaking.unmute_mic')
    : tx('pages.ielts.speaking.mute_mic');

  return (
    <>
      <GlobalStyles
        styles={(theme) => ({
          '@keyframes speakingPulse': {
            '0%': { transform: 'scale(0.94)', opacity: 0.48 },
            '50%': { transform: 'scale(1.05)', opacity: 0.78 },
            '100%': { transform: 'scale(0.94)', opacity: 0.48 },
          },
          '@keyframes speakingBreath': {
            '0%': { transform: 'scale(0.98)' },
            '50%': { transform: 'scale(1.02)' },
            '100%': { transform: 'scale(0.98)' },
          },
          '@keyframes meshMove': {
            '0%': { backgroundPosition: '0% 0%, 100% 100%, 0% 100%' },
            '50%': { backgroundPosition: '100% 0%, 0% 100%, 100% 100%' },
            '100%': { backgroundPosition: '0% 0%, 100% 100%, 0% 100%' },
          },
          body: {
            backgroundColor: theme.palette.grey[900],
          },
        })}
      />

      <Box
        sx={{
          position: 'relative',
          minHeight: '100dvh',
          borderRadius: 0,
          overflow: 'hidden',
          border: 'none',
          background: (theme) =>
            `radial-gradient(circle at 16% 8%, ${alpha(theme.palette.primary.main, 0.32)}, transparent 44%), radial-gradient(circle at 88% 10%, ${alpha(theme.palette.warning.main, 0.28)}, transparent 40%), radial-gradient(circle at 52% 100%, ${alpha(
              theme.palette.common.white,
              0.12
            )}, transparent 40%), linear-gradient(145deg, ${alpha(theme.palette.common.black, 0.9)}, ${alpha(
              theme.palette.grey[900],
              0.92
            )})`,
          backgroundSize: '160% 160%',
          animation: 'meshMove 16s ease-in-out infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 8,
        }}
      >
        <Stack alignItems="center" justifyContent="center" spacing={3.2}>
          <VoiceOrb speaker={speaker} level={reactiveLevel} />
        </Stack>

        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: { xs: 28, md: 38 },
            transform: 'translateX(-50%)',
            width: { xs: 'calc(100% - 32px)', md: 'auto' },
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Button
            variant="contained"
            onClick={() =>
              snapshot.microphone.isMuted ? client.unmuteMicrophone() : client.muteMicrophone()
            }
            sx={(theme) => ({
              minWidth: { xs: '100%', md: 320 },
              minHeight: 58,
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: 0.2,
              color: theme.palette.primary.contrastText,
              bgcolor: snapshot.microphone.isMuted
                ? theme.palette.error.main
                : theme.palette.primary.main,
              border: `1px solid ${alpha(theme.palette.common.white, 0.28)}`,
              boxShadow: `0 18px 38px ${alpha(theme.palette.primary.main, 0.35)}`,
              '&:hover': {
                bgcolor: snapshot.microphone.isMuted
                  ? theme.palette.error.dark
                  : theme.palette.primary.dark,
              },
            })}
          >
            {muteLabel}
          </Button>
        </Box>
      </Box>
    </>
  );
}

export default function AppsSpeakingSessionView() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const testId = Number(params.testId || 0);

  const detailQuery = useSpeakingDetailQuery(testId, testId > 0);
  const examsQuery = useMySpeakingExamsQuery({ enabled: testId > 0 });
  const startSpeakingFlowMutation = useStartSpeakingFlowMutation();

  const [bootstrap, setBootstrap] = useState<{
    examId: number;
    snapshot: SpeakingSessionSnapshot;
  } | null>(null);

  const bootstrapRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      !detailQuery.data ||
      examsQuery.isLoading ||
      startSpeakingFlowMutation.isPending ||
      bootstrapRef.current === testId
    ) {
      return;
    }

    bootstrapRef.current = testId;

    const detail = detailQuery.data;
    const examItems = examsQuery.data?.items ?? [];
    const storedActiveExamId = getSpeakingActiveExamId(testId);
    const latestActiveExam = findLatestUnfinishedSpeakingExamForTest(testId, examItems);

    startSpeakingFlowMutation
      .mutateAsync({
        testId,
        examId: storedActiveExamId ?? latestActiveExam?.id,
      })
      .then(async (exam) => {
        setSpeakingActiveExam(testId, exam.id);

        const session = await fetchSpeakingSession(exam.id);
        const snapshot = createSpeakingSessionSnapshot(session, detail);

        setBootstrap({
          examId: exam.id,
          snapshot,
        });
      })
      .catch(() => {
        bootstrapRef.current = null;
      });
  }, [detailQuery.data, examsQuery.data, examsQuery.isLoading, startSpeakingFlowMutation, testId]);

  const handleFinalized = useCallback(
    (attempt: SpeakingAttempt) => {
      const destination = paths.ielts.speakingAttempt(String(attempt.examId));
      const withBreadcrumb = isBreadcrumbFromMyTests(searchParams)
        ? appendBreadcrumbFromMyTests(destination)
        : destination;
      router.replace(withBreadcrumb);
    },
    [router, searchParams]
  );

  if (
    detailQuery.isLoading ||
    !detailQuery.data ||
    startSpeakingFlowMutation.isPending ||
    !bootstrap
  ) {
    return <SessionLoadingState />;
  }

  return (
    <SpeakingRuntime
      examId={bootstrap.examId}
      initialSnapshot={bootstrap.snapshot}
      onFinalized={handleFinalized}
    />
  );
}
