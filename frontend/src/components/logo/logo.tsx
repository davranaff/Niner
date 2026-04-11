import { forwardRef } from 'react';
import Link from '@mui/material/Link';
import Box, { BoxProps } from '@mui/material/Box';
// routes
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export interface LogoProps extends BoxProps {
  disabledLink?: boolean;
  variant?: 'icon' | 'full';
}

const Logo = forwardRef<HTMLImageElement, LogoProps>(
  ({ disabledLink = false, variant = 'icon', sx, ...other }, ref) => {
    const isFull = variant === 'full';
    const src = isFull ? '/logo/logo_full.svg' : '/logo/logo_icon.svg';

    const logo = (
      <Box
        ref={ref}
        component="img"
        src={src}
        alt="Band 9.0"
        sx={{
          width: isFull ? 152 : 40,
          height: isFull ? 'auto' : 40,
          display: 'inline-flex',
          ...sx,
        }}
        {...other}
      />
    );

    if (disabledLink) {
      return logo;
    }

    return (
      <Link component={RouterLink} href="/" sx={{ display: 'contents' }}>
        {logo}
      </Link>
    );
  }
);

export default Logo;
