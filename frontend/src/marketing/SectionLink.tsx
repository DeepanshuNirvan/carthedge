import type { AnchorHTMLAttributes } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Marketing links mix on-page anchors (#pricing) with routes (/contact).
 * A bare <a href="#pricing"> only works on the home page — from /contact the
 * browser resolves it against that path, lands on /contact#pricing and nothing
 * scrolls. Off home we route to '/' carrying the hash instead; HomePage picks
 * the hash up on mount and scrolls to the section.
 */
export function SectionLink({
  href,
  children,
  ...rest
}: { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const onHome = useLocation().pathname === '/';

  if (href.startsWith('#')) {
    return onHome ? (
      <a href={href} {...rest}>
        {children}
      </a>
    ) : (
      <Link to={{ pathname: '/', hash: href }} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <Link to={href} {...rest}>
      {children}
    </Link>
  );
}
