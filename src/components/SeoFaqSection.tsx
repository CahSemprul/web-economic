import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SEO_FAQ_ITEMS } from '../utils/seoAeo.ts';

export function SeoFaqSection() {
  const [openIds, setOpenIds] = useState<string[]>([SEO_FAQ_ITEMS[0].id]);

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <section
      id="faq-ekonanalisis"
      aria-labelledby="faq-ekonanalisis-heading"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 border-b border-slate-200 pb-3 dark:border-slate-800">
        <h2
          id="faq-ekonanalisis-heading"
          className="font-serif text-lg font-bold tracking-tight text-slate-950 sm:text-xl dark:text-white"
        >
          Panduan &amp; Pertanyaan Umum Analisis Pasar
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
          Ringkasan langsung seputar data pasar real-time, dampak BI-Rate &amp; inflasi, cara membaca kalender ekonomi WIB, serta analisis AI.
        </p>
      </div>

      <dl className="divide-y divide-slate-200 dark:divide-slate-800">
        {SEO_FAQ_ITEMS.map((item) => {
          const isOpen = openIds.includes(item.id);
          const panelId = `${item.id}-panel`;
          return (
            <div key={item.id} className="py-1">
              <dt>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleItem(item.id)}
                  className="flex min-h-[48px] w-full items-center justify-between gap-4 py-2.5 text-left text-sm font-semibold text-slate-900 transition-colors hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 sm:text-[15px] dark:text-slate-100 dark:hover:text-blue-400"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${
                      isOpen ? 'rotate-180 text-blue-900 dark:text-blue-400' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </dt>
              <dd
                id={panelId}
                hidden={!isOpen}
                className="pb-3.5 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300"
              >
                {item.answer}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
