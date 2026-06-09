import React, { useState } from 'react';
import { Info, RotateCw, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Feed } from '../types';

interface SourceManagementProps {
  feeds: Feed[];
  syncing: boolean;
  syncingFeedId: string | null;
  onAddFeed: (url: string) => void;
  onSyncFeed: (feedId: string) => void;
  onDeleteFeed: (feedId: string) => void;
}

export const SourceManagement: React.FC<SourceManagementProps> = ({
  feeds,
  syncing,
  syncingFeedId,
  onAddFeed,
  onSyncFeed,
  onDeleteFeed,
}) => {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      await onAddFeed(url.trim());
      setUrl('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reading-column py-12">
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-16"
      >
        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.5em] mb-4 block">GreatRSS Sources</span>
        <h1 className="text-7xl font-black text-black mb-6 tracking-tighter uppercase leading-[0.85]">Sources</h1>
        <p className="text-body-lg text-black/60 italic max-w-md">
          Add RSS, Atom, or JSON Feed sources to GreatRSS.
        </p>
      </motion.div>

      <div className="flex flex-col gap-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-black p-10 brutalist-shadow"
        >
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">Add New Subscription</h2>
          <div className="flex flex-col gap-6">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 block mb-3">Endpoint URL</label>
              <input 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/rss"
                className="w-full bg-background border border-black p-4 text-body-md font-bold focus:bg-white focus:outline-none transition-all"
                type="text"
              />
            </div>
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="bg-black text-white py-5 px-8 text-xl font-black uppercase tracking-widest hover:bg-primary active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50"
            >
              {submitting ? 'Syncing…' : 'Validate & Sync'}
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white border-2 border-black border-dashed p-8 flex gap-6 items-start"
        >
          <div className="w-12 h-12 bg-primary flex items-center justify-center shrink-0 border border-black shadow-brutalist-small">
            <Info size={24} className="text-white" />
          </div>
          <p className="text-sm font-bold uppercase tracking-wider leading-relaxed opacity-60">
            GreatRSS supports RSS 2.0, Atom 1.0, and JSON Feed formats.
          </p>
        </motion.div>

        <div className="mt-12">
          <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-6 inline-block border-b-2 border-primary pb-2">Active Transmissions</h3>
          <div className="grid grid-cols-1 gap-4">
            {feeds.map((feed) => (
              <div key={feed.id} className="flex flex-col gap-5 p-6 bg-white border border-black hover:shadow-brutalist-small transition-all sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-lg font-black uppercase tracking-tighter">
                    {feed.name} // {feed.status.toUpperCase()}
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-50 mt-2">
                    {feed.lastSyncedAt ? `Last sync ${new Date(feed.lastSyncedAt).toLocaleString()}` : feed.url}
                  </p>
                  {feed.lastError ? (
                    <p className="text-xs font-bold uppercase tracking-wider text-primary mt-2">{feed.lastError}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => void onSyncFeed(feed.id)}
                    disabled={syncing}
                    className="flex items-center gap-2 border border-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white disabled:opacity-50"
                  >
                    <RotateCw size={14} className={syncingFeedId === feed.id ? 'animate-spin' : ''} />
                    {syncingFeedId === feed.id ? 'Syncing' : 'Sync'}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ${feed.name}? This removes its articles from your account.`)) {
                        onDeleteFeed(feed.id);
                      }
                    }}
                    disabled={syncing}
                    title="Delete source"
                    className="flex h-9 w-9 items-center justify-center border border-black text-primary hover:bg-primary hover:text-white disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {feeds.length === 0 ? (
              <div className="p-6 bg-white border border-black font-bold uppercase tracking-wider">
                No feeds configured yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
