import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { api } from '../services/api';
import { ITask, IUser } from '../types';
import { TaskCard } from './TaskCard';

interface AdvancedSearchViewProps {
  members: { id: string; user: IUser; role: string }[];
  onSelectTask: (task: ITask) => void;
}

export const AdvancedSearchView: React.FC<AdvancedSearchViewProps> = ({
  members,
  onSelectTask,
}) => {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [labels, setLabels] = useState('');
  const [dueDateComparison, setDueDateComparison] = useState('');
  const [dueDateValue, setDueDateValue] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchFilteredTasks = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');

      if (debouncedQuery.trim()) params.append('q', debouncedQuery.trim());
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (assignee) params.append('assignee', assignee);
      if (labels.trim()) params.append('labels', labels.trim());

      if (dueDateValue) {
        if (dueDateComparison === 'before') {
          params.append('dueDate', `<${dueDateValue}`);
        } else if (dueDateComparison === 'after') {
          params.append('dueDate', `>${dueDateValue}`);
        } else {
          params.append('dueDate', dueDateValue);
        }
      }

      const res = await api.get(`/tasks?${params.toString()}`);
      setTasks(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalCount(res.data.pagination.total);
    } catch (err) {
      console.error('Failed to execute search:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredTasks();
  }, [debouncedQuery, status, priority, assignee, labels, dueDateComparison, dueDateValue, page]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
          <Search className="w-5 h-5 text-white" />
          <span>Advanced Multi-Attribute Search Engine</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Perform debounced full-text search across titles & descriptions combined with status, priority, assignee, and date range filters.
        </p>
      </div>

      {/* Search & Combined Filter Bar */}
      <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 backdrop-blur-md space-y-3">
        {/* Full Text Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tasks by title, description or keyword (debounced 300ms)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {/* Combined Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Assignee</label>
            <select
              value={assignee}
              onChange={(e) => {
                setAssignee(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.user?.id || (m.user as any)?._id}>
                  {m.user?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Due Date Op</label>
            <select
              value={dueDateComparison}
              onChange={(e) => setDueDateComparison(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
            >
              <option value="">Exact Date</option>
              <option value="before">Before (&lt;)</option>
              <option value="after">After (&gt;)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Date</label>
            <input
              type="date"
              value={dueDateValue}
              onChange={(e) => {
                setDueDateValue(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Found {totalCount} matching tasks</span>
          {isLoading && <span className="text-white animate-pulse">Searching...</span>}
        </div>

        {tasks.length === 0 && !isLoading ? (
          <div className="p-12 text-center text-zinc-500 bg-zinc-950/40 rounded-2xl border border-zinc-800">
            No tasks found matching your filter combinations.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tasks.map((task) => (
              <TaskCard key={task._id} task={task} onClick={() => onSelectTask(task)} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs text-zinc-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
