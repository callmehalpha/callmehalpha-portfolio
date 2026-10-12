import { Link, useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { SEO } from '../components/SEO';
import { api } from '../lib/api';
import { FALLBACK_NOTES, isoDate } from '../lib/content';
import { useContent } from '../lib/useContent';
import type { NoteList } from '../types/content';

const PAGE_SIZE = 10;

export const Notes = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const fallback: NoteList = { items: FALLBACK_NOTES, total: FALLBACK_NOTES.length, page: 1, pageSize: PAGE_SIZE };
  const { data, status } = useContent((signal) => api.notes({ page, pageSize: PAGE_SIZE }, signal), fallback, [page]);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <PageShell back={{ to: '/', label: 'Portfolio' }}>
      <SEO data={{ title: 'Technical Notes | Callmehalpha', description: 'Notes on building products: technical decisions, trade-offs and lessons from shipping.' }} />
      <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter mb-4">Technical Notes</h1>
      <p className="text-zinc-400 mb-12">Technical decisions, business and technology trade-offs, and lessons from shipping.</p>

      {data.items.length === 0 && status !== 'loading' ? (
        <p className="text-zinc-500">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-900">
          {data.items.map((note) => (
            <li key={note.slug} className="py-8">
              <span className="text-zinc-500 font-mono text-xs">{isoDate(note.publishedAt)}</span>
              <h2 className="text-2xl font-bold text-white mt-2 mb-2">
                <Link to={`/notes/${note.slug}`} className="hover:text-indigo-300 transition-colors">
                  {note.title}
                </Link>
              </h2>
              <p className="text-zinc-400 leading-relaxed">{note.excerpt}</p>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {note.tags.map((t) => (
                    <span key={t} className="px-2 py-1 bg-zinc-900 text-zinc-400 text-[10px] uppercase tracking-wider rounded">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between mt-12 text-sm" aria-label="Pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setParams({ page: String(page - 1) })}
            className="text-indigo-400 disabled:text-zinc-700"
          >
            ← Newer
          </button>
          <span className="text-zinc-500 font-mono text-xs">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setParams({ page: String(page + 1) })}
            className="text-indigo-400 disabled:text-zinc-700"
          >
            Older →
          </button>
        </nav>
      )}
    </PageShell>
  );
};
