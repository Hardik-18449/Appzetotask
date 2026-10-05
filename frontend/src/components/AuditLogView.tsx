import React, { useState, useEffect } from 'react';
import { History, Filter, Search, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { IAuditLog } from '../types';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '25');
      if (entityFilter) params.append('entity', entityFilter);
      if (actionSearch.trim()) params.append('action', actionSearch.trim());
      if (fromDate) params.append('from', new Date(fromDate).toISOString());
      if (toDate) params.append('to', new Date(toDate).toISOString());

      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalCount(res.data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, entityFilter]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAuditLogs();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white tracking-tight">Audit Trail & Compliance</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Immutable system logs tracking state mutations, actor history, and oldValue vs newValue changes.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleApplyFilter}
        className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 backdrop-blur-md flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
            Search Action
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="e.g. TASK_STATUS_CHANGED"
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
            />
          </div>
        </div>

        <div className="w-full sm:w-40">
          <label className="block text-[11px] font-medium text-zinc-300 mb-1">Entity</label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
          >
            <option value="">All Entities</option>
            <option value="Task">Task</option>
            <option value="Project">Project</option>
            <option value="Member">Member</option>
            <option value="Comment">Comment</option>
            <option value="Organization">Organization</option>
          </select>
        </div>

        <div className="w-full sm:w-36">
          <label className="block text-[11px] font-medium text-zinc-300 mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
          >
          </input>
        </div>

        <div className="w-full sm:w-36">
          <label className="block text-[11px] font-medium text-zinc-300 mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
          >
          </input>
        </div>

        <button
          type="submit"
          className="flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Apply</span>
        </button>
      </form>

      {/* Logs Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider sticky top-0 backdrop-blur">
              <th className="p-3">Timestamp</th>
              <th className="p-3">Actor (User)</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
              <th className="p-3">State Diff (Old vs New)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">
                  No audit log entries matching your criteria.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="p-3 text-zinc-400 whitespace-nowrap font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <img
                        src={
                          log.user?.avatarUrl ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            log.user?.name || 'User'
                          )}`
                        }
                        alt="User"
                        className="w-5 h-5 rounded-full border border-zinc-800 object-cover"
                      />
                      <span className="font-medium text-white truncate max-w-[120px]">
                        {log.user?.name || 'System'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-200 text-[10px] font-mono font-medium">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-white font-medium">{log.entity}</span>
                    <span className="text-[10px] text-zinc-500 block truncate max-w-[100px] font-mono">
                      {log.entityId}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="max-w-md bg-black/60 p-2.5 rounded-lg border border-zinc-800 font-mono text-[11px] overflow-x-auto space-y-1">
                      {log.oldValue && (
                        <div className="text-red-400">
                          <span className="text-red-500 font-bold mr-1">- old:</span>
                          {JSON.stringify(log.oldValue)}
                        </div>
                      )}
                      {log.newValue && (
                        <div className="text-zinc-200">
                          <span className="text-zinc-400 font-bold mr-1">+ new:</span>
                          {JSON.stringify(log.newValue)}
                        </div>
                      )}
                      {!log.oldValue && !log.newValue && (
                        <span className="text-zinc-600 italic">No delta recorded</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-zinc-400">
          <span>
            Showing page {page} of {totalPages} ({totalCount} total entries)
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
