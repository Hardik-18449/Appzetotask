import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Send,
  User as UserIcon,
  Tag,
  Paperclip,
  AlertCircle,
  Save,
} from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { ITask, ITaskComment, TaskStatus, TaskPriority, IUser } from '../types';

interface TaskModalProps {
  task: ITask;
  onClose: () => void;
  onTaskUpdated: (task: ITask) => void;
  onTaskDeleted: (taskId: string) => void;
  members: { id: string; user: IUser; role: string }[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  members,
}) => {
  const { user, activeRole } = useAuth();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<string>(
    task.assigneeId?._id || task.assigneeId?.id || ''
  );
  const [dueDate, setDueDate] = useState<string>(
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [labels, setLabels] = useState<string>(task.labels?.join(', ') || '');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [attachments, setAttachments] = useState(task.attachments || []);

  const [comments, setComments] = useState<ITaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const taskAssigneeId = task.assigneeId?._id || task.assigneeId?.id;
  const currentUserId = user?._id || user?.id;

  const canEdit =
    activeRole === 'OWNER' ||
    activeRole === 'ADMIN' ||
    (activeRole === 'MEMBER' && taskAssigneeId && taskAssigneeId === currentUserId);

  const canDelete = activeRole === 'OWNER' || activeRole === 'ADMIN';

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await api.get(`/tasks/${task._id}/comments`);
        setComments(res.data.data);
      } catch (err) {
        console.error('Failed to load comments:', err);
      }
    };
    fetchComments();

    const socket = getSocket();
    if (socket) {
      const handleNewComment = ({
        taskId,
        comment,
      }: {
        taskId: string;
        comment: ITaskComment;
      }) => {
        if (taskId === task._id) {
          setComments((prev) => {
            if (prev.some((c) => c._id === comment._id)) return prev;
            return [...prev, comment];
          });
        }
      };

      socket.on('comment:added', handleNewComment);
      return () => {
        socket.off('comment:added', handleNewComment);
      };
    }
  }, [task._id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError(null);
    setErrorMessage(null);

    if (!canEdit) {
      setErrorMessage('You do not have permission to edit this task.');
      return;
    }

    if (!title.trim()) {
      setTitleError('Task title is required');
      return;
    }
    if (title.trim().length < 2) {
      setTitleError('Title must be at least 2 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      const parsedLabels = labels
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const res = await api.put(`/tasks/${task._id}`, {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labels: parsedLabels,
        attachments,
      });

      onTaskUpdated(res.data.data);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to update task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await api.delete(`/tasks/${task._id}`);
      onTaskDeleted(task._id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to delete task.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await api.post(`/tasks/${task._id}/comments`, {
        content: commentText.trim(),
      });
      setComments((prev) => [...prev, res.data.data]);
      setCommentText('');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to post comment.');
    }
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName || !newAttachmentUrl) return;
    setAttachments((prev) => [
      ...prev,
      {
        name: newAttachmentName,
        url: newAttachmentUrl,
        size: 1024,
        uploadedAt: new Date().toISOString(),
      },
    ]);
    setNewAttachmentName('');
    setNewAttachmentUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-zinc-300">
              Task Details
            </span>
            {!canEdit && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                Read-Only (Assigned to someone else)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/40 border-b border-red-800/60 text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-6">
          <form onSubmit={handleSave} noValidate className="space-y-4">
            {/* Title with Validation */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                disabled={!canEdit}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError(null);
                }}
                className={`w-full bg-zinc-900 border ${
                  titleError ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-white'
                } rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors disabled:opacity-60`}
              />
              {titleError && (
                <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>{titleError}</span>
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                disabled={!canEdit}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-white rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors disabled:opacity-60"
              />
            </div>

            {/* Meta Row: Status, Priority, Assignee */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Status</label>
                <select
                  value={status}
                  disabled={!canEdit}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-white rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-colors disabled:opacity-60"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Priority</label>
                <select
                  value={priority}
                  disabled={!canEdit}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-white rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-colors disabled:opacity-60"
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
                  disabled={!canEdit}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-white rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-colors disabled:opacity-60"
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

            {/* Due Date & Labels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  disabled={!canEdit}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-white rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-colors disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Labels (comma-separated)
                </label>
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={labels}
                    disabled={!canEdit}
                    placeholder="e.g. backend, urgent, ui"
                    onChange={(e) => setLabels(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-white rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-300">Attachments</label>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs text-zinc-300 transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{att.name}</span>
                  </a>
                ))}
              </div>

              {canEdit && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Attachment Name"
                    value={newAttachmentName}
                    onChange={(e) => setNewAttachmentName(e.target.value)}
                    className="w-full sm:w-1/3 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-white"
                  />
                  <input
                    type="text"
                    placeholder="URL (https://...)"
                    value={newAttachmentUrl}
                    onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Save / Delete Actions */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              {canDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Task</span>
                </button>
              ) : <div />}

              {canEdit && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              )}
            </div>
          </form>

          {/* Comments & Discussions Section */}
          <div className="pt-4 border-t border-zinc-800 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Discussions ({comments.length})
            </h4>

            {/* New Comment Input */}
            {activeRole !== 'VIEWER' && (
              <form onSubmit={handleAddComment} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Add a comment... (Type @username to mention)"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
                />
                <button
                  type="submit"
                  className="p-2 bg-white hover:bg-zinc-200 text-black rounded-lg transition-colors shadow-sm"
                  title="Post comment"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* Comments List */}
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c._id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-start space-x-3">
                    <img
                      src={
                        c.userId?.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          c.userId?.name || 'User'
                        )}`
                      }
                      alt={c.userId?.name}
                      className="w-6 h-6 rounded-full border border-zinc-800 object-cover mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white">
                          {c.userId?.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1 whitespace-pre-wrap">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
