import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { useLocales } from 'src/locales';

import type { WritingPart } from '../api/types';

type Props = {
  parts: WritingPart[];
  selectedPartId?: number | null;
  onSelect: (order: number) => void;
};

export function WritingPartTabs({ parts, selectedPartId, onSelect }: Props) {
  const { tx } = useLocales();

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        maxWidth: { xs: '100%', xl: '62%' },
        overflowX: 'auto',
        overflowY: 'hidden',
        pb: 0.25,
        '&::-webkit-scrollbar': {
          height: 6,
        },
      }}
    >
      {parts.map((part) => (
        <Button
          key={part.id}
          size="small"
          variant={part.id === selectedPartId ? 'contained' : 'outlined'}
          color="inherit"
          sx={{ flexShrink: 0, borderRadius: 999, px: 1.5, minHeight: 34 }}
          onClick={() => onSelect(part.order)}
        >
          {tx('pages.ielts.shared.task_label', { number: part.order })}
        </Button>
      ))}
    </Stack>
  );
}
