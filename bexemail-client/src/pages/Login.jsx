import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('bex_remembered_email') || 'vimal@bexcodeservices.com');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('bex_remember_me') !== 'false');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password, rememberMe });
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      if (rememberMe) {
        localStorage.setItem('bex_remembered_email', email);
        localStorage.setItem('bex_remember_me', 'true');
      } else {
        localStorage.removeItem('bex_remembered_email');
        localStorage.setItem('bex_remember_me', 'false');
      }

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <img src="/bexcode-logo.png" alt="BexCode CRM" className="h-12 object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-secondary tracking-tight">
          Sign in to your account
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-gray-600">
          Sign in to access your CRM domain dashboard and campaigns
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-[#d90a2c] p-3 rounded-xl text-sm border border-red-200 font-medium">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d90a2c] focus:border-[#d90a2c] sm:text-sm transition-all text-secondary"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d90a2c] focus:border-[#d90a2c] sm:text-sm transition-all text-secondary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#d90a2c] focus:ring-[#d90a2c] border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary cursor-pointer font-medium">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/reset-password" className="font-semibold text-[#d90a2c] hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#d90a2c] hover:bg-[#b91c1c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d90a2c] transition-all transform active:scale-[0.99]"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Sign in
              </button>
            </div>

            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-600 font-medium">
                Don't have an account?{' '}
                <Link to="/register" className="font-extrabold text-primary-600 hover:text-primary-700 hover:underline transition">
                  Register here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
