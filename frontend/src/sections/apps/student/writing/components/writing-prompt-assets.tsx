import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useLocales } from 'src/locales';

type Props = {
  imageUrls: string[];
  fileUrls: string[];
};

export function WritingPromptAssets({ imageUrls, fileUrls }: Props) {
  const { tx } = useLocales();

  if (!imageUrls.length && !fileUrls.length) {
    return null;
  }

  return (
    <Stack spacing={1.5}>
      {imageUrls.length ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2">{tx('pages.ielts.shared.visual_prompt')}</Typography>
          {imageUrls.map((url) => (
            <Box
              key={url}
              component="img"
              src={url}
              alt=""
              sx={{
                width: 1,
                borderRadius: 2,
                border: '1px solid rgba(0, 0, 0, 0.08)',
                objectFit: 'cover',
              }}
            />
          ))}
        </Stack>
      ) : null}

      {fileUrls.length ? (
        <Stack spacing={0.75}>
          <Typography variant="subtitle2">{tx('pages.ielts.shared.attachments')}</Typography>
          {fileUrls.map((url, index) => (
            <Link key={url} href={url} target="_blank" rel="noreferrer" underline="hover">
              {tx('pages.ielts.shared.open_attachment')} {index + 1}
            </Link>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
