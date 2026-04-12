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
import { useParams, useRouter } from 'src/routes/hook';
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
  createListeningAnswerSchema,
  createListeningBlockSchema,
  createListeningOptionSchema,
  createListeningPartSchema,
  createListeningQuestionSchema,
  createListeningTestSchema,
} from '../components/schemas';
import {
  useAdminListeningDetailMutations,
  useAdminListeningDetailQuery,
  useAdminListeningTestMutations,
} from '../api/use-listening-api';
import {
  humanizeAdminValue,
  LISTENING_BLOCK_TYPES,
  requiresListeningTableCompletion,
  supportsListeningAnswers,
  supportsListeningOptions,
} from '../api/utils';
import type {
  AdminListeningAnswerFormValues,
  AdminListeningBlock,
  AdminListeningBlockFormValues,
  AdminListeningOption,
  AdminListeningOptionFormValues,
  AdminListeningPart,
  AdminListeningPartFormValues,
  AdminListeningQuestion,
  AdminListeningQuestionFormValues,
  AdminListeningTestFormValues,
} from '../api/types';

type DeleteTarget =
  | { kind: 'test'; id: number }
  | { kind: 'part'; id: number }
  | { kind: 'block'; id: number }
  | { kind: 'question'; id: number }
  | { kind: 'option'; id: number }
  | null;

const defaultTestValues: AdminListeningTestFormValues = {
  title: '',
  description: '',
  timeLimit: 1800,
  isActive: true,
  voiceUrl: '',
};

const defaultPartValues: AdminListeningPartFormValues = {
  title: '',
  order: 0,
};

const defaultBlockValues: AdminListeningBlockFormValues = {
  title: '',
  description: '',
  blockType: LISTENING_BLOCK_TYPES[0],
  order: 0,
  tableCompletion: '',
};

const defaultQuestionValues: AdminListeningQuestionFormValues = {
  questionText: '',
  order: 0,
};

const defaultOptionValues: AdminListeningOptionFormValues = {
  optionText: '',
  isCorrect: false,
  order: 0,
};

const defaultAnswerValues: AdminListeningAnswerFormValues = {
  correctAnswers: '',
};

export default function AppsAdminListeningDetailsView() {
  const { tx } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const params = useParams();
  const testId = parseNumberParam(params.testId, 0);

  const detailQuery = useAdminListeningDetailQuery(testId);
  const listeningTestMutations = useAdminListeningTestMutations();
  const listeningMutations = useAdminListeningDetailMutations(testId);

  const testDialog = useBoolean();
  const partDialog = useBoolean();
  const blockDialog = useBoolean();
  const questionDialog = useBoolean();
  const optionDialog = useBoolean();
  const answerDialog = useBoolean();
  const deleteDialog = useBoolean();

  const [editingPart, setEditingPart] = useState<AdminListeningPart | null>(null);
  const [blockContext, setBlockContext] = useState<{ partId: number; block: AdminListeningBlock | null } | null>(null);
  const [questionContext, setQuestionContext] = useState<{ blockId: number; question: AdminListeningQuestion | null } | null>(null);
  const [optionContext, setOptionContext] = useState<{ questionId: number; option: AdminListeningOption | null } | null>(null);
  const [answerQuestionId, setAnswerQuestionId] = useState<number | null>(null);
  const [manualAnswerId, setManualAnswerId] = useState('');
  const [manualAnswerValue, setManualAnswerValue] = useState('');
  const [manualDeleteAnswerId, setManualDeleteAnswerId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const testMethods = useForm<AdminListeningTestFormValues>({
    resolver: yupResolver(createListeningTestSchema(tx)),
    defaultValues: defaultTestValues,
    mode: 'onChange',
  });
  const partMethods = useForm<AdminListeningPartFormValues>({
    resolver: yupResolver(createListeningPartSchema(tx)),
    defaultValues: defaultPartValues,
    mode: 'onChange',
  });
  const blockMethods = useForm<AdminListeningBlockFormValues>({
    resolver: yupResolver(createListeningBlockSchema(tx)),
    defaultValues: defaultBlockValues,
    mode: 'onChange',
  });
  const questionMethods = useForm<AdminListeningQuestionFormValues>({
    resolver: yupResolver(createListeningQuestionSchema(tx)),
    defaultValues: defaultQuestionValues,
    mode: 'onChange',
  });
  const optionMethods = useForm<AdminListeningOptionFormValues>({
    resolver: yupResolver(createListeningOptionSchema(tx)),
    defaultValues: defaultOptionValues,
    mode: 'onChange',
  });
  const answerMethods = useForm<AdminListeningAnswerFormValues>({
    resolver: yupResolver(createListeningAnswerSchema(tx)),
    defaultValues: defaultAnswerValues,
    mode: 'onChange',
  });

  const detail = detailQuery.data;

  useEffect(() => {
    if (detail && testDialog.value) {
      testMethods.reset({
        title: detail.title,
        description: detail.description,
        timeLimit: detail.timeLimit,
        isActive: detail.isActive,
        voiceUrl: detail.voiceUrl ?? '',
      });
    }
  }, [detail, testDialog.value, testMethods]);

  useEffect(() => {
    if (partDialog.value) {
      partMethods.reset(
        editingPart
          ? {
              title: editingPart.title,
              order: editingPart.order,
            }
          : defaultPartValues
      );
    }
  }, [editingPart, partDialog.value, partMethods]);

  useEffect(() => {
    if (blockDialog.value) {
      blockMethods.reset(
        blockContext?.block
          ? {
              title: blockContext.block.title,
              description: blockContext.block.description,
              blockType: blockContext.block.blockType,
              order: blockContext.block.order,
              tableCompletion: '',
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
              isCorrect: optionContext.option.isCorrect ?? false,
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

    return tx(`pages.admin.listening.delete_help.${deleteTarget.kind}`);
  }, [deleteTarget, tx]);

  const handleUpdateTest = async (values: AdminListeningTestFormValues) => {
    if (!detail) {
      return;
    }

    await listeningTestMutations.updateTest.mutateAsync({
      testId: detail.id,
      payload: values,
    });
    enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    testDialog.onFalse();
  };

  const handleUpsertPart = async (values: AdminListeningPartFormValues) => {
    if (editingPart) {
      await listeningMutations.updatePart.mutateAsync({
        partId: editingPart.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await listeningMutations.createPart.mutateAsync({ payload: values });
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    partDialog.onFalse();
    setEditingPart(null);
  };

  const handleUpsertBlock = async (values: AdminListeningBlockFormValues) => {
    if (!blockContext) {
      return;
    }

    if (blockContext.block) {
      await listeningMutations.updateBlock.mutateAsync({
        blockId: blockContext.block.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await listeningMutations.createBlock.mutateAsync({
        partId: blockContext.partId,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    blockDialog.onFalse();
    setBlockContext(null);
  };

  const handleUpsertQuestion = async (values: AdminListeningQuestionFormValues) => {
    if (!questionContext) {
      return;
    }

    if (questionContext.question) {
      await listeningMutations.updateQuestion.mutateAsync({
        questionId: questionContext.question.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await listeningMutations.createQuestion.mutateAsync({
        blockId: questionContext.blockId,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    questionDialog.onFalse();
    setQuestionContext(null);
  };

  const handleUpsertOption = async (values: AdminListeningOptionFormValues) => {
    if (!optionContext) {
      return;
    }

    if (optionContext.option) {
      await listeningMutations.updateOption.mutateAsync({
        optionId: optionContext.option.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await listeningMutations.createOption.mutateAsync({
        questionId: optionContext.questionId,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    optionDialog.onFalse();
    setOptionContext(null);
  };

  const handleCreateAnswer = async (values: AdminListeningAnswerFormValues) => {
    if (!answerQuestionId) {
      return;
    }

    const response = await listeningMutations.createAnswer.mutateAsync({
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

    await listeningMutations.updateAnswer.mutateAsync({
      answerId,
      payload: { correctAnswers: manualAnswerValue },
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

    await listeningMutations.deleteAnswer.mutateAsync(answerId);
    enqueueSnackbar(tx('pages.admin.shared.messages.deleted'), { variant: 'success' });
    setManualDeleteAnswerId('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !detail) {
      return;
    }

    if (deleteTarget.kind === 'test') {
      await listeningTestMutations.deleteTest.mutateAsync(detail.id);
      enqueueSnackbar(tx('pages.admin.shared.messages.deleted'), { variant: 'success' });
      deleteDialog.onFalse();
      router.replace(paths.ielts.admin.listening);
      return;
    }

    if (deleteTarget.kind === 'part') {
      await listeningMutations.deletePart.mutateAsync(deleteTarget.id);
    }

    if (deleteTarget.kind === 'block') {
      await listeningMutations.deleteBlock.mutateAsync(deleteTarget.id);
    }

    if (deleteTarget.kind === 'question') {
      await listeningMutations.deleteQuestion.mutateAsync(deleteTarget.id);
    }

    if (deleteTarget.kind === 'option') {
      await listeningMutations.deleteOption.mutateAsync(deleteTarget.id);
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
          description={tx('pages.admin.listening.invalid_test')}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={detail?.title ?? tx('pages.admin.listening.detail_title')}
        description={tx('pages.admin.listening.detail_description')}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => router.push(paths.ielts.admin.listening)}>
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
              <Button
                variant="contained"
                onClick={() => {
                  setEditingPart(null);
                  partDialog.onTrue();
                }}
              >
                {tx('pages.admin.listening.actions.add_part')}
              </Button>
            }
          >
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {detail.description}
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip size="small" label={`${tx('pages.admin.shared.time_limit')}: ${detail.timeLimit}s`} />
                <Chip size="small" label={detail.voiceUrl || tx('pages.admin.shared.not_set')} />
                <Chip size="small" label={`${tx('pages.admin.listening.summary.parts')}: ${detail.parts.length}`} />
              </Stack>
            </Stack>
          </AdminTreeCard>

          {detail.parts.length ? (
            detail.parts.map((part) => (
              <AdminTreeCard
                key={part.id}
                title={`${tx('pages.admin.listening.labels.part')} ${part.order}: ${part.title}`}
                subtitle={`${tx('pages.admin.listening.summary.questions')}: ${part.questionsCount}`}
                actions={
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setBlockContext({ partId: part.id, block: null });
                        blockDialog.onTrue();
                      }}
                    >
                      {tx('pages.admin.listening.actions.add_block')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setEditingPart(part);
                        partDialog.onTrue();
                      }}
                    >
                      {tx('pages.admin.shared.actions.edit')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setDeleteTarget({ kind: 'part', id: part.id });
                        deleteDialog.onTrue();
                      }}
                    >
                      {tx('pages.admin.shared.actions.delete')}
                    </Button>
                  </Stack>
                }
              >
                {part.questionBlocks.length ? (
                  <Stack spacing={2}>
                    {part.questionBlocks.map((block) => (
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
                                {tx('pages.admin.listening.actions.add_question')}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setBlockContext({ partId: part.id, block });
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
                                          {tx('pages.admin.listening.fields.order')}: {question.order} ·{' '}
                                          {question.answerType} / {question.inputVariant}
                                        </Typography>
                                      </Stack>

                                      <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {supportsListeningOptions(block.blockType) ? (
                                          <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => {
                                              setOptionContext({ questionId: question.id, option: null });
                                              optionDialog.onTrue();
                                            }}
                                          >
                                            {tx('pages.admin.listening.actions.add_option')}
                                          </Button>
                                        ) : null}
                                        {supportsListeningAnswers(block.blockType) ? (
                                          <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => {
                                              setAnswerQuestionId(question.id);
                                              answerDialog.onTrue();
                                            }}
                                          >
                                            {tx('pages.admin.listening.actions.add_answer')}
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
                                            sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'grey.100' }}
                                          >
                                            <Typography variant="body2">
                                              {option.order}. {option.optionText}
                                            </Typography>

                                            <Stack direction="row" spacing={1}>
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

                                    {supportsListeningOptions(block.blockType) ? (
                                      <AdminManualNote>
                                        {tx('pages.admin.listening.option_contract_note')}
                                      </AdminManualNote>
                                    ) : null}

                                    {supportsListeningAnswers(block.blockType) ? (
                                      <AdminManualNote>
                                        {tx('pages.admin.listening.answer_contract_note')}
                                      </AdminManualNote>
                                    ) : null}
                                  </Stack>
                                </Card>
                              ))}
                            </Stack>
                          ) : (
                            <EmptyContent
                              title={tx('pages.admin.shared.empty_title')}
                              description={tx('pages.admin.listening.empty_questions')}
                            />
                          )}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <EmptyContent
                    title={tx('pages.admin.shared.empty_title')}
                    description={tx('pages.admin.listening.empty_blocks')}
                  />
                )}
              </AdminTreeCard>
            ))
          ) : (
            <EmptyContent
              filled
              title={tx('pages.admin.shared.empty_title')}
              description={tx('pages.admin.listening.empty_parts')}
            />
          )}

          <AdminTreeCard
            title={tx('pages.admin.listening.manual_answers_title')}
            subtitle={tx('pages.admin.listening.manual_answers_description')}
          >
            <Stack spacing={2.5}>
              <AdminManualNote>{tx('pages.admin.listening.answer_contract_note')}</AdminManualNote>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField
                  label={tx('pages.admin.listening.fields.answer_id')}
                  value={manualAnswerId}
                  onChange={(event) => setManualAnswerId(event.target.value)}
                  type="number"
                />
                <TextField
                  fullWidth
                  label={tx('pages.admin.listening.fields.correct_answers')}
                  value={manualAnswerValue}
                  onChange={(event) => setManualAnswerValue(event.target.value)}
                />
                <LoadingButton
                  variant="contained"
                  loading={listeningMutations.updateAnswer.isPending}
                  onClick={handleManualAnswerUpdate}
                >
                  {tx('pages.admin.shared.actions.update_answer')}
                </LoadingButton>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField
                  label={tx('pages.admin.listening.fields.answer_id')}
                  value={manualDeleteAnswerId}
                  onChange={(event) => setManualDeleteAnswerId(event.target.value)}
                  type="number"
                />
                <LoadingButton
                  color="error"
                  variant="outlined"
                  loading={listeningMutations.deleteAnswer.isPending}
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
        title={tx('pages.admin.listening.dialogs.edit_title')}
        submitLabel={tx('pages.admin.shared.actions.save')}
        methods={testMethods}
        loading={listeningTestMutations.updateTest.isPending}
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
            name="voiceUrl"
            label={tx('pages.admin.listening.fields.voice_url')}
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
        open={partDialog.value}
        title={
          editingPart
            ? tx('pages.admin.listening.dialogs.edit_part_title')
            : tx('pages.admin.listening.dialogs.create_part_title')
        }
        submitLabel={
          editingPart
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={partMethods}
        loading={listeningMutations.createPart.isPending || listeningMutations.updatePart.isPending}
        onClose={() => {
          partDialog.onFalse();
          setEditingPart(null);
        }}
        onSubmit={handleUpsertPart}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField name="title" label={tx('pages.admin.shared.fields.title')} />
          <RHFTextField
            name="order"
            label={tx('pages.admin.listening.fields.order')}
            type="number"
          />
        </Stack>
      </AdminUpsertDialog>

      <AdminUpsertDialog
        open={blockDialog.value}
        title={
          blockContext?.block
            ? tx('pages.admin.listening.dialogs.edit_block_title')
            : tx('pages.admin.listening.dialogs.create_block_title')
        }
        submitLabel={
          blockContext?.block
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={blockMethods}
        loading={listeningMutations.createBlock.isPending || listeningMutations.updateBlock.isPending}
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
          <RHFSelect name="blockType" label={tx('pages.admin.listening.fields.block_type')}>
            {LISTENING_BLOCK_TYPES.map((item) => (
              <MenuItem key={item} value={item}>
                {humanizeAdminValue(item)}
              </MenuItem>
            ))}
          </RHFSelect>
          <RHFTextField
            name="order"
            label={tx('pages.admin.listening.fields.order')}
            type="number"
          />
          {requiresListeningTableCompletion(activeBlockType) ? (
            <RHFTextField
              name="tableCompletion"
              label={tx('pages.admin.listening.fields.table_completion')}
              multiline
              rows={6}
            />
          ) : null}
        </Stack>
      </AdminUpsertDialog>

      <AdminUpsertDialog
        open={questionDialog.value}
        title={
          questionContext?.question
            ? tx('pages.admin.listening.dialogs.edit_question_title')
            : tx('pages.admin.listening.dialogs.create_question_title')
        }
        submitLabel={
          questionContext?.question
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={questionMethods}
        loading={listeningMutations.createQuestion.isPending || listeningMutations.updateQuestion.isPending}
        onClose={() => {
          questionDialog.onFalse();
          setQuestionContext(null);
        }}
        onSubmit={handleUpsertQuestion}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField
            name="questionText"
            label={tx('pages.admin.listening.fields.question_text')}
            multiline
            rows={4}
          />
          <RHFTextField
            name="order"
            label={tx('pages.admin.listening.fields.order')}
            type="number"
          />
        </Stack>
      </AdminUpsertDialog>

      <AdminUpsertDialog
        open={optionDialog.value}
        title={
          optionContext?.option
            ? tx('pages.admin.listening.dialogs.edit_option_title')
            : tx('pages.admin.listening.dialogs.create_option_title')
        }
        submitLabel={
          optionContext?.option
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={optionMethods}
        loading={listeningMutations.createOption.isPending || listeningMutations.updateOption.isPending}
        onClose={() => {
          optionDialog.onFalse();
          setOptionContext(null);
        }}
        onSubmit={handleUpsertOption}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField
            name="optionText"
            label={tx('pages.admin.listening.fields.option_text')}
            multiline
            rows={3}
          />
          <RHFTextField
            name="order"
            label={tx('pages.admin.listening.fields.order')}
            type="number"
          />
          <RHFSwitch name="isCorrect" label={tx('pages.admin.listening.fields.is_correct')} />
        </Stack>
      </AdminUpsertDialog>

      <AdminUpsertDialog
        open={answerDialog.value}
        title={tx('pages.admin.listening.dialogs.create_answer_title')}
        submitLabel={tx('pages.admin.shared.actions.create')}
        methods={answerMethods}
        loading={listeningMutations.createAnswer.isPending}
        onClose={() => {
          answerDialog.onFalse();
          setAnswerQuestionId(null);
        }}
        onSubmit={handleCreateAnswer}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField
            name="correctAnswers"
            label={tx('pages.admin.listening.fields.correct_answers')}
          />
        </Stack>
      </AdminUpsertDialog>

      <AdminDeleteDialog
        open={deleteDialog.value}
        title={tx('pages.admin.listening.dialogs.delete_title')}
        description={deleteDescription}
        confirmLabel={tx('pages.admin.shared.actions.delete')}
        loading={
          listeningTestMutations.deleteTest.isPending ||
          listeningMutations.deletePart.isPending ||
          listeningMutations.deleteBlock.isPending ||
          listeningMutations.deleteQuestion.isPending ||
          listeningMutations.deleteOption.isPending
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
