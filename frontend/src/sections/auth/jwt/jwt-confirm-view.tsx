import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
// routes
import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hook';
import { RouterLink } from 'src/routes/components';
// auth
import { useConfirmMutation } from 'src/auth/api';
import { useLocales } from 'src/locales';

// ----------------------------------------------------------------------

type ConfirmState = 'loading' | 'success' | 'error';
type Translate = (key: string, options?: Record<string, string | number>) => string;

function readErrorField(data: unknown, field: 'code' | 'message') {
  if (!data || typeof data !== 'object' || !(field in data)) {
    return '';
  }
  const value = (data as Record<string, unknown>)[field];
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function getConfirmErrorMessage(error: unknown, tx: Translate) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const code = readErrorField(error.response?.data, 'code');
    const message = readErrorField(error.response?.data, 'message');

    if (
      status === 404 ||
      (code.includes('invalid_confirmation') && message.includes('invalid'))
    ) {
      return tx('auth.confirm.invalid');
    }

    if (
      status === 400 ||
      (code.includes('invalid_confirmation') && message.includes('expired'))
    ) {
      return tx('auth.confirm.expired');
    }
  }

  return tx('auth.confirm.generic_error');
}

export default function JwtConfirmView() {
  const { tx } = useLocales();
  const { token } = useParams();
  const { mutateAsync } = useConfirmMutation();
  const calledTokenRef = useRef<string | null>(null);
  const [state, setState] = useState<ConfirmState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    let redirectTimer: number | undefined;
    const cleanup = () => {
      mounted = false;
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };

    const normalizedToken = typeof token === 'string' ? decodeURIComponent(token).trim() : '';

    if (!normalizedToken) {
      setState('error');
      setErrorMsg(tx('auth.confirm.invalid'));
      return cleanup;
    }

    if (calledTokenRef.current === normalizedToken) {
      return cleanup;
    }
    calledTokenRef.current = normalizedToken;

    setState('loading');
    setErrorMsg('');

    mutateAsync(normalizedToken)
      .then((payload) => {
        if (!mounted) {
          return;
        }
        setState('success');
        redirectTimer = window.setTimeout(() => {
          window.location.href = paths.afterLogin(payload.user.role);
        }, 900);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        setState('error');
        setErrorMsg(getConfirmErrorMessage(error, tx));
      });

    return cleanup;
  }, [mutateAsync, token, tx]);

  return (
    <Stack spacing={2.5}>
      <Typography variant="h4">{tx('auth.confirm.title')}</Typography>

      {state === 'loading' ? (
        <Stack spacing={1.5} alignItems="flex-start">
          <CircularProgress size={24} color="inherit" />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {tx('auth.confirm.loading')}
          </Typography>
        </Stack>
      ) : null}

      {state === 'success' ? (
        <Stack spacing={1.5}>
          <Alert severity="success">{tx('auth.confirm.success')}</Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {tx('auth.confirm.redirecting')}
          </Typography>
        </Stack>
      ) : null}

      {state === 'error' ? (
        <Stack spacing={2}>
          <Alert severity="error">{errorMsg || tx('auth.confirm.generic_error')}</Alert>

          <Button component={RouterLink} href={paths.login} variant="contained" color="inherit">
            {tx('auth.confirm.go_to_login')}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
