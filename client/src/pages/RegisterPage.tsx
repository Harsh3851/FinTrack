import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { registerSchema, type RegisterInput } from '@fintrack/shared';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { ApiError, errorMessage } from '../lib/errors';
import { AuthLayout } from './AuthLayout';

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signUp(values);
      toast.success(`Welcome to FinTrack, ${values.name.split(' ')[0]}`);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT')
        setError('email', { message: err.message });
      else toast.error(errorMessage(err));
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have one?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Full name" error={errors.name?.message}>
          {(a) => (
            <Input {...a} autoComplete="name" placeholder="Priya Sharma" {...register('name')} />
          )}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {(a) => (
            <Input
              {...a}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
            />
          )}
        </Field>
        <Field
          label="Password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.message}
        >
          {(a) => (
            <Input {...a} type="password" autoComplete="new-password" {...register('password')} />
          )}
        </Field>
        <Button type="submit" size="lg" className="mt-1 w-full" loading={isSubmitting}>
          Create account
        </Button>
        <p className="text-center text-xs text-fg-3">
          We start you off with common categories and a bank account.
        </p>
      </form>
    </AuthLayout>
  );
}
