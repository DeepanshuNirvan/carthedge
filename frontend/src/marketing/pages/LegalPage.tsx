import { legalDocs, type LegalDocId } from '@/strings/legal';
import { Seo } from '@/lib/seo';
import { MarketingBackground } from '../MarketingBackground';
import { MarketingNav } from '../MarketingNav';
import { Footer } from '../Footer';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// One page renders privacy, terms and data-deletion; they differ only in copy,
// and Meta requires each to sit on its own crawlable URL. Set as a document to
// read: one measure, a contents rail on wide screens, no cards.
export default function LegalPage({ doc }: { doc: LegalDocId }) {
  const { title, seoTitle, description, path, updated, intro, sections } = legalDocs[doc];

  return (
    <div>
      <Seo title={seoTitle} description={description} path={path} />
      <MarketingBackground />
      <MarketingNav />
      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-[calc(7.5rem+env(safe-area-inset-top))] sm:px-8 sm:pb-24">
        <header className="max-w-[68ch]">
          <h1 className="text-d2 font-semibold text-hi">{title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-mid">{intro}</p>
          <p className="mt-3 text-ui text-low">Last updated {updated}</p>
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[13rem_1fr] lg:gap-14">
          <nav aria-label="Contents" className="hidden lg:block">
            <ol className="sticky top-28 flex flex-col gap-1 border-l text-ui">
              {sections.map((section) => (
                <li key={section.heading}>
                  <a
                    href={`#${slug(section.heading)}`}
                    className="-ml-px block border-l border-transparent py-1.5 pl-4 text-low transition-colors hover:border-jade-500 hover:text-hi"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="max-w-[68ch]">
            {sections.map((section, i) => (
              <section
                key={section.heading}
                id={slug(section.heading)}
                className={i > 0 ? 'mt-10 scroll-mt-28 border-t pt-10' : 'scroll-mt-28'}
              >
                <h2 className="text-d4 font-semibold text-hi">{section.heading}</h2>
                <div className="mt-4 grid gap-4">
                  {section.body.map((para) => (
                    <p key={para} className="text-title leading-relaxed text-mid">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
