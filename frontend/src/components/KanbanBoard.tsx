import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, ShieldAlert } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { api } from '../services/api';
import { getSocket, joinProjectRoom, leaveProjectRoom } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { ITask, IProject, TaskStatus } from '../types';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'border-t-zinc-600' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-t-zinc-400' },
  { id: 'REVIEW', title: 'In Review', color: 'border-t-zinc-300' },
  { id: 'DONE', title: 'Done', color: 'border-t-white' },
];

interface KanbanBoardProps {
  project: IProject | null;
  onSelectTask: (task: ITask) => void;
  onOpenCreateTask: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  project,
  onSelectTask,
  onOpenCreateTask,
}) => {
  const { activeRole } = useAuth();
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!project) return;
    try {
      setIsLoading(true);
      const res = await api.get(`/tasks?projectId=${project._id}&limit=100`);
      setTasks(res.data.data);
    } catch (err: any) {
      console.error('Failed to load project tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!project) return;

    fetchTasks();
    joinProjectRoom(project._id);

    const socket = getSocket();
    if (socket) {
      const handleTaskCreated = ({ task }: { task: ITask }) => {
        if (task.projectId === project._id) {
          setTasks((prev) => {
            if (prev.some((t) => t._id === task._id)) return prev;
            return [...prev, task];
          });
        }
      };

      const handleTaskUpdated = ({ task }: { task: ITask }) => {
        if (task.projectId === project._id) {
          setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
        }
      };

      const handleTaskDeleted = ({ taskId }: { taskId: string }) => {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      };

      socket.on('task:created', handleTaskCreated);
      socket.on('task:updated', handleTaskUpdated);
      socket.on('task:deleted', handleTaskDeleted);

      return () => {
        leaveProjectRoom(project._id);
        socket.off('task:created', handleTaskCreated);
        socket.off('task:updated', handleTaskUpdated);
        socket.off('task:deleted', handleTaskDeleted);
      };
    }
  }, [project?._id]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const targetStatus = destination.droppableId as TaskStatus;
    const taskToMove = tasks.find((t) => t._id === draggableId);
    if (!taskToMove) return;

    const previousTasks = [...tasks];

    const updatedTasks = tasks.map((t) =>
      t._id === draggableId
        ? { ...t, status: targetStatus, order: destination.index }
        : t
    );
    setTasks(updatedTasks);
    setErrorMessage(null);

    try {
      await api.put(`/tasks/${draggableId}`, {
        status: targetStatus,
        order: destination.index,
      });
    } catch (err: any) {
      setTasks(previousTasks);
      const errorMsg =
        err.response?.data?.error?.message ||
        'Action prohibited: server authorization rejected task movement.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
        <p className="text-xs">Select or create a project from the sidebar to view tasks.</p>
      </div>
    );
  }

  const canCreate = activeRole === 'OWNER' || activeRole === 'ADMIN' || activeRole === 'MEMBER';

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-base font-semibold text-white tracking-tight">{project.name}</h2>
            <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 text-[10px] font-mono border border-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Synced</span>
            </span>
          </div>
          {project.description && (
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">{project.description}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {canCreate && (
            <button
              onClick={onOpenCreateTask}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Permission alert error toast */}
      {errorMessage && (
        <div className="mt-3 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Kanban Drag and Drop Columns with Smooth Responsive Scroll */}
      <div className="flex-1 overflow-x-auto pt-4 pb-2">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex items-start space-x-4 min-w-[950px] h-full">
            {COLUMNS.map((column) => {
              const columnTasks = tasks
                .filter((t) => t.status === column.id)
                .sort((a, b) => a.order - b.order);

              return (
                <div
                  key={column.id}
                  className={`w-72 flex-shrink-0 flex flex-col max-h-full rounded-2xl bg-zinc-950/70 backdrop-blur-md border border-zinc-800/80 border-t-2 ${column.color}`}
                >
                  {/* Column Header */}
                  <div className="p-3.5 flex items-center justify-between border-b border-zinc-800/80">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">
                        {column.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded font-mono font-medium">
                        {columnTasks.length}
                      </span>
                    </div>

                    {canCreate && (
                      <button
                        onClick={onOpenCreateTask}
                        className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                        title="Add Task"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Droppable Task List */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-2.5 flex-1 overflow-y-auto space-y-2.5 transition-colors min-h-[140px] ${
                          snapshot.isDraggingOver ? 'bg-zinc-900/50' : ''
                        }`}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable
                            key={task._id}
                            draggableId={task._id}
                            index={index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`transition-all ${
                                   dragSnapshot.isDragging ? 'opacity-85 shadow-2xl scale-[1.02]' : ''
                                }`}
                              >
                                <TaskCard
                                  task={task}
                                  onClick={() => onSelectTask(task)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-24 border border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-xs text-zinc-600">
                            No tasks
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};
