import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { loginSchema, type LoginInput } from '@fintrack/shared';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { errorMessage } from '../lib/errors';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [demoLoading, setDemoLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  const onDemo = async () => {
    setDemoLoading(true);
    try {
      await loginDemo();
      toast.success('Signed in to the demo account');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          New to FinTrack?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Button
        size="lg"
        variant="secondary"
        className="w-full"
        loading={demoLoading}
        leftIcon={<Sparkles className="h-4 w-4 text-primary" />}
        onClick={onDemo}
      >
        Try the demo account
      </Button>
      <div className="my-6 flex items-center gap-3 text-xs text-fg-3">
        <span className="h-px flex-1 bg-line" />
        or sign in with email
        <span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            {formError}
          </div>
        )}
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
        <Field label="Password" error={errors.password?.message}>
          {(a) => (
            <Input
              {...a}
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              {...register('password')}
            />
          )}
        </Field>
        <Button type="submit" size="lg" className="mt-1 w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
