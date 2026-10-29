import React from 'react';
import {
  Home,
  Users,
  FolderKanban,
  BookOpen,
  LineChart,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, className = '' }) => {
  const { user, logout } = useAuth();

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4 shrink-0" /> },
    { id: 'patients', label: 'Patients', icon: <Users className="w-4 h-4 shrink-0" /> },
    { id: 'cases', label: 'Cases', icon: <FolderKanban className="w-4 h-4 shrink-0" /> },
    { id: 'evidence', label: 'Evidence', icon: <BookOpen className="w-4 h-4 shrink-0" /> },
    { id: 'progress', label: 'Progress', icon: <LineChart className="w-4 h-4 shrink-0" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <aside
      className={`w-64 h-screen bg-[#F7F4EF] border-r border-[#E5DFD4] flex flex-col justify-between shrink-0 select-none ${className}`}
      aria-label="Clinical workspace navigation"
    >
      {/* Top Header & Logo */}
      <div>
        <div className="p-5 pb-4 border-b border-[#E8E2D7]">
          <Logo size="md" showSubtitle={true} />
        </div>

        {/* Philosophy Whisper (Quiet reminder of core clinical focus) */}
        <div className="px-5 py-3 border-b border-[#ECE6DB] bg-[#F1ECE4]/60">
          <p className="text-[11px] uppercase tracking-wider text-[#69706A] font-medium leading-none mb-1">
            Clinical Pathway
          </p>
          <p className="text-[11px] text-[#4A514B] font-medium tracking-tight">
            Assess → Reason → Plan → Treat → Measure → Progress
          </p>
        </div>

        {/* Primary Navigation Items */}
        <nav className="p-3 space-y-1" aria-label="Primary">
          {[
            { id: 'home' as NavigationTab, label: 'Home', icon: <Home className="w-4 h-4 shrink-0" /> },
            { id: 'patients' as NavigationTab, label: 'Patients', icon: <Users className="w-4 h-4 shrink-0" /> },
            { id: 'cases' as NavigationTab, label: 'Cases', icon: <FolderKanban className="w-4 h-4 shrink-0" /> },
            { id: 'settings' as NavigationTab, label: 'Settings', icon: <Settings className="w-4 h-4 shrink-0" /> },
          ].map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}-btn`}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#1B3B2B] text-[#FAF8F5] shadow-xs'
                    : 'text-[#3E4540] hover:text-[#18201C] hover:bg-[#EAE4D9]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-[#E2ECE6]' : 'text-[#6A716B]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#E2ECE6]/70" />}
              </button>
            );
          })}
        </nav>

        {/* Secondary Contextual Clinical Reference & Analytics */}
        <div className="px-3 pt-3 mt-1 border-t border-[#ECE5D9]">
          <p className="px-3.5 pb-1.5 text-[10px] uppercase tracking-wider text-[#7A827C] font-semibold">
            Clinical Reference & Analytics
          </p>
          <div className="space-y-0.5">
            {[
              { id: 'evidence' as NavigationTab, label: 'Evidence Knowledge', icon: <BookOpen className="w-3.5 h-3.5 shrink-0" /> },
              { id: 'progress' as NavigationTab, label: 'Cross-Episode Progress', icon: <LineChart className="w-3.5 h-3.5 shrink-0" /> },
            ].map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}-btn`}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#E2ECE6] text-[#1B3B2B] font-semibold'
                      : 'text-[#656C66] hover:text-[#18201C] hover:bg-[#EAE4D9]/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-[#1B3B2B]' : 'text-[#7D847E]'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3 text-[#1B3B2B]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom: User Profile & Sign out */}
      <div className="p-3 border-t border-[#E8E2D7] bg-[#F4EFE9]/50">
        {/* User Card */}
        <div className="px-3 py-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD4] mb-2 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#1B3B2B] text-[#FAF8F5] flex items-center justify-center text-xs font-semibold shrink-0 ring-1 ring-[#1B3B2B]/20">
              {user?.initials || 'PT'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#1C221E] truncate leading-tight">
                {user?.name || 'Practitioner'}
              </p>
              <p className="text-[11px] text-[#6B726C] truncate leading-tight">
                {user?.title || 'Lead Physiotherapist'}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-[#1B3B2B]" title="Verified Clinical Practitioner">
            <ShieldCheck className="w-4 h-4 text-[#2E5842]" />
          </div>
        </div>

        {/* Logout Button */}
        <button
          id="logout-btn"
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#656C66] hover:text-[#B91C1C] hover:bg-[#FBEBEB] rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out of workspace</span>
        </button>
      </div>
    </aside>
  );
};
