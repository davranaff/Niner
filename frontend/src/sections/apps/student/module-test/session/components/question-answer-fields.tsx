import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';

import type { MockQuestion, MockQuestionAnswerValue } from 'src/_mock/ielts';

type QuestionAnswerFieldsProps = {
  question: MockQuestion;
  value?: MockQuestionAnswerValue;
  onChange: (value: MockQuestionAnswerValue) => void;
  disabled?: boolean;
};

function toRecordValue(value?: MockQuestionAnswerValue) {
  return typeof value === 'object' && value && !Array.isArray(value) ? value : {};
}

function toStringValue(value?: MockQuestionAnswerValue) {
  return typeof value === 'string' ? value : '';
}

export function QuestionAnswerFields({
  question,
  value,
  onChange,
  disabled = false,
}: QuestionAnswerFieldsProps) {
  if (
    question.type === 'multiple_choice' ||
    question.type === 'true_false_not_given' ||
    question.type === 'list_of_options'
  ) {
    return (
      <RadioGroup value={toStringValue(value)} onChange={(event) => onChange(event.target.value)}>
        {question.options?.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio size="small" />}
            disabled={disabled}
            label={option.label}
          />
        ))}
      </RadioGroup>
    );
  }

  if (
    question.type === 'sentence_completion' ||
    question.type === 'summary_completion' ||
    question.type === 'short_answer' ||
    question.type === 'note_completion'
  ) {
    if (question.matchLabels?.length) {
      const recordValue = toRecordValue(value);

      return (
        <Stack spacing={1.5}>
          {question.matchLabels.map((label) => (
            <TextField
              key={label}
              size="small"
              label={label}
              value={recordValue[label] || ''}
              disabled={disabled}
              onChange={(event) => onChange({ ...recordValue, [label]: event.target.value })}
            />
          ))}
        </Stack>
      );
    }

    return (
      <TextField
        fullWidth
        size="small"
        label={question.placeholder || 'Answer'}
        value={toStringValue(value)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (question.type === 'matching_headings' || question.type === 'matching_information') {
    const recordValue = toRecordValue(value);

    return (
      <Stack spacing={1.5}>
        {question.matchLabels?.map((label) => (
          <TextField
            key={label}
            select
            fullWidth
            size="small"
            label={label}
            value={recordValue[label] || ''}
            disabled={disabled}
            onChange={(event) => onChange({ ...recordValue, [label]: event.target.value })}
          >
            {question.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ))}
      </Stack>
    );
  }

  if (question.type === 'table_completion') {
    const recordValue = toRecordValue(value);

    return (
      <Card variant="outlined" sx={{ p: 1.5 }}>
        <Table size="small">
          <TableBody>
            {question.tableRows?.map((row) => (
              <TableRow key={row}>
                <TableCell sx={{ width: 180 }}>
                  <Typography variant="body2">{row}</Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    value={recordValue[row] || ''}
                    disabled={disabled}
                    onChange={(event) => onChange({ ...recordValue, [row]: event.target.value })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  return null;
}
