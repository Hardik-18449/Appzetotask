import React from 'react';
import {
  Kanban,
  Search,
  History,
  Users,
  Folder,
  Plus,
  Shield,
  Lock,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { IProject } from '../types';

interface SidebarProps {
  currentView: 'kanban' | 'search' | 'audit' | 'members';
  setCurrentView: (view: 'kanban' | 'search' | 'audit' | 'members') => void;
  projects: IProject[];
  selectedProject: IProject | null;
  setSelectedProject: (project: IProject) => void;
  onOpenCreateProject: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  projects,
  selectedProject,
  setSelectedProject,
  onOpenCreateProject,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { activeRole } = useAuth();
  const canManageProjects = activeRole === 'OWNER' || activeRole === 'ADMIN';
  const canViewAuditLogs = activeRole === 'OWNER' || activeRole === 'ADMIN';

  const handleNavClick = (view: 'kanban' | 'search' | 'audit' | 'members') => {
    setCurrentView(view);
    if (onCloseMobile) onCloseMobile();
  };

  const handleProjectClick = (project: IProject) => {
    setSelectedProject(project);
    if (currentView !== 'kanban') setCurrentView('kanban');
    if (onCloseMobile) onCloseMobile();
  };

  const content = (
    <div className="flex flex-col justify-between h-full p-4 space-y-6">
      <div className="space-y-6">
        {/* Mobile Header with Close Button */}
        <div className="flex items-center justify-between md:hidden pb-2 border-b border-zinc-800">
          <span className="text-xs font-semibold text-white tracking-wider uppercase">Menu</span>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div>
          <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Navigation
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => handleNavClick('kanban')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                currentView === 'kanban'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>

            <button
              onClick={() => handleNavClick('search')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                currentView === 'search'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Advanced Search</span>
            </button>

            {/* Audit Logs (Admin/Owner only) */}
            {canViewAuditLogs ? (
              <button
                onClick={() => handleNavClick('audit')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  currentView === 'audit'
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Logs</span>
              </button>
            ) : (
              <div
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs text-zinc-600 cursor-not-allowed opacity-60"
                title="Restricted to Admin & Owner"
              >
                <Lock className="w-3 h-3 text-zinc-600" />
                <span>Audit Logs</span>
                <span className="text-[9px] text-zinc-600 ml-auto uppercase font-mono">Restricted</span>
              </div>
            )}

            {/* Members Management (Admin/Owner only) */}
            {canManageProjects ? (
              <button
                onClick={() => handleNavClick('members')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  currentView === 'members'
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Members & Roles</span>
              </button>
            ) : (
              <div
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs text-zinc-600 cursor-not-allowed opacity-60"
                title="Restricted to Admin & Owner"
              >
                <Lock className="w-3 h-3 text-zinc-600" />
                <span>Members & Roles</span>
                <span className="text-[9px] text-zinc-600 ml-auto uppercase font-mono">Restricted</span>
              </div>
            )}
          </nav>
        </div>

        {/* Projects Section */}
        <div>
          <div className="px-2 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Projects
            </span>
            {canManageProjects && (
              <button
                onClick={() => {
                  onOpenCreateProject();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Create Project"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-center text-zinc-500 text-xs bg-zinc-900/40 rounded-lg">
                No active projects.
              </div>
            ) : (
              projects.map((p) => {
                const isSelected = selectedProject?._id === p._id;
                return (
                  <button
                    key={p._id}
                    onClick={() => handleProjectClick(p)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left truncate ${
                      isSelected
                        ? 'bg-zinc-800 text-white font-medium border border-zinc-700'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RBAC Info Card at Bottom */}
      <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 text-[11px] space-y-1 backdrop-blur-sm">
        <div className="flex items-center space-x-1.5 font-medium text-white">
          <Shield className="w-3.5 h-3.5 text-zinc-400" />
          <span>Role: {activeRole}</span>
        </div>
        <p className="text-zinc-400 text-[10px] leading-relaxed">
          {activeRole === 'OWNER' && 'Full permissions across organizations, projects, and tasks.'}
          {activeRole === 'ADMIN' && 'Management of projects, team members, and all tasks.'}
          {activeRole === 'MEMBER' && 'Can create tasks, comment, and edit assigned tasks.'}
          {activeRole === 'VIEWER' && 'Read-only access across the workspace.'}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 border-r border-zinc-800 bg-zinc-950/70 backdrop-blur-md flex-col justify-between flex-shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Panel */}
          <aside className="relative z-10 w-72 max-w-[85vw] bg-zinc-950 border-r border-zinc-800 shadow-2xl flex flex-col justify-between h-full">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
