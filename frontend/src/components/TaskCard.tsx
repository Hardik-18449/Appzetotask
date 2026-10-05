import React from 'react';
import { Clock, AlertCircle, Paperclip } from 'lucide-react';
import { ITask } from '../types';

interface TaskCardProps {
  task: ITask;
  onClick: () => void;
  isDragDisabled?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'text-red-400 bg-red-950/40 border-red-800/50';
      case 'HIGH':
        return 'text-white bg-zinc-800 border-zinc-700 font-semibold';
      case 'MEDIUM':
        return 'text-zinc-200 bg-zinc-800/70 border-zinc-700/60';
      case 'LOW':
        return 'text-zinc-400 bg-zinc-900 border-zinc-800';
      default:
        return 'text-zinc-400 bg-zinc-900 border-zinc-800';
    }
  };

  const isDueSoon = () => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate).getTime();
    const now = Date.now();
    return due - now < 86400000 && due > now;
  };

  const isOverdue = () => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate).getTime() < Date.now();
  };

  return (
    <div
      onClick={onClick}
      className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-600 hover:shadow-lg transition-all cursor-pointer group space-y-2 backdrop-blur-sm"
    >
      {/* Labels & Priority */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span
          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono ${getPriorityStyle(
            task.priority
          )}`}
        >
          {task.priority}
        </span>

        {task.labels && task.labels.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {task.labels.slice(0, 2).map((l, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 bg-zinc-800/80 text-zinc-300 rounded border border-zinc-700/50"
              >
                {l}
              </span>
            ))}
            {task.labels.length > 2 && (
              <span className="text-[9px] text-zinc-500 font-mono">+{task.labels.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Bottom Row */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
        <div className="flex items-center space-x-2">
          {task.dueDate && (
            <span
              className={`flex items-center space-x-1 ${
                isOverdue()
                  ? 'text-red-400 font-medium'
                  : isDueSoon()
                  ? 'text-amber-400 font-medium'
                  : 'text-zinc-500'
              }`}
            >
              {isOverdue() ? (
                <AlertCircle className="w-2.5 h-2.5" />
              ) : (
                <Clock className="w-2.5 h-2.5" />
              )}
              <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            </span>
          )}

          {task.attachments && task.attachments.length > 0 && (
            <span className="flex items-center space-x-0.5 text-zinc-500">
              <Paperclip className="w-2.5 h-2.5" />
              <span>{task.attachments.length}</span>
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <div>
          {task.assigneeId ? (
            <div className="flex items-center space-x-1" title={task.assigneeId.name}>
              <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-semibold text-zinc-300">
                {task.assigneeId.name.slice(0, 1).toUpperCase()}
              </div>
            </div>
          ) : (
            <span className="text-[9px] text-zinc-500 italic">Unassigned</span>
          )}
        </div>
      </div>
    </div>
  );
};
