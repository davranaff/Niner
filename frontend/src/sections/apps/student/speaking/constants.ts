import type { SpeakingSessionStatus } from './types';

export const SPEAKING_ACTIVE_EXAMS_STORAGE_KEY = 'student-speaking-active-exams';
export const SPEAKING_RECENT_ATTEMPTS_STORAGE_KEY = 'student-speaking-recent-attempts';

export const SPEAKING_LIST_DEFAULT_PAGE_SIZE = 12;
export const SPEAKING_EXAMS_LOOKUP_LIMIT = 100;

export const DEFAULT_NOISE_THRESHOLD = 0.028;
export const DEFAULT_SILENCE_THRESHOLD_MS = 1400;
export const DEFAULT_MIN_SPEECH_MS = 280;

export const PART1_SILENCE_THRESHOLD_MS = 1550;
export const PART2_SILENCE_THRESHOLD_MS = 2350;
export const PART3_SILENCE_THRESHOLD_MS = 1800;

export const NO_ANSWER_REPROMPT_DELAY_MS = 4300;
export const NO_ANSWER_MOVE_ON_DELAY_MS = 7200;

export const EXAMINER_RESPONSE_DELAY_MS = 720;
export const EXAMINER_SHORT_RESPONSE_DELAY_MS = 520;

export const PART1_MAX_TURN_MS = 36000;
export const PART2_MAX_TURN_MS = 125000;
export const PART3_MAX_TURN_MS = 60000;

export const SESSION_STATUS_LABELS: Record<SpeakingSessionStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting',
  connected: 'Connected',
  examiner_speaking: 'Examiner speaking',
  user_listening: 'Waiting for candidate',
  waiting_for_user: 'Waiting for candidate',
  user_speaking: 'Candidate speaking',
  silence_watch: 'Listening for completion',
  examiner_interrupted: 'Examiner interrupted',
  processing_turn_transition: 'Processing turn transition',
  moving_on: 'Moving on',
  preparing_part2: 'Preparing Part 2',
  preparation_mode: 'Preparation in progress',
  long_turn_listening: 'Candidate long turn',
  discussion_mode: 'Discussion in progress',
  closing: 'Closing',
  reconnecting: 'Reconnecting',
  finished: 'Finished',
  terminated: 'Terminated',
};

export const INTEGRITY_EVENT_MESSAGES: Record<string, string> = {
  tab_switch: 'Tab change detected during a protected speaking session.',
  window_blur: 'Window focus was lost while the live exam was active.',
  route_leave: 'Protected route leave attempt was detected during the exam.',
  refresh_attempt: 'Page refresh attempt detected during the exam.',
  disconnect: 'Realtime connection was interrupted.',
  microphone_permission_lost: 'Microphone permission was lost during the exam.',
};
