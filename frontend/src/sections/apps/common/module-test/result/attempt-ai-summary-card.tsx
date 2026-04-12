import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';

import { useFetch } from 'src/hooks/api';
import { useLocales } from 'src/locales';
import Iconify from 'src/components/iconify';
import { request } from 'src/utils/axios';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';

type AiSummaryModule = 'reading' | 'listening' | 'writing';
type AiSummarySource = 'manual' | 'auto_submit';
type AiSummaryStatus = 'pending' | 'running' | 'done' | 'failed';

type BackendAiSummaryOut = {
  id: number;
  userId: number;
  module: AiSummaryModule;
  source: AiSummarySource;
  status: AiSummaryStatus;
  resultJson: Record<string, unknown> | null;
  resultText: string | null;
  errorText: string | null;
};

type BackendAiSummaryListOut = {
  items: BackendAiSummaryOut[];
  limit: number;
  offset: number;
};

function fetchLatestAutoSummary(module: AiSummaryModule, examId: number) {
  return request<BackendAiSummaryListOut>({
    method: 'GET',
    url: '/api/v1/ai/summaries',
    params: {
      module,
      source: 'auto_submit',
      examId,
      offset: 0,
      limit: 1,
    },
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value == null) {
    return '';
  }
  return String(value).trim();
}

function pickValue(
  source: Record<string, unknown>,
  camelCaseKey: string,
  snakeCaseKey?: string
): unknown {
  if (camelCaseKey in source) {
    return source[camelCaseKey];
  }
  if (snakeCaseKey && snakeCaseKey in source) {
    return source[snakeCaseKey];
  }
  return undefined;
}

function formatTrendValue(value: string) {
  return value.replaceAll('_', ' ');
}

function formatSeconds(seconds: number | null): string {
  if (seconds == null) {
    return '-';
  }
  return `${seconds}s`;
}

function resolveStatusColor(status: AiSummaryStatus): 'warning' | 'info' | 'success' | 'error' {
  if (status === 'pending') {
    return 'warning';
  }
  if (status === 'running') {
    return 'info';
  }
  if (status === 'done') {
    return 'success';
  }
  return 'error';
}

export type AttemptAiSummaryCardProps = {
  module: AiSummaryModule;
  examId: number;
  sx?: SxProps<Theme>;
};

export function AttemptAiSummaryCard({ module, examId, sx }: AttemptAiSummaryCardProps) {
  const { tx } = useLocales();

  const summaryQuery = useFetch(
    ['student-attempt-ai-summary', module, examId],
    () => fetchLatestAutoSummary(module, examId),
    {
      enabled: examId > 0,
      refetchInterval: (query) => {
        const status = query.state.data?.items?.[0]?.status;
        if (status === 'pending' || status === 'running') {
          return 2500;
        }
        return false;
      },
    }
  );

  if (examId <= 0) {
    return null;
  }

  if (summaryQuery.isPending) {
    return (
      <Box sx={sx}>
        <Card variant="outlined" sx={{ p: 3, mb: 3, borderColor: 'primary.light' }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="solar:stars-bold-duotone" width={20} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.shared.ai_summary_title')}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {tx('pages.ielts.shared.ai_summary_subtitle')}
            </Typography>
            <Skeleton variant="text" width="45%" />
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={66} />
          </Stack>
        </Card>
      </Box>
    );
  }

  if (summaryQuery.isError) {
    return (
      <Box sx={sx}>
        <Card variant="outlined" sx={{ p: 3, mb: 3, borderColor: 'warning.light' }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="solar:stars-bold-duotone" width={20} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.shared.ai_summary_title')}
              </Typography>
            </Stack>
            <Alert severity="warning">{tx('pages.ielts.shared.ai_summary_unavailable')}</Alert>
          </Stack>
        </Card>
      </Box>
    );
  }

  const summary = summaryQuery.data?.items?.[0] ?? null;

  if (!summary) {
    return (
      <Box sx={sx}>
        <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="solar:stars-bold-duotone" width={20} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.shared.ai_summary_title')}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {tx('pages.ielts.shared.ai_summary_empty')}
            </Typography>
          </Stack>
        </Card>
      </Box>
    );
  }

  const payload = asRecord(summary.resultJson) ?? {};

  const timingAnalysis = asRecord(pickValue(payload, 'timingAnalysis', 'timing_analysis'));
  const accuracyAnalysis = asRecord(pickValue(payload, 'accuracyAnalysis', 'accuracy_analysis'));
  const improvement = asRecord(pickValue(payload, 'improvement'));

  const mistakes = asRecordArray(pickValue(payload, 'mistakeHotspots', 'mistake_hotspots'));
  const grammarFocus = asRecordArray(pickValue(payload, 'grammarFocus', 'grammar_focus'));
  const topicFocus = asRecordArray(pickValue(payload, 'topicFocus', 'topic_focus'));
  const actionPlan = asStringArray(pickValue(payload, 'actionPlan', 'action_plan')).slice(0, 10);

  const summaryTextFromPayload = toStringValue(pickValue(payload, 'summaryText', 'summary_text'));
  const summaryText =
    summaryTextFromPayload || summary.resultText?.trim() || tx('pages.ielts.shared.ai_summary_empty');

  const latestAccuracy = toNumber(pickValue(accuracyAnalysis ?? {}, 'latestAccuracy', 'latest_accuracy'));
  const averageAccuracy = toNumber(pickValue(accuracyAnalysis ?? {}, 'averageAccuracy', 'average_accuracy'));
  const latestCorrect = toNumber(pickValue(accuracyAnalysis ?? {}, 'latestCorrect', 'latest_correct'));
  const latestTotal = toNumber(pickValue(accuracyAnalysis ?? {}, 'latestTotal', 'latest_total'));

  const latestScore = toNumber(pickValue(improvement ?? {}, 'latestScore', 'latest_score'));
  const previousScore = toNumber(pickValue(improvement ?? {}, 'previousScore', 'previous_score'));
  const delta = toNumber(pickValue(improvement ?? {}, 'delta'));
  const trendRaw = toStringValue(pickValue(improvement ?? {}, 'trend'));

  const latestTimeSpent = toNumber(
    pickValue(timingAnalysis ?? {}, 'latestTimeSpentSeconds', 'latest_time_spent_seconds')
  );
  const averageTimeSpent = toNumber(
    pickValue(timingAnalysis ?? {}, 'averageTimeSpentSeconds', 'average_time_spent_seconds')
  );
  const timeLimit = toNumber(pickValue(timingAnalysis ?? {}, 'timeLimitSeconds', 'time_limit_seconds'));
  const overtime = toNumber(pickValue(timingAnalysis ?? {}, 'overtimeSeconds', 'overtime_seconds'));

  const timingFeedback = toStringValue(pickValue(timingAnalysis ?? {}, 'feedback'));
  const accuracyFeedback = toStringValue(pickValue(accuracyAnalysis ?? {}, 'feedback'));
  const improvementFeedback = toStringValue(pickValue(improvement ?? {}, 'feedback'));

  return (
    <Box sx={sx}>
      <Card
        variant="outlined"
        sx={(theme) => ({
          mb: 3,
          overflow: 'hidden',
          borderColor: alpha(theme.palette.primary.main, 0.34),
          bgcolor: 'background.paper',
          backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(
            theme.palette.info.main,
            0.02
          )} 44%, transparent 100%)`,
        })}
      >
        <Box
          sx={(theme) => ({
            px: 2.5,
            py: 1.5,
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            backdropFilter: 'blur(2px)',
          })}
        >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={(theme) => ({
                width: 34,
                height: 34,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
              })}
            >
              <Iconify icon="solar:stars-bold-duotone" width={20} />
            </Box>
            <Stack spacing={0.2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {tx('pages.ielts.shared.ai_summary_title')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.shared.ai_summary_subtitle')}
              </Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              label={tx('pages.ielts.shared.ai_summary_powered')}
            />
            <Chip
              size="small"
              color={resolveStatusColor(summary.status)}
              label={tx(`pages.ielts.shared.ai_summary_status_${summary.status}`)}
            />
          </Stack>
        </Stack>
        </Box>

        <Stack spacing={2.25} sx={{ p: 2.5 }}>
        {summary.status === 'pending' || summary.status === 'running' ? (
          <>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {tx('pages.ielts.shared.ai_summary_processing')}
            </Typography>
            <LinearProgress />
          </>
        ) : null}

        {summary.status === 'failed' ? (
          <Alert severity="error">
            {summary.errorText?.trim() || tx('pages.ielts.shared.ai_summary_failed')}
          </Alert>
        ) : null}

        {summary.status === 'done' ? (
          <>
            <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.neutral' }}>
              <Stack spacing={0.75}>
                <Typography variant="subtitle2">{tx('pages.ielts.shared.ai_summary_overview')}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {summaryText}
                </Typography>
              </Stack>
            </Card>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {latestAccuracy != null ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${tx('pages.ielts.shared.ai_summary_accuracy')}: ${latestAccuracy.toFixed(1)}%`}
                />
              ) : null}
              {latestScore != null ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${tx('pages.ielts.shared.ai_summary_latest_score')}: ${formatRoundedBand(latestScore)}`}
                />
              ) : null}
              {delta != null ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${tx('pages.ielts.shared.ai_summary_delta')}: ${delta > 0 ? '+' : ''}${delta.toFixed(2)}`}
                />
              ) : null}
              {trendRaw ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${tx('pages.ielts.shared.ai_summary_trend')}: ${formatTrendValue(trendRaw)}`}
                />
              ) : null}
            </Stack>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">{tx('pages.ielts.shared.ai_summary_timing')}</Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      <Chip
                        size="small"
                        variant="soft"
                        label={`${tx('pages.ielts.shared.ai_summary_latest_time')}: ${formatSeconds(latestTimeSpent)}`}
                      />
                      <Chip
                        size="small"
                        variant="soft"
                        label={`${tx('pages.ielts.shared.ai_summary_average_time')}: ${formatSeconds(averageTimeSpent)}`}
                      />
                      <Chip
                        size="small"
                        variant="soft"
                        label={`${tx('pages.ielts.shared.ai_summary_time_limit')}: ${formatSeconds(timeLimit)}`}
                      />
                      <Chip
                        size="small"
                        variant="soft"
                        label={`${tx('pages.ielts.shared.ai_summary_overtime')}: ${formatSeconds(overtime)}`}
                      />
                    </Stack>
                    {timingFeedback ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        <strong>{tx('pages.ielts.shared.ai_summary_feedback')}:</strong> {timingFeedback}
                      </Typography>
                    ) : null}
                  </Stack>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">
                      {tx('pages.ielts.shared.ai_summary_accuracy_section')}
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      <Chip
                        size="small"
                        variant="soft"
                        label={`${tx('pages.ielts.shared.ai_summary_latest_correct')}: ${latestCorrect ?? '-'}`}
                      />
                      <Chip
                        size="small"
                        variant="soft"
                        label={`${tx('pages.ielts.shared.ai_summary_latest_total')}: ${latestTotal ?? '-'}`}
                      />
                      <Chip
                        size="small"
                        variant="soft"
                        label={`${tx('pages.ielts.shared.ai_summary_accuracy')}: ${
                          latestAccuracy != null ? `${latestAccuracy.toFixed(2)}%` : '-'
                        }`}
                      />
                      <Chip
                        size="small"
                        variant="soft"
                        label={`${tx('pages.ielts.shared.ai_summary_average_accuracy')}: ${
                          averageAccuracy != null ? `${averageAccuracy.toFixed(2)}%` : '-'
                        }`}
                      />
                    </Stack>
                    {accuracyFeedback ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        <strong>{tx('pages.ielts.shared.ai_summary_feedback')}:</strong> {accuracyFeedback}
                      </Typography>
                    ) : null}
                  </Stack>
                </Card>
              </Grid>
            </Grid>

            {mistakes.length ? (
              <>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Stack spacing={1}>
                  <Typography variant="subtitle2">
                    {tx('pages.ielts.shared.ai_summary_mistake_hotspots')}
                  </Typography>
                  <Stack spacing={1}>
                    {mistakes.map((item, index) => {
                      const questionType = toStringValue(
                        pickValue(item, 'questionType', 'question_type')
                      );
                      const feedback = toStringValue(pickValue(item, 'feedback'));
                      const commonErrors = asStringArray(
                        pickValue(item, 'commonErrors', 'common_errors')
                      ).slice(0, 8);

                      return (
                        <Card key={`${questionType}-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                          <Stack spacing={0.75}>
                            {questionType ? (
                              <Chip
                                size="small"
                                color="warning"
                                variant="outlined"
                                label={questionType.replaceAll('_', ' ')}
                                sx={{ alignSelf: 'flex-start' }}
                              />
                            ) : null}
                            {feedback ? (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                <strong>{tx('pages.ielts.shared.ai_summary_feedback')}:</strong> {feedback}
                              </Typography>
                            ) : null}
                            {commonErrors.length ? (
                              <Stack spacing={0.4}>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {tx('pages.ielts.shared.ai_summary_common_errors')}
                                </Typography>
                                {commonErrors.map((errorText, errorIndex) => (
                                  <Typography
                                    key={`${errorText}-${errorIndex}`}
                                    variant="body2"
                                    sx={{ color: 'text.secondary' }}
                                  >
                                    {`• ${errorText}`}
                                  </Typography>
                                ))}
                              </Stack>
                            ) : null}
                          </Stack>
                        </Card>
                      );
                    })}
                  </Stack>
                </Stack>
              </>
            ) : null}

            {grammarFocus.length ? (
              <>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Stack spacing={1}>
                  <Typography variant="subtitle2">{tx('pages.ielts.shared.ai_summary_grammar_focus')}</Typography>
                  {grammarFocus.map((item, index) => {
                    const focus = toStringValue(pickValue(item, 'focus'));
                    const guidance = toStringValue(pickValue(item, 'guidance'));
                    const mistakesCount = toNumber(pickValue(item, 'mistakes'));
                    return (
                      <Card key={`${focus}-${index}`} variant="outlined" sx={{ p: 1.25 }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                            {focus ? (
                              <Chip
                                size="small"
                                variant="outlined"
                                color="info"
                                label={focus.replaceAll('_', ' ')}
                              />
                            ) : null}
                            {mistakesCount != null ? (
                              <Chip size="small" variant="soft" label={`Mistakes: ${mistakesCount}`} />
                            ) : null}
                          </Stack>
                          {guidance ? (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {guidance}
                            </Typography>
                          ) : null}
                        </Stack>
                      </Card>
                    );
                  })}
                </Stack>
              </>
            ) : null}

            {topicFocus.length ? (
              <>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Stack spacing={1}>
                  <Typography variant="subtitle2">{tx('pages.ielts.shared.ai_summary_topic_focus')}</Typography>
                  {topicFocus.map((item, index) => {
                    const topic = toStringValue(pickValue(item, 'topic'));
                    const attempts = toNumber(pickValue(item, 'attempts'));
                    const feedback = toStringValue(pickValue(item, 'feedback'));
                    return (
                      <Card key={`${topic}-${index}`} variant="outlined" sx={{ p: 1.25 }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                            {topic ? <Chip size="small" variant="outlined" label={topic} /> : null}
                            {attempts != null ? (
                              <Chip
                                size="small"
                                variant="soft"
                                label={`${tx('pages.ielts.shared.ai_summary_attempts')}: ${attempts}`}
                              />
                            ) : null}
                          </Stack>
                          {feedback ? (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              <strong>{tx('pages.ielts.shared.ai_summary_feedback')}:</strong> {feedback}
                            </Typography>
                          ) : null}
                        </Stack>
                      </Card>
                    );
                  })}
                </Stack>
              </>
            ) : null}

            <Divider sx={{ borderStyle: 'dashed' }} />
            <Stack spacing={1}>
              <Typography variant="subtitle2">{tx('pages.ielts.shared.ai_summary_improvement')}</Typography>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${tx('pages.ielts.shared.ai_summary_latest_score')}: ${
                    latestScore != null ? formatRoundedBand(latestScore) : '-'
                  }`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${tx('pages.ielts.shared.ai_summary_previous_score')}: ${
                    previousScore != null ? formatRoundedBand(previousScore) : '-'
                  }`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${tx('pages.ielts.shared.ai_summary_delta')}: ${
                    delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(2)}` : '-'
                  }`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${tx('pages.ielts.shared.ai_summary_trend')}: ${
                    trendRaw ? formatTrendValue(trendRaw) : '-'
                  }`}
                />
              </Stack>
              {improvementFeedback ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  <strong>{tx('pages.ielts.shared.ai_summary_feedback')}:</strong> {improvementFeedback}
                </Typography>
              ) : null}
            </Stack>

            {actionPlan.length ? (
              <>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Stack spacing={1}>
                  <Typography variant="subtitle2">{tx('pages.ielts.shared.ai_summary_action_plan')}</Typography>
                  {actionPlan.map((item, index) => (
                    <Typography key={`${item}-${index}`} variant="body2" sx={{ color: 'text.secondary' }}>
                      {`${index + 1}. ${item}`}
                    </Typography>
                  ))}
                </Stack>
              </>
            ) : null}
          </>
        ) : null}
        </Stack>
      </Card>
    </Box>
  );
}
