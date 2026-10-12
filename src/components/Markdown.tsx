import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

/** Renders note bodies. Raw HTML is never rendered and every link is sanitized, since bodies come from an LLM. */
export const Markdown = ({ children }: { children: string }) => (
  <div className="note-body text-zinc-300 leading-relaxed space-y-5 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-10 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-8 [&_a]:text-indigo-400 [&_a:hover]:text-indigo-300 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_code]:font-mono [&_code]:text-sm [&_code]:bg-zinc-900 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-zinc-950 [&_pre]:border [&_pre]:border-zinc-800 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-4 [&_blockquote]:text-zinc-400 [&_table]:w-full [&_th]:text-left [&_th]:border-b [&_th]:border-zinc-800 [&_td]:border-b [&_td]:border-zinc-900 [&_td]:py-2">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        a: ({ href, children: text }) => {
          const external = href ? /^https?:\/\//.test(href) : false;
          return (
            <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {text}
            </a>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);
