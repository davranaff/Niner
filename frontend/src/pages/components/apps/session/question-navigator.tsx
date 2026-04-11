import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

type QuestionNavigatorProps = {
  items: Array<{
    id: string;
    label: string;
    answered: boolean;
    active: boolean;
  }>;
  onSelect: (id: string) => void;
};

export function QuestionNavigator({ items, onSelect }: QuestionNavigatorProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {items.map((item) => {
        let borderColor = (theme: Theme) => alpha(theme.palette.common.black, 0.12);
        let backgroundColor = (theme: Theme) => alpha(theme.palette.common.white, 0.4);

        if (item.active) {
          borderColor = (theme: Theme) => alpha(theme.palette.common.black, 0.56);
          backgroundColor = (theme: Theme) => alpha(theme.palette.common.black, 0.92);
        } else if (item.answered) {
          borderColor = (theme: Theme) => alpha(theme.palette.common.black, 0.26);
          backgroundColor = (theme: Theme) => alpha(theme.palette.common.black, 0.1);
        }

        return (
          <ButtonBase
            key={item.id}
            onClick={() => onSelect(item.id)}
            sx={(theme) => ({
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: `1px solid ${borderColor(theme)}`,
              bgcolor: backgroundColor(theme),
              color: item.active ? theme.palette.common.white : theme.palette.common.black,
            })}
          >
            <Typography variant="caption" sx={{ fontWeight: 800 }}>
              {item.label}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
