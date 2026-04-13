import { paths } from 'src/routes/paths';

export type GeneratedTestOriginModule = 'reading' | 'listening' | 'writing' | 'speaking';

export type GeneratedTestOrigin = {
  kind: 'assignment_generated';
  assignmentId: number;
  assignmentTitle: string;
  skillLabel: string | null;
  sourceExamKind: GeneratedTestOriginModule;
  sourceExamId: number;
  generatedAt: string | null;
};

export function buildGeneratedTestOriginLabel(
  origin: GeneratedTestOrigin,
  translate: (key: string, options?: Record<string, string | number>) => string
) {
  if (origin.skillLabel) {
    return translate('pages.ielts.shared.generated_from_skill', { skill: origin.skillLabel });
  }

  return translate('pages.ielts.shared.generated_from_assignment');
}

export function buildGeneratedTestSourceAttemptLabel(
  origin: GeneratedTestOrigin,
  translate: (key: string, options?: Record<string, string | number>) => string
) {
  return translate('pages.ielts.assignments.source_attempt_value', {
    module: translate(`pages.ielts.${origin.sourceExamKind}.title`),
    id: origin.sourceExamId,
  });
}

export function buildGeneratedAssignmentHref(origin: GeneratedTestOrigin) {
  const params = new URLSearchParams({
    module: origin.sourceExamKind,
    exam: String(origin.sourceExamId),
    assignment: String(origin.assignmentId),
  });

  return `${paths.ielts.assignments}?${params.toString()}`;
}
