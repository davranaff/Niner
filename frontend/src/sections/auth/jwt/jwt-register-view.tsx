import { useForm } from 'react-hook-form';
import { useCallback, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// routes
import { paths } from 'src/routes/paths';
import { useSearchParams } from 'src/routes/hook';
import { RouterLink } from 'src/routes/components';
// auth
import { isTokenPairResponse, useRegisterMutation } from 'src/auth/api';
import { useLocales } from 'src/locales';
// components
import Iconify from 'src/components/iconify';
import FormProvider, { RHFSelect, RHFTextField } from 'src/components/hook-form';
import { getAuthFormErrorMessage } from 'src/utils/api-error-messages';
import { createRegisterSchema } from './utils/auth-form-schemas';

// ----------------------------------------------------------------------

type FormValuesProps = {
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher';
  password: string;
  passwordConfirm: string;
};

export default function JwtRegisterView() {
  const { tx } = useLocales();
  const registerMutation = useRegisterMutation();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const password = useBoolean();

  const methods = useForm<FormValuesProps>({
    resolver: yupResolver(createRegisterSchema(tx)),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'student',
      password: '',
      passwordConfirm: '',
    },
    mode: 'onChange',
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = useCallback(
    async (data: FormValuesProps) => {
      try {
        setErrorMsg('');
        setSuccessMsg('');
        const payload = await registerMutation.mutateAsync({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email,
          role: data.role,
          password: data.password,
          passwordConfirm: data.passwordConfirm,
        });
        if (isTokenPairResponse(payload)) {
          window.location.href = returnTo || paths.afterLogin(payload.user.role);
        } else {
          setSuccessMsg(tx('auth.register.success_check_email'));
        }
      } catch (error) {
        setErrorMsg(getAuthFormErrorMessage(error, 'register'));
      }
    },
    [registerMutation, returnTo, tx]
  );

  return (
    <>
      <Stack spacing={2} sx={{ mb: 5, position: 'relative' }}>
        <Typography variant="h4">{tx('auth.register.title')}</Typography>

        <Stack direction="row" spacing={1}>
          <Button
            component={RouterLink}
            href={paths.login}
            fullWidth
            variant="outlined"
            color="inherit"
          >
            {tx('auth.shared.sign_in')}
          </Button>
          <Button
            component={RouterLink}
            href={paths.register}
            fullWidth
            variant="contained"
            color="inherit"
          >
            {tx('auth.shared.sign_up')}
          </Button>
        </Stack>
      </Stack>

      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2.5}>
          {!!errorMsg && (
            <Alert severity="error" onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          {!!successMsg && (
            <Alert severity="success" onClose={() => setSuccessMsg('')}>
              {successMsg}
            </Alert>
          )}

          <RHFTextField name="firstName" label={tx('auth.shared.first_name')} />

          <RHFTextField name="lastName" label={tx('auth.shared.last_name')} />

          <RHFTextField name="email" label={tx('auth.shared.email')} />

          <RHFSelect name="role" label={tx('auth.shared.role')}>
            <MenuItem value="student">{tx('auth.shared.role_student')}</MenuItem>
            <MenuItem value="teacher">{tx('auth.shared.role_teacher')}</MenuItem>
          </RHFSelect>

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

          <RHFTextField
            name="passwordConfirm"
            label={tx('auth.shared.confirm_password')}
            type={password.value ? 'text' : 'password'}
          />

          <LoadingButton
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting || registerMutation.isPending}
          >
            {tx('auth.register.submit')}
          </LoadingButton>
        </Stack>
      </FormProvider>

      <Typography
        component="div"
        sx={{ color: 'text.secondary', mt: 2.5, typography: 'caption', textAlign: 'center' }}
      >
        {tx('auth.register.terms')}
      </Typography>
    </>
  );
}
