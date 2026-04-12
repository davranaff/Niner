import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import type { SpeakingTranscriptSegment } from '../types';

type TranscriptFeedProps = {
  segments: SpeakingTranscriptSegment[];
  liveExaminerTranscript: string;
  liveUserTranscript: string;
};

function TranscriptBubble({
  speaker,
  text,
  live,
}: {
  speaker: 'examiner' | 'user';
  text: string;
  live?: boolean;
}) {
  const isExaminer = speaker === 'examiner';
  let borderColor: string = 'divider';

  if (live) {
    borderColor = isExaminer ? 'warning.main' : 'common.black';
  }

  return (
    <Card
      variant="outlined"
      sx={{
        p: 1.5,
        alignSelf: isExaminer ? 'flex-start' : 'flex-end',
        width: 'fit-content',
        maxWidth: '92%',
        bgcolor: (theme) =>
          isExaminer
            ? alpha(theme.palette.warning.main, 0.08)
            : alpha(theme.palette.common.black, 0.04),
        borderColor,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {isExaminer ? 'Examiner' : 'Candidate'}{live ? ' · live' : ''}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {text}
      </Typography>
    </Card>
  );
}

export function TranscriptFeed({
  segments,
  liveExaminerTranscript,
  liveUserTranscript,
}: TranscriptFeedProps) {
  const recentSegments = segments.slice(-10);

  return (
    <Stack spacing={1.25}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Live transcript
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Conversation stream
        </Typography>
      </Stack>

      <Box
        sx={{
          border: (theme) => `1px dashed ${theme.palette.divider}`,
          borderRadius: 2,
          p: 1.5,
          minHeight: 200,
          maxHeight: 360,
          overflow: 'auto',
          bgcolor: 'background.default',
        }}
      >
        <Stack spacing={1}>
          {recentSegments.map((segment) => (
            <TranscriptBubble
              key={segment.id}
              speaker={segment.speaker}
              text={segment.text}
            />
          ))}

          {liveExaminerTranscript ? (
            <TranscriptBubble speaker="examiner" text={liveExaminerTranscript} live />
          ) : null}

          {liveUserTranscript ? (
            <TranscriptBubble speaker="user" text={liveUserTranscript} live />
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}
