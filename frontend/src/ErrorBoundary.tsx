import { Component, type ReactNode } from 'react';
import { Button } from './ui/Button';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="font-display text-d3 font-semibold">Something broke on our side</h1>
          <p className="max-w-md text-mid">
            The page hit an unexpected error. A refresh usually fixes it — your data is safe.
          </p>
          <Button onClick={() => location.reload()}>Reload page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
