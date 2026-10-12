import React from 'react';
import { ExternalLink, GitPullRequest, Github, Star } from 'lucide-react';
import type { OssProject } from '../types/content';
import { isoDate } from '../lib/content';

const ROLE_LABEL: Record<OssProject['role'], string> = {
  AUTHOR: 'Author',
  MAINTAINER: 'Maintainer',
  CONTRIBUTOR: 'Contributor',
};

interface OssProjectCardProps {
  project: OssProject;
  key?: React.Key;
}

export const OssProjectCard = ({ project }: OssProjectCardProps) => {
  const stars = project.githubStats?.stars;
  return (
    <article
      id={`oss-${project.slug}`}
      className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all duration-300 flex flex-col h-full"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{project.name}</h3>
          <span className="inline-block mt-2 px-2 py-1 bg-indigo-500/10 text-indigo-300 text-[10px] uppercase tracking-wider font-bold rounded">
            {ROLE_LABEL[project.role]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-zinc-500 text-xs font-mono shrink-0">
          {typeof stars === 'number' && (
            <span className="flex items-center gap-1" aria-label={`${stars} stars`}>
              <Star size={14} /> {stars}
            </span>
          )}
          {project.githubStats?.language && <span>{project.githubStats.language}</span>}
        </div>
      </div>

      <p className="text-zinc-400 text-sm leading-relaxed mb-3">{project.summary}</p>
      <p className="text-zinc-300 text-sm leading-relaxed mb-6">
        <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block mb-1">My impact</span>
        {project.myImpact}
      </p>

      {project.stack.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {project.stack.map((s) => (
            <span key={s} className="px-2 py-1 bg-zinc-800 text-zinc-300 text-[10px] uppercase tracking-wider font-medium rounded">
              {s}
            </span>
          ))}
        </div>
      )}

      {project.contributions.length > 0 && (
        <ul className="space-y-2 mb-6" aria-label="Recent contributions">
          {project.contributions.map((c) => (
            <li key={c.url}>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <GitPullRequest size={14} className="mt-1 shrink-0 text-indigo-500" />
                <span>
                  {c.title}
                  {c.mergedAt && <span className="text-zinc-600 font-mono text-xs ml-2">{isoDate(c.mergedAt)}</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex gap-6">
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => window.umami?.track('oss_repo_click', { project: project.slug })}
            className="text-indigo-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-indigo-400"
          >
            <Github size={14} /> Repository
          </a>
        )}
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-white"
          >
            <ExternalLink size={14} /> Website
          </a>
        )}
      </div>
    </article>
  );
};
