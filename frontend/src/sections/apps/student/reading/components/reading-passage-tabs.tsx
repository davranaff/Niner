import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { useLocales } from 'src/locales';

import type { ReadingPart } from '../api/types';

type Props = {
  passages: ReadingPart[];
  selectedPassageId?: number | null;
  onSelect: (passageNumber: number) => void;
};

export function ReadingPassageTabs({ passages, selectedPassageId, onSelect }: Props) {
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
      {passages.map((passage) => (
        <Button
          key={passage.id}
          size="small"
          variant={passage.id === selectedPassageId ? 'contained' : 'outlined'}
          color="inherit"
          sx={{ flexShrink: 0, borderRadius: 999, px: 1.5, minHeight: 34 }}
          onClick={() => onSelect(passage.passageNumber)}
        >
          {tx('pages.ielts.shared.passage_label', { number: passage.passageNumber })}
        </Button>
      ))}
    </Stack>
  );
}
