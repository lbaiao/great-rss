import React from 'react';
import { Archive, BookOpenCheck, HelpCircle, LayoutDashboard, Plus, Rss, Settings } from 'lucide-react';
import { View } from '../types';
import { motion } from 'motion/react';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const navItems = [
    { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: View.READ, label: 'Read', icon: BookOpenCheck },
    { id: View.SOURCES, label: 'Sources', icon: Rss },
  ];

  const footerItems = [
    { id: View.SETTINGS, label: 'Settings', icon: Settings },
    { id: View.HELP, label: 'Help', icon: HelpCircle },
    { id: View.ARCHIVE, label: 'Archive', icon: Archive },
  ];

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 z-40 flex-col bg-white border-r border-black">
      <div className="px-6 py-10 flex flex-col gap-2">
        <span className="text-[40px] font-black uppercase leading-none text-black">GreatRSS</span>
        <span className="text-label-sm opacity-60">RSS Reader</span>
      </div>
      
      <nav className="flex-1 mt-8">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center gap-4 px-6 py-4 w-full text-left transition-all duration-150 relative border-b border-black/5 ${
              activeView === item.id 
                ? 'text-primary bg-primary/5 border-l-4 border-l-primary' 
                : 'text-black/60 hover:bg-black/5 hover:text-black'
            }`}
          >
            <item.icon size={18} strokeWidth={activeView === item.id ? 3 : 2} />
            <span className="text-body-md font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6">
        <button 
          onClick={() => onViewChange(View.SOURCES)}
          className="w-full bg-black text-white py-3 px-4 text-label-sm font-bold flex items-center justify-center gap-2 hover:bg-primary active:translate-x-1 active:translate-y-1 transition-all"
        >
          <Plus size={16} />
          Add Feed
        </button>
      </div>

      <footer className="mt-auto border-t border-black">
        {footerItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center gap-4 px-6 py-4 w-full text-left transition-all duration-150 ${
              activeView === item.id 
                ? 'text-primary' 
                : 'text-black/40 hover:bg-black/5 hover:text-black'
            }`}
          >
            <item.icon size={18} />
            <span className="text-label-sm">{item.label}</span>
          </button>
        ))}
      </footer>
    </aside>
  );
};
