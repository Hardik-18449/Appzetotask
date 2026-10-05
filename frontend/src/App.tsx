import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { AdvancedSearchView } from './components/AdvancedSearchView';
import { AuditLogView } from './components/AuditLogView';
import { TaskModal } from './components/TaskModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { CreateOrgModal } from './components/CreateOrgModal';
import { MembersModal } from './components/MembersModal';
import { AuthModal } from './components/AuthModal';
import { IProject, ITask, IUser } from './types';

export const App: React.FC = () => {
  const { user, activeOrg, activeRole, isLoading } = useAuth();

  const [currentView, setCurrentView] = useState<'kanban' | 'search' | 'audit' | 'members'>('kanban');
  const [projects, setProjects] = useState<IProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<IProject | null>(null);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [orgMembers, setOrgMembers] = useState<{ id: string; user: IUser; role: string }[]>([]);

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modal states
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  // Fetch projects and members when activeOrg changes
  const loadOrgData = async () => {
    if (!activeOrg) return;
    try {
      const [projRes, memRes] = await Promise.all([
        api.get('/projects'),
        api.get(`/organizations/${activeOrg._id}/members`),
      ]);
      const fetchedProjects = projRes.data.data;
      setProjects(fetchedProjects);
      if (fetchedProjects.length > 0 && !selectedProject) {
        setSelectedProject(fetchedProjects[0]);
      } else if (fetchedProjects.length > 0 && selectedProject) {
        const stillExists = fetchedProjects.find((p: any) => p._id === selectedProject._id);
        setSelectedProject(stillExists || fetchedProjects[0]);
      } else {
        setSelectedProject(null);
      }
      setOrgMembers(memRes.data.data);
    } catch (err) {
      console.error('Failed to load organization projects/members:', err);
    }
  };

  useEffect(() => {
    if (user && activeOrg) {
      loadOrgData();
    }
  }, [user, activeOrg?._id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400 font-medium">Loading Workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans text-zinc-100">
      <Navbar
        onOpenCreateOrg={() => setIsCreateOrgOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentView={currentView}
          setCurrentView={(view) => {
            if (view === 'members') {
              setIsMembersOpen(true);
            } else {
              setCurrentView(view);
            }
          }}
          projects={projects}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          onOpenCreateProject={() => setIsCreateProjectOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black">
          {currentView === 'kanban' && (
            <KanbanBoard
              project={selectedProject}
              onSelectTask={(task) => setSelectedTask(task)}
              onOpenCreateTask={() => setIsCreateTaskOpen(true)}
            />
          )}

          {currentView === 'search' && (
            <AdvancedSearchView
              members={orgMembers}
              onSelectTask={(task) => setSelectedTask(task)}
            />
          )}

          {currentView === 'audit' && <AuditLogView />}
        </main>
      </div>

      {/* Modals */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          members={orgMembers}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={(updated) => {
            setSelectedTask(null);
            loadOrgData();
          }}
          onTaskDeleted={(deletedId) => {
            setSelectedTask(null);
            loadOrgData();
          }}
        />
      )}

      {isCreateTaskOpen && selectedProject && (
        <CreateTaskModal
          project={selectedProject}
          members={orgMembers}
          onClose={() => setIsCreateTaskOpen(false)}
          onTaskCreated={() => {
            loadOrgData();
          }}
        />
      )}

      {isCreateProjectOpen && (
        <CreateProjectModal
          onClose={() => setIsCreateProjectOpen(false)}
          onProjectCreated={(newProj) => {
            setProjects((prev) => [newProj, ...prev]);
            setSelectedProject(newProj);
          }}
        />
      )}

      {isCreateOrgOpen && (
        <CreateOrgModal onClose={() => setIsCreateOrgOpen(false)} />
      )}

      {isMembersOpen && (
        <MembersModal onClose={() => setIsMembersOpen(false)} />
      )}
    </div>
  );
};
