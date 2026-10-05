import React, { useState, useRef, useEffect } from 'react';
import {
  Building,
  ChevronDown,
  Plus,
  LogOut,
  Layers,
  Check,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationPopover } from './NotificationPopover';

interface NavbarProps {
  onOpenCreateOrg: () => void;
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCreateOrg, onToggleMobileSidebar }) => {
  const { user, organizations, activeOrg, activeRole, switchOrganization, logout } = useAuth();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const orgRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="h-14 border-b border-zinc-800 bg-black/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between z-40 sticky top-0">
      {/* Brand & Organization Selector */}
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Menu */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 font-semibold text-sm tracking-tight text-white">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline font-bold text-white tracking-tight">
            Nexus Workspace
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

        {/* Organization Switcher Dropdown */}
        <div className="relative" ref={orgRef}>
          <button
            onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 transition-colors text-xs text-zinc-200"
          >
            <Building className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-medium max-w-[110px] sm:max-w-[140px] truncate">
              {activeOrg ? activeOrg.name : 'Select Workspace'}
            </span>
            {activeRole && (
              <span className="text-[10px] px-1.5 py-0.2 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 uppercase font-mono font-medium">
                {activeRole}
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isOrgDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl z-50 p-1.5 backdrop-blur-md">
              <div className="px-2 py-1 text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                Organizations
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {organizations.map((org) => {
                  const isActive = activeOrg?._id === org._id;
                  return (
                    <button
                      key={org._id}
                      onClick={() => {
                        switchOrganization(org._id);
                        setIsOrgDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        isActive
                          ? 'bg-zinc-800 text-white font-medium'
                          : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Building className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                        <span className="truncate">{org.name}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[9px] px-1 py-0.2 rounded border border-zinc-700 bg-zinc-800/80 text-zinc-300 font-mono">
                          {org.role}
                        </span>
                        {isActive && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-1 pt-1 border-t border-zinc-800">
                <button
                  onClick={() => {
                    setIsOrgDropdownOpen(false);
                    onOpenCreateOrg();
                  }}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-400" />
                  <span>New Organization</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        <NotificationPopover />

        {/* User Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2 p-1 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-zinc-200">{user?.name}</div>
              <div className="text-[10px] text-zinc-400 truncate max-w-[120px]">{user?.email}</div>
            </div>
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-white">
              {user?.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl z-50 p-1 backdrop-blur-md">
              <div className="px-3 py-2 border-b border-zinc-800">
                <div className="text-xs font-medium text-white">{user?.name}</div>
                <div className="text-[10px] text-zinc-400 truncate">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 mt-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
