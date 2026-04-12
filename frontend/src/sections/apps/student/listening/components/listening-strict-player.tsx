import { useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { useLocales } from 'src/locales';
import Iconify from 'src/components/iconify';

type ListeningStrictPlayerProps = {
  audioUrl: string;
};

export function ListeningStrictPlayer({ audioUrl }: ListeningStrictPlayerProps) {
  const { tx } = useLocales();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSafeTimeRef = useRef(0);

  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [interactionRequired, setInteractionRequired] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      return undefined;
    }

    const syncPlayingState = () => {
      lastSafeTimeRef.current = audio.currentTime;
      setIsPlaying(!audio.paused && !audio.ended);
    };

    const lockPauseAndSeek = () => {
      if (audio.ended) {
        setIsPlaying(false);
        return;
      }

      if (Math.abs(audio.currentTime - lastSafeTimeRef.current) > 0.25) {
        audio.currentTime = lastSafeTimeRef.current;
      }

      audio.play().catch(() => {
        setInteractionRequired(true);
      });
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    audio.currentTime = 0;
    lastSafeTimeRef.current = 0;
    audio.src = audioUrl;
    audio.load();

    audio.addEventListener('timeupdate', syncPlayingState);
    audio.addEventListener('play', syncPlayingState);
    audio.addEventListener('pause', lockPauseAndSeek);
    audio.addEventListener('seeking', lockPauseAndSeek);
    audio.addEventListener('ended', onEnded);

    audio.play().catch(() => {
      setInteractionRequired(true);
    });

    return () => {
      audio.removeEventListener('timeupdate', syncPlayingState);
      audio.removeEventListener('play', syncPlayingState);
      audio.removeEventListener('pause', lockPauseAndSeek);
      audio.removeEventListener('seeking', lockPauseAndSeek);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = muted ? 0 : volume;
    audio.muted = muted;
  }, [muted, volume]);

  useEffect(() => {
    if (!interactionRequired) {
      return undefined;
    }

    const resume = () => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      audio.play()
        .then(() => {
          setInteractionRequired(false);
        })
        .catch(() => {
          setInteractionRequired(true);
        });
    };

    window.addEventListener('pointerdown', resume, { once: true });
    return () => {
      window.removeEventListener('pointerdown', resume);
    };
  }, [interactionRequired]);

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        p: 2,
        borderStyle: 'dashed',
        borderColor: alpha(theme.palette.primary.main, 0.24),
        bgcolor: alpha(theme.palette.primary.main, 0.03),
      })}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="auto" controls={false} style={{ display: 'none' }} />

      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2">{tx('pages.ielts.shared.audio_player')}</Typography>
          <Chip
            size="small"
            color={isPlaying ? 'success' : 'default'}
            variant={isPlaying ? 'filled' : 'outlined'}
            label={
              isPlaying
                ? tx('pages.ielts.shared.audio_status_playing')
                : tx('pages.ielts.shared.audio_status_waiting')
            }
          />
        </Stack>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.shared.listening_strict_audio_notice')}
        </Typography>

        {interactionRequired ? (
          <Typography variant="caption" sx={{ color: 'warning.main' }}>
            {tx('pages.ielts.shared.listening_tap_to_start_audio')}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1.25} alignItems="center">
          <IconButton
            size="small"
            color={muted || volume === 0 ? 'default' : 'primary'}
            onClick={() => setMuted((previous) => !previous)}
          >
            <Iconify
              width={18}
              icon={
                muted || volume === 0
                  ? 'solar:volume-cross-bold-duotone'
                  : 'solar:volume-loud-bold-duotone'
              }
            />
          </IconButton>

          <Box sx={{ flex: 1 }}>
            <Slider
              min={0}
              max={100}
              value={Math.round((muted ? 0 : volume) * 100)}
              onChange={(_event, value) => {
                const next = (Array.isArray(value) ? value[0] : value) / 100;
                setMuted(next === 0);
                setVolume(next);
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
              aria-label={tx('pages.ielts.shared.audio_volume')}
            />
          </Box>
        </Stack>
      </Stack>
    </Card>
  );
}
