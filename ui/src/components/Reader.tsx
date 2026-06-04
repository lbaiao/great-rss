import React from 'react';
import { Article } from '../types';
import { ArrowLeft, Bookmark, Type, ThumbsUp, Share2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ReaderProps {
  article: Article;
  onBack: () => void;
  onToggleSaved: () => void;
}

export const Reader: React.FC<ReaderProps> = ({ article, onBack, onToggleSaved }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="reading-column py-12 relative"
    >
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 md:left-64 right-0 h-1 bg-primary z-[60] w-1/3" />

      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-label-sm text-black hover:text-primary transition-colors mb-12 border border-black px-4 py-2 hover:shadow-brutalist-small"
      >
        <ArrowLeft size={14} strokeWidth={3} />
        Return to Stream
      </button>

      <div className="mb-6 flex items-center gap-4">
        <span className="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest">{article.category}</span>
        <span className="font-mono text-xs font-bold opacity-40">{article.readTime}</span>
      </div>

      <h1 className="text-7xl font-black text-black mb-12 tracking-tighter leading-[0.85] uppercase">
        {article.title.split(':').map((part, i) => (
          <span key={i} className="block last:text-primary">{part}</span>
        ))}
      </h1>

      <div className="flex items-center gap-6 mb-16 border-l-8 border-black pl-6 py-2">
        <img 
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(article.author)}&background=111&color=fff`} 
          alt={article.author}
          className="w-16 h-16 border-2 border-black grayscale"
        />
        <div>
          <p className="text-xl font-black uppercase tracking-tighter">{article.author}</p>
          <p className="text-label-sm opacity-40">
            {article.date} // {article.source}
          </p>
        </div>
      </div>

      <div className="my-16 relative">
        <img 
          src="https://images.unsplash.com/photo-1481277542470-605612bd2d61?q=80&w=2006&auto=format&fit=crop" 
          className="w-full h-[500px] object-cover border-2 border-black grayscale hover:grayscale-0 transition-all duration-1000 shadow-brutalist"
          alt="Brutalist Architecture" 
        />
        <div className="absolute top-4 right-4 bg-white border border-black px-3 py-1 text-[8px] font-bold uppercase tracking-[0.3em]">
          Ref: BK-L90
        </div>
      </div>

      {/* Article Content */}
      <div 
        className="prose prose-slate max-w-none text-body-lg text-black font-medium leading-relaxed mb-20
                   [&>p]:mb-8 [&>h3]:text-4xl [&>h3]:mt-20 [&>h3]:mb-8 [&>h3]:font-black [&>h3]:uppercase [&>h3]:tracking-tighter
                   [&>blockquote]:border-l-[12px] [&>blockquote]:border-primary [&>blockquote]:pl-8 [&>blockquote]:my-16 [&>blockquote]:italic [&>blockquote]:text-primary [&>blockquote]:text-4xl [&>blockquote]:font-black [&>blockquote]:leading-tight [&>blockquote]:tracking-tighter [&>blockquote]:uppercase
                   [&>div.key-takeaways]:bg-black [&>div.key-takeaways]:text-white [&>div.key-takeaways]:p-10 [&>div.key-takeaways]:my-16 [&>div.key-takeaways]:shadow-brutalist
                   [&>div.key-takeaways>h4]:text-[10px] [&>div.key-takeaways>h4]:text-primary [&>div.key-takeaways>h4]:font-black [&>div.key-takeaways>h4]:uppercase [&>div.key-takeaways>h4]:tracking-[0.4em] [&>div.key-takeaways>h4]:mb-6
                   [&>div.key-takeaways>ul]:space-y-4 [&>div.key-takeaways>ul>li]:text-body-md [&>div.key-takeaways>ul>li]:font-bold [&>div.key-takeaways>ul>li]:uppercase [&>div.key-takeaways>ul>li]:tracking-wider"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      <div className="flex flex-wrap gap-3 mb-16">
        {article.tags.map(tag => (
          <span key={tag} className="px-4 py-1 border border-black/20 text-[10px] font-bold uppercase tracking-widest hover:border-black hover:bg-black hover:text-white transition-all cursor-pointer">{tag}</span>
        ))}
      </div>

      <div className="flex gap-4 border-t-4 border-black pt-16 pb-32">
        <button className="flex items-center gap-3 bg-black text-white px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary transition-colors">
          <ThumbsUp size={16} /> Helpful
        </button>
        <button className="flex items-center gap-3 border-2 border-black px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors">
          <Share2 size={16} /> Share
        </button>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed top-1/2 right-4 md:right-12 -translate-y-1/2 flex flex-col gap-6">
        <button
          onClick={onToggleSaved}
          className="w-14 h-14 bg-primary text-white flex items-center justify-center border-2 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all"
        >
          <Bookmark size={24} strokeWidth={3} fill={article.saved ? 'currentColor' : 'none'} />
        </button>
        <button className="w-14 h-14 bg-white text-black flex items-center justify-center border-2 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all">
          <Type size={24} strokeWidth={3} />
        </button>
      </div>
    </motion.div>
  );
};
