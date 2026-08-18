import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Key, Eye, EyeOff, ArrowLeft, UserPlus } from 'lucide-react';
import axios from 'axios';
import { useModal } from '../context/ModalContext';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { alert: customAlert } = useModal();

  const queryEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(queryEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, [queryEmail]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setConfirmPassword('');
    setShowNewPassword(true);
    setShowConfirmPassword(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      customAlert({ title: 'Validation Error', message: 'Target registered email address is missing.', type: 'danger' });
      return;
    }
    if (!newPassword || newPassword.trim() === '') {
      customAlert({ title: 'Validation Error', message: 'Please enter a new password.', type: 'warning' });
      return;
    }
    if (newPassword !== confirmPassword) {
      customAlert({ title: 'Validation Error', message: 'Passwords do not match.', type: 'danger' });
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password-public', {
        email: email.trim(),
        newPassword: newPassword.trim()
      }).catch(() => axios.post('http://localhost:5000/api/auth/reset-password-public', {
        email: email.trim(),
        newPassword: newPassword.trim()
      }));

      customAlert({
        title: 'Password Reset Successful!',
        message: `Your password for ${email} has been updated successfully! Redirecting you to login...`,
        type: 'success'
      });

      setTimeout(() => {
        navigate(`/login?email=${encodeURIComponent(email)}`);
      }, 1500);
    } catch (err) {
      customAlert({
        title: 'Reset Failed',
        message: err.response?.data?.error || 'Failed to reset password. Please check backend connection.',
        type: 'danger'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-extrabold text-primary-600 tracking-tight mb-1">BexEmail</h1>
        <h2 className="mt-2 text-2xl font-extrabold text-gray-900 tracking-tight">
          Reset Your Password
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Enter a new secure password for your registered account below
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 sm:rounded-2xl sm:px-10 border border-slate-200/80">
          <form className="space-y-5" onSubmit={handleResetPassword}>
            
            {/* Email ID input - Disabled by default */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Registered Email ID (Disabled)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  disabled
                  readOnly
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-100 border border-slate-300 text-gray-700 font-mono text-xs font-bold rounded-xl cursor-not-allowed outline-none"
                  placeholder="user@example.com"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">This email address is locked for account verification security.</p>
            </div>

            {/* New Password input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  New Password *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-[11px] font-bold text-primary-600 hover:text-primary-700 uppercase focus:outline-none flex items-center gap-1"
                  >
                    <Key size={12} />
                    <span>Generate Password</span>
                  </button>
                  {newPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(newPassword);
                        customAlert({ title: 'Copied', message: 'New password copied to clipboard!', type: 'success' });
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 uppercase focus:outline-none"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>

              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium transition-all"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password input */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Confirm Password *
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium transition-all"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Reset & Save Password'}
              </button>
            </div>
          </form>

          {/* Navigation Links: Login & New Register */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link 
              to="/login" 
              className="font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Login</span>
            </Link>

            <Link 
              to="/login?mode=register" 
              className="font-bold text-slate-600 hover:text-primary-600 flex items-center gap-1.5 transition-colors"
            >
              <UserPlus size={14} />
              <span>New Register Option</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
