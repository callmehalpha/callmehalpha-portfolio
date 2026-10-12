import { useParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Markdown } from '../components/Markdown';
import { PageShell } from '../components/PageShell';
import { SEO } from '../components/SEO';
import { api } from '../lib/api';
import { fallbackNote, isoDate } from '../lib/content';
import { useContent } from '../lib/useContent';
import type { NoteDetail } from '../types/content';
import { NotFound } from './NotFound';

export const Note = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: note, status } = useContent<NoteDetail | null>((signal) => api.note(slug, signal), fallbackNote(slug), [slug]);

  if (!note) return status === 'loading' ? <LoadingSpinner /> : <NotFound />;

  const elsewhere = note.publications.filter((p) => p.externalUrl);
  return (
    <PageShell>
      <SEO
        data={{
          title: note.seo?.title ?? `${note.title} | Callmehalpha`,
          description: note.seo?.description ?? note.excerpt,
          image: note.seo?.image ?? note.coverImageUrl ?? undefined,
          keywords: note.tags,
        }}
      />
      <article>
        <header className="mb-12">
          <span className="text-zinc-500 font-mono text-xs">{isoDate(note.publishedAt)}</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter mt-3 mb-4">{note.title}</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">{note.excerpt}</p>
          {note.project && <p className="text-zinc-500 text-sm mt-4">Project: {note.project.name}</p>}
        </header>
        <Markdown>{note.bodyMarkdown}</Markdown>
        {elsewhere.length > 0 && (
          <footer className="mt-16 pt-8 border-t border-zinc-900 text-sm text-zinc-500">
            Join the discussion on{' '}
            {elsewhere.map((p, i) => (
              <span key={p.channel.key}>
                {i > 0 && ' · '}
                <a href={p.externalUrl!} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                  {p.channel.name}
                </a>
              </span>
            ))}
          </footer>
        )}
      </article>
    </PageShell>
  );
};
