import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IUser, OrgRole } from '../types';

interface MemberItem {
  id: string;
  user: IUser;
  role: OrgRole;
  joinedAt: string;
}

interface MembersModalProps {
  onClose: () => void;
}

export const MembersModal: React.FC<MembersModalProps> = ({ onClose }) => {
  const { activeOrg, activeRole } = useAuth();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('MEMBER');
  const [isLoading, setIsLoading] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!activeOrg) return;
    try {
      setIsLoading(true);
      const res = await api.get(`/organizations/${activeOrg._id}/members`);
      setMembers(res.data.data);
    } catch (err: any) {
      console.error('Failed to fetch members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeOrg?._id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('User email address is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!activeOrg) return;

    try {
      await api.post(`/organizations/${activeOrg._id}/members`, {
        email: trimmedEmail,
        role,
      });
      setSuccessMessage(`User invited successfully as ${role}!`);
      setEmail('');
      fetchMembers();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to add member.');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeOrg) return;
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      setErrorMessage(null);
      await api.delete(`/organizations/${activeOrg._id}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => (m.user.id || (m.user as any)._id) !== userId));
      setSuccessMessage('Member removed successfully.');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to remove member.');
    }
  };

  const canManage = activeRole === 'OWNER' || activeRole === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div>
            <h3 className="text-sm font-semibold text-white">Organization Members</h3>
            <p className="text-[11px] text-zinc-400">
              Manage member roles and workspace access for {activeOrg?.name}
            </p>
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

        {successMessage && (
          <div className="p-3 bg-zinc-900 border-b border-zinc-700 text-zinc-200 text-xs">
            {successMessage}
          </div>
        )}

        {/* Add Member Form (Admin/Owner only) with noValidate */}
        {canManage && (
          <form
            onSubmit={handleAddMember}
            noValidate
            className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex flex-col sm:flex-row gap-3 items-start sm:items-end"
          >
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                User Email *
              </label>
              <input
                type="email"
                placeholder="colleague@nexus.io"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                className={`w-full bg-zinc-900 border ${
                  emailError ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-white'
                } rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors`}
              />
              {emailError && (
                <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            <div className="w-full sm:w-36">
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as OrgRole)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-white rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none transition-colors"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="MEMBER">MEMBER</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          </form>
        )}

        {/* Members List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-zinc-800/80">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-zinc-500">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">No members found.</div>
          ) : (
            members.map((m) => {
              const uId = m.user?.id || (m.user as any)?._id;
              return (
                <div key={m.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={
                        m.user?.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          m.user?.name || 'User'
                        )}`
                      }
                      alt={m.user?.name}
                      className="w-8 h-8 rounded-full border border-zinc-800 object-cover"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">{m.user?.name}</div>
                      <div className="text-[10px] text-zinc-400">{m.user?.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 uppercase font-mono font-medium">
                      {m.role}
                    </span>

                    {canManage && m.role !== 'OWNER' && (
                      <button
                        onClick={() => handleRemoveMember(uId)}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
