import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import { alpha } from '@mui/material/styles';

import type { ReadingAnswerSpec, ReadingQuestion } from '../api/types';

type ReadingAnswerFieldProps = {
  question: ReadingQuestion;
  answerSpec: ReadingAnswerSpec;
  value: string;
  label: string;
  helperText?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function ReadingAnswerField({
  question,
  answerSpec,
  value,
  label,
  helperText,
  disabled = false,
  onChange,
}: ReadingAnswerFieldProps) {
  if (answerSpec.answerType === 'single_choice' && answerSpec.inputVariant === 'radio') {
    return (
      <RadioGroup
        value={value}
        onChange={(event) => onChange(event.target.value)}
        sx={{ gap: 0.5 }}
      >
        {question.options.map((option) => (
          <FormControlLabel
            key={option.id}
            value={option.optionText}
            control={<Radio size="small" />}
            disabled={disabled}
            label={
              <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                {option.optionText}
              </Typography>
            }
            sx={(theme) => ({
              m: 0,
              px: 1,
              py: 0.5,
              borderRadius: 2,
              minHeight: 40,
              alignItems: 'center',
              border: `1px solid ${alpha(theme.palette.common.black, 0.1)}`,
              bgcolor:
                value === option.optionText
                  ? alpha(theme.palette.common.black, 0.06)
                  : alpha(theme.palette.common.white, 0.72),
              '& .MuiFormControlLabel-label': {
                lineHeight: 1.3,
              },
            })}
          />
        ))}
      </RadioGroup>
    );
  }

  if (answerSpec.answerType === 'single_choice' && answerSpec.inputVariant === 'dropdown') {
    return (
      <TextField
        select
        fullWidth
        size="small"
        label={label}
        value={value}
        disabled={disabled}
        helperText={helperText}
        InputLabelProps={{ shrink: true }}
        SelectProps={{
          MenuProps: {
            PaperProps: {
              sx: {
                maxHeight: 360,
              },
            },
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            minHeight: 42,
          },
          '& .MuiSelect-select': {
            py: 1,
          },
          '& .MuiFormHelperText-root': { mt: 0.5 },
        }}
        onChange={(event) => onChange(event.target.value)}
      >
        {question.options.map((option) => (
          <MenuItem key={option.id} value={option.optionText}>
            {option.optionText}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <TextField
      fullWidth
      size="small"
      placeholder={label}
      value={value}
      disabled={disabled}
      helperText={helperText}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          minHeight: 42,
        },
        '& .MuiInputBase-input': {
          py: 1,
        },
        '& .MuiFormHelperText-root': { mt: 0.5 },
      }}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
