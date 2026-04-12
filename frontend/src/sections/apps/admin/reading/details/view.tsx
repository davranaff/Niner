import { useEffect, useMemo, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import EmptyContent from 'src/components/empty-content';
import { RHFSelect, RHFTextField, RHFSwitch } from 'src/components/hook-form';
import { useSnackbar } from 'src/components/snackbar';
import { fDateTime } from 'src/utils/format-time';
import { useBoolean } from 'src/hooks/use-boolean';
import { useLocales } from 'src/locales';
import { AppsPageHeader } from 'src/pages/components/apps';
import { useParams } from 'src/routes/hook';
import { useRouter } from 'src/routes/hook/use-router';
import { paths } from 'src/routes/paths';
import {
  AdminDeleteDialog,
  AdminDetailSkeleton,
  AdminManualNote,
  AdminTreeCard,
  AdminUpsertDialog,
} from 'src/sections/apps/admin/components';
import { parseNumberParam } from 'src/sections/apps/admin/utils';

import {
  createReadingAnswerSchema,
  createReadingBlockSchema,
  createReadingOptionSchema,
  createReadingPassageSchema,
  createReadingQuestionSchema,
  createReadingTestSchema,
} from '../components/schemas';
import {
  useAdminReadingDetailMutations,
  useAdminReadingDetailQuery,
  useAdminReadingTestMutations,
} from '../api/use-reading-api';
import {
  humanizeAdminValue,
  READING_BLOCK_TYPES,
  requiresReadingFlowChartCompletion,
  requiresReadingHeadingsList,
  requiresReadingQuestionHeading,
  requiresReadingTableCompletion,
  supportsReadingAnswers,
  supportsReadingOptions,
} from '../api/utils';
import type {
  AdminReadingAnswerFormValues,
  AdminReadingBlock,
  AdminReadingBlockFormValues,
  AdminReadingOption,
  AdminReadingOptionFormValues,
  AdminReadingPassage,
  AdminReadingPassageFormValues,
  AdminReadingQuestion,
  AdminReadingQuestionFormValues,
  AdminReadingTestFormValues,
} from '../api/types';

type DeleteTarget =
  | { kind: 'test'; id: number }
  | { kind: 'passage'; id: number }
  | { kind: 'block'; id: number }
  | { kind: 'question'; id: number }
  | { kind: 'option'; id: number }
  | null;

const defaultTestValues: AdminReadingTestFormValues = {
  title: '',
  description: '',
  timeLimit: 3600,
  isActive: true,
};

const defaultPassageValues: AdminReadingPassageFormValues = {
  title: '',
  content: '',
  passageNumber: 1,
};

const defaultBlockValues: AdminReadingBlockFormValues = {
  title: '',
  description: '',
  blockType: READING_BLOCK_TYPES[0],
  order: 0,
  questionHeading: '',
  listOfHeadings: '',
  tableCompletion: '',
  flowChartCompletion: '',
};

const defaultQuestionValues: AdminReadingQuestionFormValues = {
  questionText: '',
  order: 0,
};

const defaultOptionValues: AdminReadingOptionFormValues = {
  optionText: '',
  isCorrect: false,
  order: 0,
};

const defaultAnswerValues: AdminReadingAnswerFormValues = {
  correctAnswers: '',
};

export default function AppsAdminReadingDetailsView() {
  const { tx } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const params = useParams();
  const testId = parseNumberParam(params.testId, 0);

  const detailQuery = useAdminReadingDetailQuery(testId);
  const readingTestMutations = useAdminReadingTestMutations();
  const readingMutations = useAdminReadingDetailMutations(testId);

  const testDialog = useBoolean();
  const passageDialog = useBoolean();
  const blockDialog = useBoolean();
  const questionDialog = useBoolean();
  const optionDialog = useBoolean();
  const answerDialog = useBoolean();
  const deleteDialog = useBoolean();

  const [editingPassage, setEditingPassage] = useState<AdminReadingPassage | null>(null);
  const [blockContext, setBlockContext] = useState<{ passageId: number; block: AdminReadingBlock | null } | null>(null);
  const [questionContext, setQuestionContext] = useState<{ blockId: number; question: AdminReadingQuestion | null } | null>(null);
  const [optionContext, setOptionContext] = useState<{ questionId: number; option: AdminReadingOption | null } | null>(null);
  const [answerQuestionId, setAnswerQuestionId] = useState<number | null>(null);
  const [manualAnswerId, setManualAnswerId] = useState('');
  const [manualAnswerValue, setManualAnswerValue] = useState('');
  const [manualDeleteAnswerId, setManualDeleteAnswerId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const testMethods = useForm<AdminReadingTestFormValues>({
    resolver: yupResolver(createReadingTestSchema(tx)),
    defaultValues: defaultTestValues,
    mode: 'onChange',
  });
  const passageMethods = useForm<AdminReadingPassageFormValues>({
    resolver: yupResolver(createReadingPassageSchema(tx)),
    defaultValues: defaultPassageValues,
    mode: 'onChange',
  });
  const blockMethods = useForm<AdminReadingBlockFormValues>({
    resolver: yupResolver(createReadingBlockSchema(tx)),
    defaultValues: defaultBlockValues,
    mode: 'onChange',
  });
  const questionMethods = useForm<AdminReadingQuestionFormValues>({
    resolver: yupResolver(createReadingQuestionSchema(tx)),
    defaultValues: defaultQuestionValues,
    mode: 'onChange',
  });
  const optionMethods = useForm<AdminReadingOptionFormValues>({
    resolver: yupResolver(createReadingOptionSchema(tx)),
    defaultValues: defaultOptionValues,
    mode: 'onChange',
  });
  const answerMethods = useForm<AdminReadingAnswerFormValues>({
    resolver: yupResolver(createReadingAnswerSchema(tx)),
    defaultValues: defaultAnswerValues,
    mode: 'onChange',
  });

  const detail = detailQuery.data;
  const passages = detail?.passages.length ? detail.passages : detail?.parts ?? [];

  useEffect(() => {
    if (detail && testDialog.value) {
      testMethods.reset({
        title: detail.title,
        description: detail.description,
        timeLimit: detail.timeLimit,
        isActive: detail.isActive,
      });
    }
  }, [detail, testDialog.value, testMethods]);

  useEffect(() => {
    if (passageDialog.value) {
      passageMethods.reset(
        editingPassage
          ? {
              title: editingPassage.title,
              content: editingPassage.content,
              passageNumber: editingPassage.passageNumber,
            }
          : defaultPassageValues
      );
    }
  }, [editingPassage, passageDialog.value, passageMethods]);

  useEffect(() => {
    if (blockDialog.value) {
      blockMethods.reset(
        blockContext?.block
          ? {
              title: blockContext.block.title,
              description: blockContext.block.description,
              blockType: blockContext.block.blockType,
              order: blockContext.block.order,
              questionHeading: blockContext.block.questionHeading ?? '',
              listOfHeadings: blockContext.block.listOfHeadings ?? '',
              tableCompletion: '',
              flowChartCompletion: blockContext.block.flowChartCompletion ?? '',
            }
          : defaultBlockValues
      );
    }
  }, [blockContext, blockDialog.value, blockMethods]);

  useEffect(() => {
    if (questionDialog.value) {
      questionMethods.reset(
        questionContext?.question
          ? {
              questionText: questionContext.question.questionText,
              order: questionContext.question.order,
            }
          : defaultQuestionValues
      );
    }
  }, [questionContext, questionDialog.value, questionMethods]);

  useEffect(() => {
    if (optionDialog.value) {
      optionMethods.reset(
        optionContext?.option
          ? {
              optionText: optionContext.option.optionText,
              isCorrect: optionContext.option.isCorrect,
              order: optionContext.option.order,
            }
          : defaultOptionValues
      );
    }
  }, [optionContext, optionDialog.value, optionMethods]);

  useEffect(() => {
    if (answerDialog.value) {
      answerMethods.reset(defaultAnswerValues);
    }
  }, [answerDialog.value, answerMethods]);

  const activeBlockType = blockMethods.watch('blockType');

  const deleteDescription = useMemo(() => {
    if (!deleteTarget) {
      return '';
    }

    return tx(`pages.admin.reading.delete_help.${deleteTarget.kind}`);
  }, [deleteTarget, tx]);

  const handleUpdateTest = async (values: AdminReadingTestFormValues) => {
    if (!detail) {
      return;
    }

    await readingTestMutations.updateTest.mutateAsync({
      testId: detail.id,
      payload: values,
    });
    enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    testDialog.onFalse();
  };

  const handleUpsertPassage = async (values: AdminReadingPassageFormValues) => {
    if (editingPassage) {
      await readingMutations.updatePassage.mutateAsync({
        passageId: editingPassage.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await readingMutations.createPassage.mutateAsync({ payload: values });
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    passageDialog.onFalse();
    setEditingPassage(null);
  };

  const handleUpsertBlock = async (values: AdminReadingBlockFormValues) => {
    if (!blockContext) {
      return;
    }

    if (blockContext.block) {
      await readingMutations.updateBlock.mutateAsync({
        blockId: blockContext.block.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await readingMutations.createBlock.mutateAsync({
        passageId: blockContext.passageId,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    blockDialog.onFalse();
    setBlockContext(null);
  };

  const handleUpsertQuestion = async (values: AdminReadingQuestionFormValues) => {
    if (!questionContext) {
      return;
    }

    if (questionContext.question) {
      await readingMutations.updateQuestion.mutateAsync({
        questionId: questionContext.question.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await readingMutations.createQuestion.mutateAsync({
        blockId: questionContext.blockId,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    questionDialog.onFalse();
    setQuestionContext(null);
  };

  const handleUpsertOption = async (values: AdminReadingOptionFormValues) => {
    if (!optionContext) {
      return;
    }

    if (optionContext.option) {
      await readingMutations.updateOption.mutateAsync({
        optionId: optionContext.option.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await readingMutations.createOption.mutateAsync({
        questionId: optionContext.questionId,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    optionDialog.onFalse();
    setOptionContext(null);
  };

  const handleCreateAnswer = async (values: AdminReadingAnswerFormValues) => {
    if (!answerQuestionId) {
      return;
    }

    const response = await readingMutations.createAnswer.mutateAsync({
      questionId: answerQuestionId,
      payload: values,
    });

    enqueueSnackbar(`${tx('pages.admin.shared.messages.created')} #${response.id}`, {
      variant: 'success',
    });
    answerDialog.onFalse();
    setAnswerQuestionId(null);
  };

  const handleManualAnswerUpdate = async () => {
    const answerId = Number(manualAnswerId);

    if (!Number.isFinite(answerId) || answerId <= 0 || !manualAnswerValue.trim()) {
      return;
    }

    await readingMutations.updateAnswer.mutateAsync({
      answerId,
      payload: {
        correctAnswers: manualAnswerValue,
      },
    });

    enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    setManualAnswerId('');
    setManualAnswerValue('');
  };

  const handleManualAnswerDelete = async () => {
    const answerId = Number(manualDeleteAnswerId);

    if (!Number.isFinite(answerId) || answerId <= 0) {
      return;
    }

    await readingMutations.deleteAnswer.mutateAsync(answerId);
    enqueueSnackbar(tx('pages.admin.shared.messages.deleted'), { variant: 'success' });
    setManualDeleteAnswerId('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !detail) {
      return;
    }

    if (deleteTarget.kind === 'test') {
      await readingTestMutations.deleteTest.mutateAsync(detail.id);
      enqueueSnackbar(tx('pages.admin.shared.messages.deleted'), { variant: 'success' });
      deleteDialog.onFalse();
      router.replace(paths.ielts.admin.reading);
      return;
    }

    if (deleteTarget.kind === 'passage') {
      await readingMutations.deletePassage.mutateAsync(deleteTarget.id);
    }

    if (deleteTarget.kind === 'block') {
      await readingMutations.deleteBlock.mutateAsync(deleteTarget.id);
    }

    if (deleteTarget.kind === 'question') {
      await readingMutations.deleteQuestion.mutateAsync(deleteTarget.id);
    }

    if (deleteTarget.kind === 'option') {
      await readingMutations.deleteOption.mutateAsync(deleteTarget.id);
    }

    enqueueSnackbar(tx('pages.admin.shared.messages.deleted'), { variant: 'success' });
    deleteDialog.onFalse();
    setDeleteTarget(null);
  };

  if (!testId) {
    return (
      <Container maxWidth="lg">
        <EmptyContent
          filled
          title={tx('pages.admin.shared.empty_title')}
          description={tx('pages.admin.reading.invalid_test')}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={detail?.title ?? tx('pages.admin.reading.detail_title')}
        description={tx('pages.admin.reading.detail_description')}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => router.push(paths.ielts.admin.reading)}>
              {tx('pages.admin.shared.actions.back')}
            </Button>
            <Button variant="contained" onClick={testDialog.onTrue} disabled={!detail}>
              {tx('pages.admin.shared.actions.edit')}
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                setDeleteTarget({ kind: 'test', id: testId });
                deleteDialog.onTrue();
              }}
              disabled={!detail}
            >
              {tx('pages.admin.shared.actions.delete')}
            </Button>
          </Stack>
        }
      />

      {detailQuery.isPending && !detail ? <AdminDetailSkeleton /> : null}

      {detail ? (
        <Stack spacing={3}>
          <AdminTreeCard
            title={detail.title}
            subtitle={`${tx('pages.admin.shared.created_at')}: ${fDateTime(detail.createdAt)}`}
            actions={
              <Button variant="contained" onClick={() => {
                setEditingPassage(null);
                passageDialog.onTrue();
              }}>
                {tx('pages.admin.reading.actions.add_passage')}
              </Button>
            }
          >
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {detail.description}
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  size="small"
                  label={`${tx('pages.admin.shared.time_limit')}: ${detail.timeLimit}s`}
                />
                <Chip
                  size="small"
                  color={detail.isActive ? 'success' : 'default'}
                  label={
                    detail.isActive
                      ? tx('pages.admin.shared.status_active')
                      : tx('pages.admin.shared.status_inactive')
                  }
                />
                <Chip
                  size="small"
                  label={`${tx('pages.admin.reading.summary.passages')}: ${passages.length}`}
                />
              </Stack>
            </Stack>
          </AdminTreeCard>

          {passages.length ? (
            passages.map((passage) => (
              <AdminTreeCard
                key={passage.id}
                title={`${tx('pages.admin.reading.labels.passage')} ${passage.passageNumber}: ${passage.title}`}
                subtitle={`${tx('pages.admin.reading.summary.questions')}: ${passage.questionsCount}`}
                actions={
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setBlockContext({ passageId: passage.id, block: null });
                        blockDialog.onTrue();
                      }}
                    >
                      {tx('pages.admin.reading.actions.add_block')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setEditingPassage(passage);
                        passageDialog.onTrue();
                      }}
                    >
                      {tx('pages.admin.shared.actions.edit')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setDeleteTarget({ kind: 'passage', id: passage.id });
                        deleteDialog.onTrue();
                      }}
                    >
                      {tx('pages.admin.shared.actions.delete')}
                    </Button>
                  </Stack>
                }
              >
                <Stack spacing={2.5}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                    {passage.content}
                  </Typography>

                  {passage.questionBlocks.length ? (
                    <Stack spacing={2}>
                      {passage.questionBlocks.map((block) => (
                        <Card key={block.id} variant="outlined" sx={{ p: 2 }}>
                          <Stack spacing={2}>
                            <Stack
                              direction={{ xs: 'column', md: 'row' }}
                              justifyContent="space-between"
                              spacing={2}
                            >
                              <Stack spacing={0.75}>
                                <Typography variant="subtitle2">
                                  {humanizeAdminValue(block.blockType)} #{block.order}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                  {block.title}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {block.description}
                                </Typography>
                              </Stack>

                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => {
                                    setQuestionContext({ blockId: block.id, question: null });
                                    questionDialog.onTrue();
                                  }}
                                >
                                  {tx('pages.admin.reading.actions.add_question')}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    setBlockContext({ passageId: passage.id, block });
                                    blockDialog.onTrue();
                                  }}
                                >
                                  {tx('pages.admin.shared.actions.edit')}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => {
                                    setDeleteTarget({ kind: 'block', id: block.id });
                                    deleteDialog.onTrue();
                                  }}
                                >
                                  {tx('pages.admin.shared.actions.delete')}
                                </Button>
                              </Stack>
                            </Stack>

                            {block.questionHeading ? (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {tx('pages.admin.reading.fields.question_heading')}: {block.questionHeading}
                              </Typography>
                            ) : null}

                            {block.listOfHeadings ? (
                              <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                                {tx('pages.admin.reading.fields.list_of_headings')}: {block.listOfHeadings}
                              </Typography>
                            ) : null}

                            {block.flowChartCompletion ? (
                              <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                                {tx('pages.admin.reading.fields.flow_chart_completion')}: {block.flowChartCompletion}
                              </Typography>
                            ) : null}

                            {block.tableJson ? (
                              <Box
                                component="pre"
                                sx={{
                                  m: 0,
                                  p: 2,
                                  borderRadius: 1.5,
                                  bgcolor: 'grey.100',
                                  overflow: 'auto',
                                  fontSize: 12,
                                }}
                              >
                                {JSON.stringify(block.tableJson, null, 2)}
                              </Box>
                            ) : null}

                            <Divider />

                            {block.questions.length ? (
                              <Stack spacing={1.5}>
                                {block.questions.map((question) => (
                                  <Card key={question.id} variant="outlined" sx={{ p: 1.75 }}>
                                    <Stack spacing={1.5}>
                                      <Stack
                                        direction={{ xs: 'column', md: 'row' }}
                                        justifyContent="space-between"
                                        spacing={2}
                                      >
                                        <Stack spacing={0.5}>
                                          <Typography variant="subtitle2">
                                            #{question.number} {question.questionText}
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            {tx('pages.admin.reading.fields.order')}: {question.order} ·{' '}
                                            {question.answerType} / {question.inputVariant}
                                          </Typography>
                                        </Stack>

                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                          {supportsReadingOptions(block.blockType) ? (
                                            <Button
                                              size="small"
                                              variant="contained"
                                              onClick={() => {
                                                setOptionContext({ questionId: question.id, option: null });
                                                optionDialog.onTrue();
                                              }}
                                            >
                                              {tx('pages.admin.reading.actions.add_option')}
                                            </Button>
                                          ) : null}
                                          {supportsReadingAnswers(block.blockType) ? (
                                            <Button
                                              size="small"
                                              variant="contained"
                                              onClick={() => {
                                                setAnswerQuestionId(question.id);
                                                answerDialog.onTrue();
                                              }}
                                            >
                                              {tx('pages.admin.reading.actions.add_answer')}
                                            </Button>
                                          ) : null}
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => {
                                              setQuestionContext({ blockId: block.id, question });
                                              questionDialog.onTrue();
                                            }}
                                          >
                                            {tx('pages.admin.shared.actions.edit')}
                                          </Button>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            onClick={() => {
                                              setDeleteTarget({ kind: 'question', id: question.id });
                                              deleteDialog.onTrue();
                                            }}
                                          >
                                            {tx('pages.admin.shared.actions.delete')}
                                          </Button>
                                        </Stack>
                                      </Stack>

                                      {question.options.length ? (
                                        <Stack spacing={1}>
                                          {question.options.map((option) => (
                                            <Stack
                                              key={option.id}
                                              direction={{ xs: 'column', md: 'row' }}
                                              justifyContent="space-between"
                                              spacing={1}
                                              sx={{
                                                p: 1.25,
                                                borderRadius: 1.5,
                                                bgcolor: option.isCorrect ? 'success.lighter' : 'grey.100',
                                              }}
                                            >
                                              <Typography variant="body2">
                                                {option.order}. {option.optionText}
                                              </Typography>

                                              <Stack direction="row" spacing={1}>
                                                {option.isCorrect ? (
                                                  <Chip
                                                    size="small"
                                                    color="success"
                                                    label={tx('pages.admin.reading.labels.correct_option')}
                                                  />
                                                ) : null}
                                                <Button
                                                  size="small"
                                                  onClick={() => {
                                                    setOptionContext({ questionId: question.id, option });
                                                    optionDialog.onTrue();
                                                  }}
                                                >
                                                  {tx('pages.admin.shared.actions.edit')}
                                                </Button>
                                                <Button
                                                  size="small"
                                                  color="error"
                                                  onClick={() => {
                                                    setDeleteTarget({ kind: 'option', id: option.id });
                                                    deleteDialog.onTrue();
                                                  }}
                                                >
                                                  {tx('pages.admin.shared.actions.delete')}
                                                </Button>
                                              </Stack>
                                            </Stack>
                                          ))}
                                        </Stack>
                                      ) : null}

                                      {supportsReadingAnswers(block.blockType) ? (
                                        <AdminManualNote>
                                          {tx('pages.admin.reading.answer_contract_note')}
                                        </AdminManualNote>
                                      ) : null}
                                    </Stack>
                                  </Card>
                                ))}
                              </Stack>
                            ) : (
                              <EmptyContent
                                title={tx('pages.admin.shared.empty_title')}
                                description={tx('pages.admin.reading.empty_questions')}
                              />
                            )}
                          </Stack>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <EmptyContent
                      title={tx('pages.admin.shared.empty_title')}
                      description={tx('pages.admin.reading.empty_blocks')}
                    />
                  )}
                </Stack>
              </AdminTreeCard>
            ))
          ) : (
            <EmptyContent
              filled
              title={tx('pages.admin.shared.empty_title')}
              description={tx('pages.admin.reading.empty_passages')}
            />
          )}

          <AdminTreeCard
            title={tx('pages.admin.reading.manual_answers_title')}
            subtitle={tx('pages.admin.reading.manual_answers_description')}
          >
            <Stack spacing={2.5}>
              <AdminManualNote>{tx('pages.admin.reading.answer_contract_note')}</AdminManualNote>

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', md: 'flex-start' }}
              >
                <TextField
                  label={tx('pages.admin.reading.fields.answer_id')}
                  value={manualAnswerId}
                  onChange={(event) => setManualAnswerId(event.target.value)}
                  type="number"
                />
                <TextField
                  fullWidth
                  label={tx('pages.admin.reading.fields.correct_answers')}
                  value={manualAnswerValue}
                  onChange={(event) => setManualAnswerValue(event.target.value)}
                />
                <LoadingButton
                  variant="contained"
                  loading={readingMutations.updateAnswer.isPending}
                  onClick={handleManualAnswerUpdate}
                >
                  {tx('pages.admin.shared.actions.update_answer')}
                </LoadingButton>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField
                  label={tx('pages.admin.reading.fields.answer_id')}
                  value={manualDeleteAnswerId}
                  onChange={(event) => setManualDeleteAnswerId(event.target.value)}
                  type="number"
                />
                <LoadingButton
                  color="error"
                  variant="outlined"
                  loading={readingMutations.deleteAnswer.isPending}
                  onClick={handleManualAnswerDelete}
                >
                  {tx('pages.admin.shared.actions.delete_answer')}
                </LoadingButton>
              </Stack>
            </Stack>
          </AdminTreeCard>
        </Stack>
      ) : null}

      <AdminUpsertDialog
        open={testDialog.value}
        title={tx('pages.admin.reading.dialogs.edit_title')}
        submitLabel={tx('pages.admin.shared.actions.save')}
        methods={testMethods}
        loading={readingTestMutations.updateTest.isPending}
        onClose={testDialog.onFalse}
        onSubmit={handleUpdateTest}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField name="title" label={tx('pages.admin.shared.fields.title')} />
          <RHFTextField
            name="description"
            label={tx('pages.admin.shared.fields.description')}
            multiline
            rows={4}
          />
          <RHFTextField
            name="timeLimit"
            label={tx('pages.admin.shared.fields.time_limit_seconds')}
            type="number"
          />
          <RHFSwitch name="isActive" label={tx('pages.admin.shared.fields.is_active')} />
        </Stack>
      </AdminUpsertDialog>

      <AdminUpsertDialog
        open={passageDialog.value}
        title={
          editingPassage
            ? tx('pages.admin.reading.dialogs.edit_passage_title')
            : tx('pages.admin.reading.dialogs.create_passage_title')
        }
        submitLabel={
          editingPassage
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={passageMethods}
        loading={readingMutations.createPassage.isPending || readingMutations.updatePassage.isPending}
        onClose={() => {
          passageDialog.onFalse();
          setEditingPassage(null);
        }}
        onSubmit={handleUpsertPassage}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField name="title" label={tx('pages.admin.shared.fields.title')} />
          <RHFTextField
            name="content"
            label={tx('pages.admin.reading.fields.content')}
            multiline
            rows={8}
          />
          <RHFTextField
            name="passageNumber"
            label={tx('pages.admin.reading.fields.passage_number')}
            type="number"
          />
        </Stack>
      </AdminUpsertDialog>

      <AdminUpsertDialog
        open={blockDialog.value}
        title={
          blockContext?.block
            ? tx('pages.admin.reading.dialogs.edit_block_title')
            : tx('pages.admin.reading.dialogs.create_block_title')
        }
        submitLabel={
          blockContext?.block
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={blockMethods}
        loading={readingMutations.createBlock.isPending || readingMutations.updateBlock.isPending}
        maxWidth="md"
        onClose={() => {
          blockDialog.onFalse();
          setBlockContext(null);
        }}
        onSubmit={handleUpsertBlock}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField name="title" label={tx('pages.admin.shared.fields.title')} />
          <RHFTextField
            name="description"
            label={tx('pages.admin.shared.fields.description')}
            multiline
            rows={4}
          />
          <RHFSelect name="blockType" label={tx('pages.admin.reading.fields.block_type')}>
            {READING_BLOCK_TYPES.map((item) => (
              <MenuItem key={item} value={item}>
                {humanizeAdminValue(item)}
              </MenuItem>
            ))}
          </RHFSelect>
          <RHFTextField
            name="order"
            label={tx('pages.admin.reading.fields.order')}
            type="number"
          />
          {requiresReadingQuestionHeading(activeBlockType) ? (
            <RHFTextField
              name="questionHeading"
              label={tx('pages.admin.reading.fields.question_heading')}
            />
          ) : null}
          {requiresReadingHeadingsList(activeBlockType) ? (
            <RHFTextField
              name="listOfHeadings"
              label={tx('pages.admin.reading.fields.list_of_headings')}
              multiline
              rows={5}
            />
          ) : null}
          {requiresReadingTableCompletion(activeBlockType) ? (
            <RHFTextField
              name="tableCompletion"
              label={tx('pages.admin.reading.fields.table_completion')}
              multiline
              rows={6}
            />
          ) : null}
          {requiresReadingFlowChartCompletion(activeBlockType) ? (
            <RHFTextField
              name="flowChartCompletion"
              label={tx('pages.admin.reading.fields.flow_chart_completion')}
              multiline
              rows={5}
            />
          ) : null}
        </Stack>
      </AdminUpsertDialog>

      <AdminUpsertDialog
        open={questionDialog.value}
        title={
          questionContext?.question
            ? tx('pages.admin.reading.dialogs.edit_question_title')
            : tx('pages.admin.reading.dialogs.create_question_title')
        }
        submitLabel={
          questionContext?.question
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={questionMethods}
        loading={
          readingMutations.createQuestion.isPending || readingMutations.updateQuestion.isPending
        }
        onClose={() => {
          questionDialog.onFalse();
          setQuestionContext(null);
        }}
        onSubmit={handleUpsertQuestion}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField
            name="questionText"
            label={tx('pages.admin.reading.fields.question_text')}
            multiline
            rows={4}
          />
          <RHFTextField
            name="order"
            label={tx('pages.admin.reading.fields.order')}
            type="number"
          />
        </Stack>
      </AdminUpsertDialog>

      <AdminUpsertDialog
        open={optionDialog.value}
        title={
          optionContext?.option
            ? tx('pages.admin.reading.dialogs.edit_option_title')
            : tx('pages.admin.reading.dialogs.create_option_title')
        }
        submitLabel={
          optionContext?.option
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={optionMethods}
        loading={readingMutations.createOption.isPending || readingMutations.updateOption.isPending}
        onClose={() => {
          optionDialog.onFalse();
          setOptionContext(null);
        }}
        onSubmit={handleUpsertOption}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField
            name="optionText"
            label={tx('pages.admin.reading.fields.option_text')}
            multiline
            rows={3}
          />
          <RHFTextField
            name="order"
            label={tx('pages.admin.reading.fields.order')}
            type="number"
          />
          <RHFSwitch
            name="isCorrect"
            label={tx('pages.admin.reading.fields.is_correct')}
          />
        </Stack>
      </AdminUpsertDialog>

      <AdminUpsertDialog
        open={answerDialog.value}
        title={tx('pages.admin.reading.dialogs.create_answer_title')}
        submitLabel={tx('pages.admin.shared.actions.create')}
        methods={answerMethods}
        loading={readingMutations.createAnswer.isPending}
        onClose={() => {
          answerDialog.onFalse();
          setAnswerQuestionId(null);
        }}
        onSubmit={handleCreateAnswer}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField
            name="correctAnswers"
            label={tx('pages.admin.reading.fields.correct_answers')}
          />
        </Stack>
      </AdminUpsertDialog>

      <AdminDeleteDialog
        open={deleteDialog.value}
        title={tx('pages.admin.reading.dialogs.delete_title')}
        description={deleteDescription}
        confirmLabel={tx('pages.admin.shared.actions.delete')}
        loading={
          readingTestMutations.deleteTest.isPending ||
          readingMutations.deletePassage.isPending ||
          readingMutations.deleteBlock.isPending ||
          readingMutations.deleteQuestion.isPending ||
          readingMutations.deleteOption.isPending
        }
        onClose={() => {
          deleteDialog.onFalse();
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </Container>
  );
}
