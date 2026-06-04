import React from 'react';
import { Search, RotateCw, CheckCheck, Settings } from 'lucide-react';

interface DashboardHeaderProps {
  search: string;
  syncing: boolean;
  unreadCount: number;
  onSearchChange: (value: string) => void;
  onSync: () => void;
  onMarkAllRead: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  search,
  syncing,
  unreadCount,
  onSearchChange,
  onSync,
  onMarkAllRead,
}) => {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-white border-b border-black flex justify-between items-center h-16 px-4 md:px-margin-desktop">
      <div className="flex items-center gap-4">
        <h1 className="text-headline-md font-black text-black">Chroma Studio</h1>
        <div className="px-3 py-0.5 border border-black rounded-full text-[10px] font-bold uppercase ml-4 hidden sm:block">
          {unreadCount} Unread
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center bg-background px-3 py-1 border border-black">
          <Search size={14} className="text-black/40 mr-2" />
          <input 
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="bg-transparent border-none focus:outline-none text-body-md w-48 py-1 placeholder:text-black/30 font-bold" 
            placeholder="Search stream..." 
            type="text"
          />
        </div>
        
        <div className="flex items-center gap-4 text-black">
          <button
            className="hover:text-primary transition-colors disabled:opacity-50"
            title="Sync"
            onClick={onSync}
            disabled={syncing}
          >
            <RotateCw size={18} className={syncing ? 'animate-spin' : ''} />
          </button>
          <button
            className="hover:text-primary transition-colors disabled:opacity-50"
            title="Mark all as read"
            onClick={onMarkAllRead}
            disabled={syncing}
          >
            <CheckCheck size={18} strokeWidth={3} />
          </button>
          <button className="hover:text-primary transition-colors" title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
