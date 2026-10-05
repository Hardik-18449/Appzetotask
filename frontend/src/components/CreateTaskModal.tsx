import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { IProject, ITask, TaskPriority, IUser } from '../types';

interface CreateTaskModalProps {
  project: IProject;
  members: { id: string; user: IUser; role: string }[];
  onClose: () => void;
  onTaskCreated: (task: ITask) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  project,
  members,
  onClose,
  onTaskCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'Task title is required';
    } else if (title.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const parsedLabels = labels
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const res = await api.post('/tasks', {
        projectId: project._id,
        title: title.trim(),
        description: description.trim(),
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labels: parsedLabels,
      });

      onTaskCreated(res.data.data);
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.error?.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <h3 className="text-sm font-semibold text-white">Create New Task</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {serverError && (
          <div className="p-3 bg-red-950/40 border-b border-red-800/60 text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Title *</label>
            <input
              type="text"
              placeholder="e.g. Implement caching strategy"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              className={`w-full bg-zinc-900 border ${
                errors.title ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-white'
              } rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors`}
            />
            {errors.title && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Task details and scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-white rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.user?.id || (m.user as any)?._id}>
                    {m.user?.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Labels (comma separated)</label>
              <input
                type="text"
                placeholder="backend, api, bug"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating...' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
