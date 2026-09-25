import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold text-fg">Something went wrong</h1>
        <p className="max-w-sm text-sm text-fg-3">
          An unexpected error occurred. Reloading the page usually fixes it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg"
        >
          Reload
        </button>
      </div>
    );
  }
}
