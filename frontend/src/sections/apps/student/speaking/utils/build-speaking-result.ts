import type {
  SpeakingCriteriaScore,
  SpeakingResult,
  SpeakingSession,
  SpeakingTestDetail,
  SpeakingTranscriptSegment,
} from '../types';
import { countWords, extractKeywords } from './text';

function roundBand(value: number) {
  return Math.max(5, Math.min(8.5, Math.round(value * 2) / 2));
}

function buildCriteria(overallBand: number, keywords: string[]): SpeakingCriteriaScore[] {
  const joinedKeywords = keywords.length > 0 ? keywords.join(', ') : 'relevant topic vocabulary';

  return [
    {
      key: 'fluency',
      label: 'Fluency and coherence',
      band: roundBand(overallBand),
      rationale:
        'Turn-taking remained controlled and answers were generally developed without breaking the realtime flow.',
      evidence: ['Natural transitions between turns', 'Extended response delivery'],
    },
    {
      key: 'lexical',
      label: 'Lexical resource',
      band: roundBand(overallBand + 0.5),
      rationale: `The response set showed usable lexical range around ${joinedKeywords}.`,
      evidence: ['Topic-specific word choice', 'Some paraphrase under pressure'],
    },
    {
      key: 'grammar',
      label: 'Grammatical range and accuracy',
      band: roundBand(overallBand),
      rationale:
        'Sentence control remained serviceable, though speed reduced precision in faster turns.',
      evidence: ['Mostly stable sentence framing', 'Occasional compressed structures'],
    },
    {
      key: 'pronunciation',
      label: 'Pronunciation',
      band: roundBand(overallBand + 0.5),
      rationale:
        'Realtime delivery suggests a generally intelligible rhythm with steady pacing across longer sections.',
      evidence: ['Good delivery continuity', 'Stable tempo during longer answers'],
    },
  ];
}

function userLines(segments: SpeakingTranscriptSegment[]) {
  return segments.filter((segment) => segment.speaker === 'user').map((segment) => segment.text);
}

export function buildSpeakingResult(session: SpeakingSession, test: SpeakingTestDetail): SpeakingResult {
  const userTranscriptLines = userLines(session.transcriptSegments);
  const wordCount = countWords(userTranscriptLines);
  const keywords = extractKeywords(userTranscriptLines);
  const interruptionCount = session.turns.filter((turn) => turn.interrupted).length;
  const integrityPenalty = session.integrityEvents.length * 0.25;
  const verbosityBonus = Math.min(0.75, wordCount / 1800);
  const overallBand = roundBand(6.5 + verbosityBonus - integrityPenalty);
  const criteria = buildCriteria(overallBand, keywords);

  return {
    sessionId: session.id,
    overallBand,
    criteria,
    strengths: [
      'Maintained a live conversation rhythm without relying on submit actions.',
      'Handled turn changes with enough continuity to keep answers coherent.',
      keywords.length > 0
        ? `Used topic language around ${keywords.join(', ')}.`
        : 'Sustained topic relevance throughout the exam.',
    ],
    weaknesses: [
      'Some answers could be extended with one extra example or explanation.',
      interruptionCount > 0
        ? 'Examiner interruptions indicate pacing pressure during live turn-taking.'
        : 'Greater variation in sentence shape would strengthen higher-band performance.',
      session.integrityEvents.length > 0
        ? 'Integrity events reduced confidence in the final estimate.'
        : 'A fuller range of abstract language would improve Part 3 precision.',
    ],
    examinerSummary:
      'This estimated score reflects a live speaking session driven by realtime turn-taking, transcript flow, and session integrity. The strongest moments came when the candidate developed an idea and supported it immediately with a specific detail.',
    recommendations: [
      'Train longer Part 3 answers with a point, reason, and concrete example.',
      'Keep Part 1 answers concise but never shorter than two meaningful clauses.',
      'Use the Part 2 minute to plan structure rather than full sentences.',
    ],
    partSummaries: test.parts.map((part, index) => {
      let summary = 'Abstract discussion remained engaged, with room for sharper contrast and evaluation.';
      if (index === 0) {
        summary = 'Personal questions were handled with a clear but efficient speaking style.';
      } else if (index === 1) {
        summary = 'The long turn carried the clearest narrative structure in the session.';
      }

      return {
        partId: part.id,
        title: part.title,
        summary,
        estimatedBand: roundBand(overallBand + (index === 1 ? 0.5 : 0)),
      };
    }),
    transcriptPreview: userTranscriptLines.slice(0, 5),
    sessionMetadata: {
      durationSeconds: session.elapsedSeconds,
      transcriptWordCount: wordCount,
      interruptionCount,
      silenceRecoveries: Math.max(1, Math.round(session.elapsedSeconds / 180)),
    },
    integrityNotes: session.integrityEvents.map((event) => event.message),
  };
}
