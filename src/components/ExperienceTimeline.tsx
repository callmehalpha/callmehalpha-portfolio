import type { WorkEntry } from '../types/content';
import { formatRange } from '../lib/content';

interface ExperienceTimelineProps {
  work: WorkEntry[];
  /** Project slugs that have a case study on the page, so roles can link to them. */
  caseStudyIds: string[];
}

export const ExperienceTimeline = ({ work, caseStudyIds }: ExperienceTimelineProps) => (
  <ol className="relative border-l border-zinc-800 ml-2 space-y-12">
    {work.map((job) => (
      <li key={`${job.name}-${job.startDate}`} className="pl-8 relative">
        <span className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-indigo-500" aria-hidden="true" />
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1 mb-2">
          <h3 className="text-xl font-bold text-white">
            {job.position} <span className="text-zinc-500 font-medium">· {job.name}</span>
          </h3>
          <span className="text-zinc-500 font-mono text-xs shrink-0">
            {formatRange(job.startDate, job.endDate)}
            {job.location ? ` · ${job.location}` : ''}
          </span>
        </div>
        {job.summary && <p className="text-zinc-400 text-sm mb-3">{job.summary}</p>}
        <ul className="list-disc pl-5 space-y-1 text-zinc-400 text-sm leading-relaxed">
          {job.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        {job.projectSlug && caseStudyIds.includes(job.projectSlug) && (
          <a
            href={`#${job.projectSlug}`}
            className="inline-block mt-3 text-indigo-500 text-[10px] font-bold uppercase tracking-widest hover:text-indigo-400"
          >
            Read the case study →
          </a>
        )}
      </li>
    ))}
  </ol>
);
