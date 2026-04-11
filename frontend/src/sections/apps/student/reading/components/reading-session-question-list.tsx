import { Fragment, type MutableRefObject } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { useLocales } from 'src/locales';

import type { ReadingDraftAnswers, ReadingPart } from '../api/types';

import { ReadingAnswerField } from './reading-answer-field';

type Props = {
  passage: ReadingPart | null;
  activeQuestionId: string;
  answers: ReadingDraftAnswers;
  questionRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  onAnswerChange: (questionId: number, value: string) => void;
};

function toTableValue(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

function ReadingTablePreview({ tableJson }: { tableJson: Record<string, unknown> | null | undefined }) {
  const headerValue = tableJson?.header;
  const rowsValue = tableJson?.rows;

  const header = Array.isArray(headerValue) ? headerValue.map(toTableValue) : [];
  const rows = Array.isArray(rowsValue)
    ? rowsValue.map((row) => (Array.isArray(row) ? row.map(toTableValue) : []))
    : [];

  if (!header.length && !rows.length) {
    return null;
  }

  return (
    <Box
      sx={(theme) => ({
        mt: 1,
        overflowX: 'auto',
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.common.black, 0.1)}`,
      })}
    >
      <Table size="small" sx={{ minWidth: 360 }}>
        {header.length ? (
          <TableHead>
            <TableRow>
              {header.map((cell, index) => (
                <TableCell key={`${cell}-${index}`} sx={{ fontWeight: 700 }}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        ) : null}

        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={`${rowIndex}-${cellIndex}`}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function ReadingBlockNote({ label, content }: { label: string; content: string | null | undefined }) {
  if (!content) {
    return null;
  }

  return (
    <Box
      sx={(theme) => ({
        px: 1,
        py: 0.875,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.common.black, 0.03),
      })}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.375, whiteSpace: 'pre-wrap' }}>
        {content}
      </Typography>
    </Box>
  );
}

export function ReadingSessionQuestionList({
  passage,
  activeQuestionId,
  answers,
  questionRefs,
  onAnswerChange,
}: Props) {
  const { tx } = useLocales();

  if (!passage?.questionBlocks.length) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {tx('pages.ielts.shared.no_questions')}
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {passage.questionBlocks.map((block, blockIndex) => (
        <Fragment key={block.id}>
          {blockIndex > 0 ? (
            <Box
              sx={(theme) => ({
                my: 0.25,
                borderTop: `1px dashed ${alpha(theme.palette.common.black, 0.12)}`,
              })}
            />
          ) : null}

          <Stack spacing={0.75}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'common.black' }}>
                {block.title}
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={block.blockType.replaceAll('_', ' ')}
                sx={{ height: 22, textTransform: 'capitalize' }}
              />
            </Stack>

            {block.description ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {block.description}
              </Typography>
            ) : null}

            <ReadingBlockNote
              label={tx('pages.ielts.shared.question_heading')}
              content={block.questionHeading}
            />
            <ReadingBlockNote
              label={tx('pages.ielts.shared.list_of_headings')}
              content={block.listOfHeadings}
            />
            <ReadingBlockNote
              label={tx('pages.ielts.shared.flow_chart')}
              content={block.flowChartCompletion}
            />

            {block.tableJson ? (
              <Box
                sx={(theme) => ({
                  px: 1,
                  py: 0.875,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.common.black, 0.03),
                })}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  {tx('pages.ielts.shared.table_preview')}
                </Typography>
                <ReadingTablePreview tableJson={block.tableJson} />
              </Box>
            ) : null}

            <Stack spacing={0.75}>
              {block.questions.map((question) => (
                <Box
                  key={question.id}
                  ref={(node: HTMLDivElement | null) => {
                    questionRefs.current[String(question.id)] = node;
                  }}
                  sx={{ scrollMarginTop: 12 }}
                >
                  <Box
                    sx={(theme) => ({
                      px: 1,
                      py: 0.875,
                      borderRadius: 2,
                      border: `1px solid ${
                        String(question.id) === activeQuestionId
                          ? alpha(theme.palette.info.main, 0.3)
                          : alpha(theme.palette.common.black, 0.08)
                      }`,
                      bgcolor:
                        String(question.id) === activeQuestionId
                          ? alpha(theme.palette.info.main, 0.04)
                          : alpha(theme.palette.common.white, 0.88),
                    })}
                  >
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Chip
                          size="small"
                          label={tx('pages.ielts.shared.question_label', {
                            number: question.number,
                          })}
                          sx={{ fontWeight: 800, height: 24 }}
                        />
                      </Stack>

                      <Typography
                        variant="subtitle2"
                        sx={{ fontSize: { xs: '0.98rem', md: '1rem' }, fontWeight: 700 }}
                      >
                        {question.questionText}
                      </Typography>

                      <ReadingAnswerField
                        question={question}
                        answerSpec={block.answerSpec}
                        value={answers[String(question.id)] ?? ''}
                        label={tx('pages.ielts.shared.your_answer')}
                        helperText={
                          block.answerSpec.maxWords
                            ? tx('pages.ielts.shared.max_words_hint', {
                                count: block.answerSpec.maxWords,
                              })
                            : undefined
                        }
                        onChange={(value) => onAnswerChange(question.id, value)}
                      />
                    </Stack>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Fragment>
      ))}
    </Stack>
  );
}
