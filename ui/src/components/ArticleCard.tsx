import React from 'react';
import { Article } from '../types';
import { motion } from 'motion/react';
import { ArrowUpRight, BookOpen } from 'lucide-react';

interface ArticleCardProps {
  article: Article;
  onClick: (article: Article) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, onClick }) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(article);
    }
  };

  return (
    <motion.article 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onClick(article)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={`group relative p-8 bg-white border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(255,51,0,1)] transition-all cursor-pointer ${!article.unread ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{article.source}</span>
          <span className="font-mono text-xs font-bold opacity-40">{article.timeAgo}</span>
        </div>
        
        <h2 className="text-3xl font-black leading-tight tracking-tighter uppercase group-hover:text-primary transition-colors">
          {article.title}
        </h2>
        
        <p className="text-sm leading-relaxed opacity-60 line-clamp-2 italic">
          {article.snippet}
        </p>

        <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-5 mt-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClick(article);
            }}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] hover:bg-primary transition-colors"
          >
            <BookOpen size={14} />
            Read in app
          </button>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-2 border border-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] hover:bg-black hover:text-white transition-colors"
          >
            <ArrowUpRight size={14} />
            Open original
          </a>
        </div>
      </div>
    </motion.article>
  );
};
