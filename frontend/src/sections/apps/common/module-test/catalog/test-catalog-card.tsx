import type { ReactNode } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { useLocales } from 'src/locales';
import { AppsStatusChip } from 'src/pages/components/apps';
import { fDateTime } from 'src/utils/format-time';
import type { ModuleAttemptHistoryItem } from 'src/sections/apps/common/module-test/utils/attempt-history';

type TestCatalogCardProps = {
  title: string;
  description: string;
  titleAdornment?: ReactNode;
  headerMeta?: ReactNode;
  summaryLine?: string;
  primaryValue?: string;
  primaryValueHint?: string;
  infoLines?: string[];
  attemptHistoryLabel?: string;
  attemptHistoryItems?: ModuleAttemptHistoryItem[];
  updatedLabel?: string;
  actions?: ReactNode;
};

export function TestCatalogCard({
  title,
  description,
  titleAdornment,
  headerMeta,
  summaryLine,
  primaryValue,
  primaryValueHint,
  infoLines = [],
  attemptHistoryLabel,
  attemptHistoryItems = [],
  updatedLabel,
  actions,
}: TestCatalogCardProps) {
  const { tx } = useLocales();

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        p: 3,
        height: 1,
        borderColor: alpha(theme.palette.primary.main, 0.2),
        bgcolor: 'common.white',
        transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
          duration: theme.transitions.duration.shortest,
        }),
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: alpha(theme.palette.primary.main, 0.52),
          boxShadow: theme.customShadows.z8,
        },
      })}
    >
      <Stack spacing={2.5} sx={{ height: 1 }}>
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ color: 'primary.darker' }}>
                {title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {description}
              </Typography>
            </Stack>
            {titleAdornment}
          </Stack>

          {headerMeta}

          {summaryLine ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {summaryLine}
            </Typography>
          ) : null}
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Stack spacing={1} sx={{ mt: 'auto' }}>
          {primaryValue ? (
            <Stack direction="row" alignItems="baseline" spacing={1}>
              <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 800 }}>
                {primaryValue}
              </Typography>
              {primaryValueHint ? (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {primaryValueHint}
                </Typography>
              ) : null}
            </Stack>
          ) : null}

          {infoLines.map((line) => (
            <Typography key={line} variant="caption" sx={{ color: 'text.secondary' }}>
              {line}
            </Typography>
          ))}
        </Stack>

        {attemptHistoryItems.length && attemptHistoryLabel && updatedLabel ? (
          <>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <Stack spacing={1}>
              <Typography variant="subtitle2">
                {attemptHistoryLabel} ({attemptHistoryItems.length})
              </Typography>
              <Stack spacing={0.75}>
                {attemptHistoryItems.slice(0, 3).map((attempt) => (
                  <ButtonBase
                    key={attempt.id}
                    component={RouterLink}
                    href={attempt.actionPath}
                    sx={{ width: 1, borderRadius: 1, textAlign: 'left' }}
                  >
                    <Card
                      variant="outlined"
                      sx={(theme) => ({
                        width: 1,
                        p: 1,
                        borderStyle: 'dashed',
                        transition: theme.transitions.create(['border-color', 'background-color'], {
                          duration: theme.transitions.duration.shorter,
                        }),
                        '&:hover': {
                          borderColor: alpha(theme.palette.primary.main, 0.38),
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                        },
                      })}
                    >
                      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                        <Stack spacing={0.25}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            ID #{attempt.id}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {updatedLabel}: {attempt.updatedAt ? fDateTime(attempt.updatedAt) : '-'}
                          </Typography>
                        </Stack>
                        <AppsStatusChip
                          status={attempt.status}
                          label={tx(`pages.ielts.shared.status_${attempt.status}`)}
                        />
                      </Stack>
                    </Card>
                  </ButtonBase>
                ))}
              </Stack>
            </Stack>
          </>
        ) : null}

        {actions ? <Stack spacing={1.25}>{actions}</Stack> : null}
      </Stack>
    </Card>
  );
}
