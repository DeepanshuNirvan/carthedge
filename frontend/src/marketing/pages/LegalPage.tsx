import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { legalDocs, type LegalDocId } from '@/strings/legal';
import { get } from '@/api/http';
import { Seo } from '@/lib/seo';
import { MarketingBackground } from '../MarketingBackground';
import { MarketingNav } from '../MarketingNav';
import { Footer } from '../Footer';

// One page renders privacy, terms and data-deletion — they differ only in copy,
// and Meta requires each to sit on its own crawlable URL.
export default function LegalPage({ doc }: { doc: LegalDocId }) {
  const { title, seoTitle, description, path, updated, intro, sections } = legalDocs[doc];

  return (
    <div>
      <Seo title={seoTitle} description={description} path={path} />
      <MarketingBackground />
      <MarketingNav />
      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-[calc(7.5rem+env(safe-area-inset-top))] sm:px-8 sm:pb-24">
        <h1 className="font-display text-d2 font-semibold text-hi">{title}</h1>
        <p className="mt-3 text-mid">{intro}</p>
        <p className="mt-2 text-xs text-low">Last updated {updated}</p>
        {doc === 'dataDeletion' && <DeletionStatus />}

        <div className="mt-10 grid gap-5">
          {sections.map((section) => (
            <section key={section.heading} className="glass sheen rounded-2xl p-6 shadow-float">
              <h2 className="font-display text-lg font-semibold text-hi">{section.heading}</h2>
              <div className="mt-3 grid gap-3">
                {section.body.map((para) => (
                  <p key={para} className="text-sm leading-relaxed text-mid">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Meta sends people here with the confirmation code of a deletion request.
function DeletionStatus() {
  const [params] = useSearchParams();
  const code = params.get('code')?.trim() ?? '';
  const [state, setState] = useState<{ status: string; requestedAt: string } | 'missing' | null>(null);

  useEffect(() => {
    if (!code) return;
    get<{ status: string; requestedAt: string }>(
      `/api/v1/data-deletion/${encodeURIComponent(code)}`,
      undefined,
      'none',
    )
      .then(setState)
      .catch(() => setState('missing'));
  }, [code]);

  if (!code || state === null) return null;
  return (
    <div className="glass mt-6 rounded-2xl p-5 text-sm shadow-float" role="status">
      {state === 'missing' ? (
        <p className="text-mid">
          We could not find a deletion request with code <span className="font-mono text-hi">{code}</span>.
        </p>
      ) : (
        <p className="text-mid">
          Deletion request <span className="font-mono text-hi">{code}</span>:{' '}
          <span className="font-medium text-hi">
            {state.status === 'completed' ? 'completed' : state.status}
          </span>{' '}
          on {new Date(state.requestedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}.
        </p>
      )}
    </div>
  );
}
