import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// routes
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
// auth
import { useLocales } from 'src/locales';
// components
import Iconify from 'src/components/iconify';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import { useJwtLogin, type JwtLoginFormValues } from './hooks/use-jwt-login';
import { createLoginSchema } from './utils/auth-form-schemas';

// ----------------------------------------------------------------------

export default function JwtLoginView() {
  const { tx } = useLocales();
  const password = useBoolean();
  const {
    errorMsg,
    setErrorMsg,
    loginMutation,
    signInIsMock,
    studentDemo,
    onSubmit,
    onDemoLogin,
  } = useJwtLogin();

  const methods = useForm<JwtLoginFormValues>({
    resolver: yupResolver(createLoginSchema(tx)),
    defaultValues: studentDemo,
    mode: 'onChange',
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  return (
    <>
      <Stack spacing={2} sx={{ mb: 5, position: 'relative' }}>
        <Typography variant="h4">{tx('auth.login.title')}</Typography>

        <Stack direction="row" spacing={1}>
          <Button
            component={RouterLink}
            href={paths.login}
            fullWidth
            variant="contained"
            color="inherit"
          >
            {tx('auth.shared.sign_in')}
          </Button>
          <Button
            component={RouterLink}
            href={paths.register}
            fullWidth
            variant="outlined"
            color="inherit"
          >
            {tx('auth.shared.sign_up')}
          </Button>
        </Stack>
      </Stack>

      {signInIsMock ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">{tx('auth.login.demo_hint')}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                color="inherit"
                onClick={() => onDemoLogin('student', reset)}
                disabled={loginMutation.isPending}
              >
                {tx('auth.login.student_demo')}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => onDemoLogin('teacher', reset)}
                disabled={loginMutation.isPending}
              >
                {tx('auth.login.teacher_demo')}
              </Button>
            </Stack>
          </Stack>
        </Alert>
      ) : null}

      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2.5}>
          {!!errorMsg && (
            <Alert severity="error" onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          <RHFTextField name="email" label={tx('auth.shared.email')} />

          <RHFTextField
            name="password"
            label={tx('auth.shared.password')}
            type={password.value ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={password.onToggle} edge="end">
                    <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Link variant="body2" color="inherit" underline="always" sx={{ alignSelf: 'flex-end' }}>
            {tx('auth.login.forgot')}
          </Link>

          <LoadingButton
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting || loginMutation.isPending}
          >
            {tx('auth.login.submit')}
          </LoadingButton>
        </Stack>
      </FormProvider>

      {signInIsMock ? (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {tx('auth.login.demo_credentials')}
          </Typography>
        </>
      ) : null}
    </>
  );
}
