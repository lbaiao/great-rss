import React from 'react';
import { ArticleCard } from './ArticleCard';
import { Article } from '../types';

interface DashboardProps {
  articles: Article[];
  categories: string[];
  activeCategory: string;
  loading: boolean;
  onCategoryChange: (category: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  articles,
  categories,
  activeCategory,
  loading,
  onCategoryChange,
}) => {
  return (
    <div className="reading-column py-12">
      <div className="flex flex-wrap gap-3 mb-16">
        {categories.map((cat, i) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`px-5 py-2 text-[10px] font-bold uppercase tracking-widest border border-black transition-all cursor-pointer ${
              cat === activeCategory || (i === 0 && activeCategory === 'Saved')
                ? 'bg-black text-white brutalist-shadow-small' 
                : 'bg-white text-black hover:bg-primary hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-16">
        {loading ? (
          <div className="border border-black bg-white p-8 font-bold uppercase tracking-wide">
            Loading stream…
          </div>
        ) : null}

        {!loading && articles.length === 0 ? (
          <div className="border border-black bg-white p-8 font-bold uppercase tracking-wide">
            Empty. Add a source, then sync to load articles.
          </div>
        ) : null}

        {articles.map((article, index) => (
          <React.Fragment key={article.id}>
            <ArticleCard article={article} />
            {index === 1 && (
              <div className="my-8 relative overflow-hidden group">
                <img 
                  className="w-full h-96 object-cover border border-black grayscale group-hover:grayscale-0 transition-all duration-1000" 
                  src="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=2070&auto=format&fit=crop"
                  alt="Minimalist Architecture" 
                />
                <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest border border-black brutalist-shadow-small">
                  Visual Study 01
                </div>
              </div>
            )}
          </React.Fragment>
        ))}

        {!loading && articles.length > 0 ? (
          <div className="flex justify-center pt-12 pb-32">
            <button className="bg-white border-2 border-black px-12 py-4 text-label-sm font-black tracking-[0.2em] hover:bg-black hover:text-white hover:shadow-[10px_10px_0px_0px_#FF3300] transition-all active:scale-95">
              STREAM READY
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
