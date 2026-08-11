import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import axios from 'axios';

const Register = () => {
  const [searchParams] = useSearchParams();
  const isTrial = searchParams.get('trial') === '14-days' || searchParams.get('plan') === 'trial' || true;

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    number: '',
    password: '',
    confirmPassword: '',
    role: 'Developer'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setError('Please fill in all required fields (Full Name, Email, Password).');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        number: formData.number,
        password: formData.password,
        role: formData.role,
        isTrial: isTrial
      });

      // Auto login on successful registration
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-200 mb-3">
          <Zap size={26} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">BexEmail</h1>
        <h2 className="mt-2 text-2xl font-extrabold text-slate-800 tracking-tight">
          Start Your 14-Day Free Trial
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto">
          Create your account today and gain immediate access to all features. No credit card required.
        </p>
      </div>

      {/* Main Registration Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        
        {/* 14-Day Trial Highlight Banner */}
        <div className="mb-4 p-4 bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 text-white rounded-2xl shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs flex-shrink-0">
              <Sparkles size={22} className="text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-200">
                ⚡ 14-Day Free Trial Plan Active
              </div>
              <div className="text-xs text-white/90 font-medium">
                Full access to email campaigns, contact management & automation.
              </div>
            </div>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 bg-white/20 rounded-full text-[11px] font-bold tracking-wide flex-shrink-0 border border-white/30">
            0$ Charge
          </span>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 sm:rounded-3xl border border-slate-200/80">
          
          {error && (
            <div className="mb-6 p-3.5 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-200 flex items-center gap-2">
              <ShieldCheck size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>
            
            {/* Full Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Username <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition"
                  placeholder="johndoe"
                />
              </div>
            </div>

            {/* Email & Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone size={18} />
                  </div>
                  <input
                    type="text"
                    name="number"
                    value={formData.number}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition"
                    placeholder="+1 987 654 3210"
                  />
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Select Profile Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-primary-500 outline-none transition"
              >
                <option value="Developer">Developer Profile (Free Trial)</option>
                <option value="Associates">Associates Profile (Free Trial)</option>
              </select>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Trial Features Checklist */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Instant activation — Start sending email campaigns immediately</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>14 Days free trial access to all modules and reports</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-2xl shadow-lg shadow-primary-200 text-xs font-black text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Creating Account & Starting Trial...' : 'Start 14-Day Free Trial'}</span>
                <ArrowRight size={16} className="ml-2" />
              </button>
            </div>

            {/* Sign in redirect */}
            <div className="text-center pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-600 font-medium">
                Already have an account?{' '}
                <Link to="/login" className="font-extrabold text-primary-600 hover:text-primary-700 hover:underline transition">
                  Sign in here
                </Link>
              </p>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export default Register;
