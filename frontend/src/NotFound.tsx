import { Link } from 'react-router-dom';
import { Seo } from './lib/seo';
import { buttonLink } from './ui/buttonLink';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center">
      <Seo title="Page not found | CartHedge" description="This page does not exist." noIndex />
      <span aria-hidden className="flex gap-2">
        <span className="bulb size-2.5" />
        <span className="bulb size-2.5" data-lit="true" />
        <span className="bulb size-2.5" />
      </span>
      <p className="text-sm font-medium text-low">Error 404</p>
      <h1 className="text-d2 font-semibold text-hi">This aisle is empty</h1>
      <p className="max-w-md text-mid">The page you were looking for moved or never existed.</p>
      <Link to="/" className={buttonLink()}>
        Back to CartHedge
      </Link>
    </div>
  );
}
