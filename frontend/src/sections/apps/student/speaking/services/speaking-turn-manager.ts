import {
  EXAMINER_RESPONSE_DELAY_MS,
  EXAMINER_SHORT_RESPONSE_DELAY_MS,
  NO_ANSWER_MOVE_ON_DELAY_MS,
  NO_ANSWER_REPROMPT_DELAY_MS,
  PART1_MAX_TURN_MS,
  PART2_MAX_TURN_MS,
  PART3_MAX_TURN_MS,
} from '../constants';
import {
  buildClosingPrompt,
  buildMoveOnLeadIn,
  buildNoAnswerReprompt,
  buildPart2Introduction,
  buildPart3Transition,
  buildPreparationCompletePrompt,
  buildQuestionPrompt,
  buildRedirectPrompt,
  buildRephrasePrompt,
  buildRescuePrompt,
} from './speaking-examiner-dialogue';
import type {
  SpeakingAnswerEvaluation,
  SpeakingPartId,
  SpeakingQuestion,
  SpeakingSessionSnapshot,
  SpeakingTestDetail,
  SpeakingTurnInstruction,
} from '../types';

export interface SpeakingTurnCompletionMetrics {
  transcript: string;
  wordCount: number;
  durationMs: number;
  wasSilent: boolean;
  wasCutOff: boolean;
  followUpsUsed: number;
  silencePromptsUsed: number;
}

function flattenQuestions(test: SpeakingTestDetail) {
  return test.parts.flatMap((part) => part.questions);
}

function firstQuestionByPart(test: SpeakingTestDetail, partId: SpeakingPartId) {
  return test.parts.find((part) => part.id === partId)?.questions[0];
}

function fallbackFollowUps(question: SpeakingQuestion) {
  if (question.partId === 'part1') {
    return ['Can you tell me a bit more about that?'];
  }

  if (question.partId === 'part2') {
    return ['Can you say a little more about that?'];
  }

  return ['Why do you think that is?'];
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
}

function looksLikeFullName(text: string) {
  const normalized = normalizeText(text);
  if (
    normalized.startsWith('my name is') ||
    normalized.startsWith("i'm ") ||
    normalized.startsWith('i am ')
  ) {
    return true;
  }

  const tokens = normalized
    .split(/\s+/)
    .filter((token) => token && !['hello', 'hi', 'good', 'morning'].includes(token));
  const alphaTokens = tokens.filter((token) => /^[a-z]+$/.test(token));
  return alphaTokens.length >= 2 && alphaTokens.length <= 5;
}

function mentionsWorkOrStudy(text: string) {
  const normalized = normalizeText(text);
  return /\b(work|working|job|office|company|business|study|student|school|college|university|course)\b/.test(
    normalized
  );
}

export class SpeakingTurnManager {
  constructor(private test: SpeakingTestDetail) {}

  getQuestion(index: number) {
    return flattenQuestions(this.test)[index] ?? flattenQuestions(this.test)[0];
  }

  getQuestionIndex(questionId: string) {
    return flattenQuestions(this.test).findIndex((question) => question.id === questionId);
  }

  getQuestionById(questionId: string) {
    return flattenQuestions(this.test).find((question) => question.id === questionId);
  }

  getRemainingQuestions(index: number) {
    return flattenQuestions(this.test).slice(index + 1);
  }

  getNoAnswerDelayMs(snapshot: SpeakingSessionSnapshot, silencePromptsUsed: number) {
    if (!this.test.parts.length) {
      return NO_ANSWER_REPROMPT_DELAY_MS;
    }

    if (snapshot.currentQuestion.partId === 'part2') {
      return silencePromptsUsed === 0 ? 6200 : 9200;
    }

    if (snapshot.currentQuestion.partId === 'part3') {
      return silencePromptsUsed === 0 ? 5000 : 7800;
    }

    return silencePromptsUsed === 0 ? NO_ANSWER_REPROMPT_DELAY_MS : NO_ANSWER_MOVE_ON_DELAY_MS;
  }

  getExaminerResponseDelayMs(snapshot: SpeakingSessionSnapshot, metrics: SpeakingTurnCompletionMetrics) {
    if (!this.test.parts.length) {
      return EXAMINER_RESPONSE_DELAY_MS;
    }

    if (snapshot.currentQuestion.partId === 'part2' && metrics.durationMs > 25000) {
      return 960;
    }

    if (metrics.wasCutOff || metrics.wordCount < 7) {
      return EXAMINER_SHORT_RESPONSE_DELAY_MS;
    }

    if (snapshot.currentQuestion.partId === 'part3' && metrics.wordCount > 45) {
      return 860;
    }

    return EXAMINER_RESPONSE_DELAY_MS;
  }

  getUserTurnBudgetMs(snapshot: SpeakingSessionSnapshot) {
    if (!this.test.parts.length) {
      return PART1_MAX_TURN_MS;
    }

    if (snapshot.currentQuestion.partId === 'part2') {
      return snapshot.currentQuestion.cueCard?.targetAnswerSeconds
        ? snapshot.currentQuestion.cueCard.targetAnswerSeconds * 1000
        : PART2_MAX_TURN_MS;
    }

    if (snapshot.currentQuestion.partId === 'part3') {
      return Math.max(PART3_MAX_TURN_MS, snapshot.currentQuestion.expectedAnswerSeconds * 1100);
    }

    return Math.max(PART1_MAX_TURN_MS, snapshot.currentQuestion.expectedAnswerSeconds * 1150);
  }

  beginSession(): SpeakingTurnInstruction {
    const question = this.getQuestion(0);
    return {
      kind: 'examiner_prompt',
      text: buildQuestionPrompt(question),
      question,
    };
  }

  repeatCurrentQuestion(snapshot: SpeakingSessionSnapshot): SpeakingTurnInstruction {
    const question = this.getQuestionById(snapshot.currentQuestion.id) ?? snapshot.currentQuestion;

    return {
      kind: 'reprompt',
      text:
        snapshot.status === 'preparing_part2' || snapshot.status === 'preparation_mode'
          ? 'You have a moment to make notes. I will tell you when to begin.'
          : question.rephrasePrompt ?? question.prompt,
      question,
    };
  }

  completePreparation(snapshot: SpeakingSessionSnapshot): SpeakingTurnInstruction {
    const question = this.getQuestionById(snapshot.currentQuestion.id) ?? snapshot.currentQuestion;

    return {
      kind: 'examiner_prompt',
      text: buildPreparationCompletePrompt(question),
      question,
    };
  }

  handleNoUserResponse(snapshot: SpeakingSessionSnapshot, silencePromptsUsed: number): SpeakingTurnInstruction {
    const question = snapshot.currentQuestion;

    if (silencePromptsUsed === 0) {
      if (question.partId === 'part2') {
        return {
          kind: 'reprompt',
          text: buildNoAnswerReprompt(question, snapshot.prepRemainingSeconds > 0),
          question,
        };
      }

      return {
        kind: 'reprompt',
        text: buildNoAnswerReprompt(question, false),
        question,
      };
    }

    return this.advanceFromQuestion(snapshot, {
      leadIn: question.partId === 'part2' ? 'All right.' : 'All right. Let’s move on.',
    });
  }

  handleUserTurnCompleted(
    snapshot: SpeakingSessionSnapshot,
    metrics: SpeakingTurnCompletionMetrics,
    evaluation: SpeakingAnswerEvaluation
  ): SpeakingTurnInstruction {
    const question = snapshot.currentQuestion;

    if (evaluation.action === 'rephrase') {
      return {
        kind: 'reprompt',
        text: buildRephrasePrompt(question),
        question,
      };
    }

    if (evaluation.action === 'rescue_prompt') {
      return {
        kind: 'rescue_prompt',
        text: buildRescuePrompt(question),
        question,
      };
    }

    if (evaluation.action === 'gentle_redirect') {
      return {
        kind: 'gentle_redirect',
        text: buildRedirectPrompt(question),
        question,
      };
    }

    if (question.partId === 'part1') {
      return this.handlePart1(snapshot, metrics, evaluation);
    }

    if (question.partId === 'part2') {
      return this.handlePart2(snapshot, metrics, evaluation);
    }

    return this.handlePart3(snapshot, metrics, evaluation);
  }

  private handlePart1(
    snapshot: SpeakingSessionSnapshot,
    metrics: SpeakingTurnCompletionMetrics,
    evaluation: SpeakingAnswerEvaluation
  ): SpeakingTurnInstruction {
    const question = snapshot.currentQuestion;
    if (evaluation.action === 'soft_cutoff') {
      return this.advanceFromQuestion(snapshot, {
        leadIn: buildMoveOnLeadIn(question, true),
      });
    }

    if (evaluation.action === 'follow_up' && !metrics.wasSilent && metrics.followUpsUsed < 1) {
      return {
        kind: 'follow_up',
        text: this.getFollowUpPrompt(question, metrics.transcript, metrics.followUpsUsed),
        question,
      };
    }

    return this.advanceFromQuestion(snapshot, {
      leadIn: metrics.wasCutOff ? buildMoveOnLeadIn(question, true) : undefined,
    });
  }

  private handlePart2(
    snapshot: SpeakingSessionSnapshot,
    metrics: SpeakingTurnCompletionMetrics,
    evaluation: SpeakingAnswerEvaluation
  ): SpeakingTurnInstruction {
    const question = snapshot.currentQuestion;
    if (evaluation.action === 'soft_cutoff') {
      return this.advanceFromQuestion(snapshot, {
        leadIn: buildMoveOnLeadIn(question, true),
      });
    }

    if (evaluation.action === 'follow_up' && !metrics.wasSilent && !metrics.wasCutOff && metrics.followUpsUsed < 1) {
      return {
        kind: 'follow_up',
        text: this.getFollowUpPrompt(question, metrics.transcript, metrics.followUpsUsed),
        question,
      };
    }

    return this.advanceFromQuestion(snapshot, {
      leadIn: buildMoveOnLeadIn(question, metrics.wasCutOff),
    });
  }

  private handlePart3(
    snapshot: SpeakingSessionSnapshot,
    metrics: SpeakingTurnCompletionMetrics,
    evaluation: SpeakingAnswerEvaluation
  ): SpeakingTurnInstruction {
    const question = snapshot.currentQuestion;
    if (evaluation.action === 'soft_cutoff') {
      return this.advanceFromQuestion(snapshot, {
        leadIn: buildMoveOnLeadIn(question, true),
      });
    }

    if (evaluation.action === 'follow_up' && !metrics.wasSilent && !metrics.wasCutOff && metrics.followUpsUsed < 1) {
      return {
        kind: 'follow_up',
        text: this.getFollowUpPrompt(question, metrics.transcript, metrics.followUpsUsed),
        question,
      };
    }

    return this.advanceFromQuestion(snapshot, {
      leadIn: metrics.wasCutOff ? buildMoveOnLeadIn(question, true) : undefined,
    });
  }

  private advanceFromQuestion(
    snapshot: SpeakingSessionSnapshot,
    options?: {
      leadIn?: string;
    }
  ): SpeakingTurnInstruction {
    const { currentQuestion } = snapshot;
    const nextIndex = snapshot.currentQuestionIndex + 1;
    const questions = flattenQuestions(this.test);
    const nextQuestion = questions[nextIndex];

    if (!nextQuestion) {
      return {
        kind: 'finish',
        text: buildClosingPrompt(options?.leadIn),
        question: currentQuestion,
      };
    }

    if (currentQuestion.partId === 'part1' && nextQuestion.partId === 'part2') {
      return {
        kind: 'prepare_part2',
        text: buildPart2Introduction(nextQuestion),
        question: nextQuestion,
      };
    }

    if (currentQuestion.partId === 'part2' && nextQuestion.partId === 'part3') {
      const part3 = firstQuestionByPart(this.test, 'part3') ?? nextQuestion;
      return {
        kind: 'move_on',
        text: buildPart3Transition(part3, options?.leadIn),
        question: part3,
      };
    }

    const nextText = buildQuestionPrompt(nextQuestion, currentQuestion);

    return {
      kind: options?.leadIn ? 'move_on' : 'examiner_prompt',
      text: options?.leadIn ? `${options.leadIn} ${nextText}` : nextText,
      question: nextQuestion,
    };
  }

  private getFollowUpPrompt(question: SpeakingQuestion, transcript: string, usedCount: number) {
    const activeQuestion = this.getQuestionById(question.id) ?? question;

    if (activeQuestion.shortLabel.toLowerCase() === 'work or study' && usedCount === 0) {
      if (!looksLikeFullName(transcript)) {
        return 'Could you tell me your full name?';
      }

      if (!mentionsWorkOrStudy(transcript)) {
        return 'And do you work or are you a student?';
      }
    }

    const prompts = activeQuestion.followUps?.length
      ? activeQuestion.followUps
      : fallbackFollowUps(activeQuestion);
    return prompts[Math.min(usedCount, prompts.length - 1)];
  }
}
