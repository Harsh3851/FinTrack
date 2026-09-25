import type { ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { errorMessage } from '../../lib/errors';
import { Button } from './Button';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-3">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-[15px] font-semibold text-fg">Couldn&apos;t load this</h3>
      <p className="mt-1 max-w-sm text-sm text-fg-3">{errorMessage(error)}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          leftIcon={<RotateCw className="h-3.5 w-3.5" />}
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
