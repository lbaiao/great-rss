import React from 'react';
import { Article } from '../types';
import { motion } from 'motion/react';

interface ArticleCardProps {
  article: Article;
  onClick: (article: Article) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, onClick }) => {
  return (
    <motion.article 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onClick(article)}
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

        <div className="h-px w-12 bg-black/10 mt-2"></div>
      </div>
    </motion.article>
  );
};
