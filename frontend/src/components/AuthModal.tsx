import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  Crown,
  ShieldCheck,
  Briefcase,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (isRegister) {
      if (!name.trim()) {
        newErrors.name = 'Full name is required';
      } else if (name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isRegister) {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
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
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

      const res = await api.post(endpoint, payload);
      await login(res.data.data.user);
    } catch (err: any) {
      setServerError(err.response?.data?.error?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string) => {
    try {
      setIsSubmitting(true);
      setServerError(null);
      setErrors({});
      const res = await api.post('/auth/login', {
        email: quickEmail,
        password: 'password123',
      });
      await login(res.data.data.user);
    } catch (err: any) {
      setServerError(err.response?.data?.error?.message || 'Quick login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 my-auto">
        {/* Brand Header */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Nexus Platform
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight pt-1">
            {isRegister ? 'Create an account' : 'Sign in to workspace'}
          </h2>
          <p className="text-xs text-zinc-400">
            Multi-tenant project management & real-time collaboration.
          </p>
        </div>

        {serverError && (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form with noValidate to suppress native tooltips */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Full Name (Register only) */}
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Sarah Connor"
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
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Work Email</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              className={`w-full bg-zinc-900 border ${
                errors.email ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-white'
              } rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors`}
            />
            {errors.email && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          {/* Password with Eye Toggle */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                className={`w-full bg-zinc-900 border ${
                  errors.password ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-white'
                } rounded-lg pl-3 pr-10 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.password}</span>
              </p>
            )}
          </div>

          {/* Confirm Password with Eye Toggle (Register only) */}
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  className={`w-full bg-zinc-900 border ${
                    errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-white'
                  } rounded-lg pl-3 pr-10 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>
          )}

          {/* Black & White Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            {isRegister ? <UserPlus className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
            <span>{isSubmitting ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}</span>
          </button>
        </form>

        {/* Toggle Login / Register */}
        <div className="text-center text-xs text-zinc-400">
          {isRegister ? 'Already registered?' : 'Need an enterprise account?'}{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setErrors({});
              setServerError(null);
            }}
            className="text-white hover:underline font-semibold ml-1"
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </div>

        {/* Quick Role Selectors in Black & White */}
        <div className="pt-4 border-t border-zinc-900 space-y-2.5">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Quick Demo Role Profiles
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('alice@enterprise.com')}
              className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-left transition-colors group"
            >
              <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-200 group-hover:text-white">
                <Crown className="w-3 h-3 text-zinc-400" />
                <span>Alice (Owner)</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Full Tenant Access</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('bob@enterprise.com')}
              className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-left transition-colors group"
            >
              <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-200 group-hover:text-white">
                <ShieldCheck className="w-3 h-3 text-zinc-400" />
                <span>Bob (Admin)</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Projects & Members</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('charlie@enterprise.com')}
              className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-left transition-colors group"
            >
              <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-200 group-hover:text-white">
                <Briefcase className="w-3 h-3 text-zinc-400" />
                <span>Charlie (Member)</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Assigned Tasks Only</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('dave@enterprise.com')}
              className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-left transition-colors group"
            >
              <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-200 group-hover:text-white">
                <Eye className="w-3 h-3 text-zinc-400" />
                <span>Dave (Viewer)</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Read-Only Access</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
