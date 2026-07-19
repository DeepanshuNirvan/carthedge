import { Link } from 'react-router-dom';
import { Seo } from './lib/seo';
import { buttonLink } from './ui/buttonLink';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center">
      <Seo title="Page not found — CartHedge" description="This page does not exist." noIndex />
      <p className="font-mono text-sm text-jade-500">404</p>
      <h1 className="font-display text-d2 font-semibold">This aisle is empty</h1>
      <p className="max-w-md text-mid">The page you were looking for moved or never existed.</p>
      <Link to="/" className={buttonLink()}>
        Back to CartHedge
      </Link>
    </div>
  );
}
