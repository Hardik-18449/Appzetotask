import React, { useState } from 'react';
import { X, FolderPlus, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { IProject } from '../types';

interface CreateProjectModalProps {
  onClose: () => void;
  onProjectCreated: (project: IProject) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  onClose,
  onProjectCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Project name must be at least 2 characters';
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
      const res = await api.post('/projects', {
        name: name.trim(),
        description: description.trim(),
      });
      onProjectCreated(res.data.data);
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.error?.message || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <h3 className="text-sm font-semibold text-white">Create New Project</h3>
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
            <label className="block text-xs font-medium text-zinc-300 mb-1">Project Name *</label>
            <input
              type="text"
              placeholder="e.g. NextGen Microservices"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              className={`w-full bg-zinc-900 border ${
                errors.name ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-white'
              } rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors`}
            />
            {errors.name && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Project goals and technical scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-white rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
            />
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
              <FolderPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating...' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
