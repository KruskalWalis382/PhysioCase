import React, { useState } from 'react';
import {
  Menu,
  X,
  Home,
  Users,
  FolderKanban,
  BookOpen,
  LineChart,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';

interface MobileNavProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'patients', label: 'Patients', icon: <Users className="w-5 h-5" /> },
    { id: 'cases', label: 'Cases', icon: <FolderKanban className="w-5 h-5" /> },
    { id: 'evidence', label: 'Evidence', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'progress', label: 'Progress', icon: <LineChart className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleSelect = (tab: NavigationTab) => {
    onSelectTab(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden w-full bg-[#F7F4EF] border-b border-[#E5DFD4] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <Logo size="sm" showSubtitle={false} />
        <button
          id="mobile-nav-toggle-btn"
          type="button"
          aria-label={isOpen ? 'Close menu' : 'Open navigation menu'}
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg text-[#3E4540] hover:bg-[#EAE4D9] focus-visible:ring-2 focus-visible:ring-[#1B3B2B] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop & Menu */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="lg:hidden fixed inset-0 z-40 bg-[#141A16]/50 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full bg-[#FAF8F5] border-t border-[#E5DFD4] rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col p-5 pb-8 animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-[#E8E2D7]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#1B3B2B] text-[#FAF8F5] flex items-center justify-center text-sm font-semibold ring-1 ring-[#1B3B2B]/20">
                  {user?.initials || 'PT'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1C221E]">{user?.name || 'Practitioner'}</p>
                  <p className="text-xs text-[#6B726C] flex items-center gap-1">
                    <span>{user?.title || 'Lead Physiotherapist'}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2E5842]" />
                  </p>
                </div>
              </div>
              <button
                id="close-mobile-drawer-btn"
                type="button"
                aria-label="Close menu"
                onClick={() => setIsOpen(false)}
                className="p-2 text-[#6B726C] hover:text-[#1C221E] rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Primary Navigation Options */}
            <nav className="space-y-1.5 py-2">
              {[
                { id: 'home' as NavigationTab, label: 'Home', icon: <Home className="w-5 h-5" /> },
                { id: 'patients' as NavigationTab, label: 'Patients', icon: <Users className="w-5 h-5" /> },
                { id: 'cases' as NavigationTab, label: 'Cases', icon: <FolderKanban className="w-5 h-5" /> },
                { id: 'settings' as NavigationTab, label: 'Settings', icon: <Settings className="w-5 h-5" /> },
              ].map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`mobile-nav-${item.id}-btn`}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-[#1B3B2B] text-[#FAF8F5]'
                        : 'text-[#3E4540] hover:bg-[#F2ECE3] active:bg-[#ECE6DC]'
                    }`}
                  >
                    <span className={isActive ? 'text-[#E2ECE6]' : 'text-[#6A716B]'}>
                      {item.icon}
                    </span>
                    <span className="text-base">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Secondary Clinical Reference & Analytics */}
            <div className="pt-3 border-t border-[#E8E2D7] space-y-1">
              <p className="px-4 pb-1 text-[10px] uppercase tracking-wider text-[#7A827C] font-semibold">
                Clinical Reference & Analytics
              </p>
              <div className="space-y-1">
                {[
                  { id: 'evidence' as NavigationTab, label: 'Evidence Knowledge', icon: <BookOpen className="w-4 h-4" /> },
                  { id: 'progress' as NavigationTab, label: 'Cross-Episode Progress', icon: <LineChart className="w-4 h-4" /> },
                ].map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`mobile-nav-${item.id}-btn`}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors min-h-[38px] ${
                        isActive
                          ? 'bg-[#E2ECE6] text-[#1B3B2B] font-semibold'
                          : 'text-[#656C66] hover:bg-[#F2ECE3]'
                      }`}
                    >
                      <span className={isActive ? 'text-[#1B3B2B]' : 'text-[#7D847E]'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 mt-2 border-t border-[#E8E2D7]">
              <button
                id="mobile-logout-btn"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[#B91C1C] hover:bg-[#FBEBEB] rounded-xl transition-colors min-h-[48px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out of PhysioCase</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
