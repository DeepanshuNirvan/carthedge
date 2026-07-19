import { Spinner } from './Spinner';

export function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <Spinner className="size-7 text-jade-500" />
    </div>
  );
}
