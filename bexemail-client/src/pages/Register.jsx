import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Globe, Eye, EyeOff, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Zap, Layers, Check, Wand2, Key } from 'lucide-react';
import axios from 'axios';

const Register = () => {
  const [searchParams] = useSearchParams();
  const urlPlan = searchParams.get('plan') || 'standard';

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    domain: 'bexcodeservices.com',
    number: '',
    password: '',
    confirmPassword: '',
    role: 'Admin',
    plan: urlPlan.toLowerCase()
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleGeneratePassword = () => {
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    const symbols = '!@#$%^&*';
    let pass = '';
    pass += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    pass += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
    pass += symbols.charAt(Math.floor(Math.random() * symbols.length));
    const all = lowercase + uppercase + numbers + symbols;
    for (let i = 0; i < 8; i++) {
      pass += all.charAt(Math.floor(Math.random() * all.length));
    }
    const generated = pass.split('').sort(() => 0.5 - Math.random()).join('');
    setFormData(prev => ({
      ...prev,
      password: generated,
      confirmPassword: ''
    }));
    setShowPassword(true);
    setShowConfirmPassword(false);
  };

  // 4 Pricing Plans matching requirement & limits matrix
  const plans = [
    {
      code: 'free',
      name: 'Free',
      price: '₹0/month',
      seats: '1 Admin Seat',
      limits: '1 Domain Reg. | 1 SMTP Config',
      contacts: 'Up to 250 contacts',
      desc: 'Basic tools for businesses getting started.'
    },
    {
      code: 'essentials',
      name: 'Essentials',
      price: '₹300/mo for 12 mos',
      priceSub: 'Then ₹550/mo',
      seats: '3 Admin Seats',
      limits: '3 Domain Reg. | 3 SMTP Configs',
      contacts: 'Up to 50,000 contacts ($300/mo tier)',
      desc: 'Core automations & support.'
    },
    {
      code: 'standard',
      name: 'Standard',
      price: '₹525/mo for 12 mos',
      priceSub: 'Then ₹800/mo',
      seats: '5 Admin Seats',
      limits: '5 Domain Reg. | 5 SMTP Configs',
      contacts: 'Up to 100,000 contacts ($800/mo tier)',
      desc: 'Advanced AI & growth insights.',
      popular: true
    },
    {
      code: 'premium',
      name: 'Premium',
      price: '₹10,000/mo for 12 mos',
      priceSub: 'Then ₹15,000/mo',
      seats: '10 Admin Seats',
      limits: '10 Domain Reg. | 10 SMTP Configs',
      contacts: 'Contact us for custom plan',
      desc: 'Enterprise capabilities & dedicated IP.'
    }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Password validation checks (Mailchimp style)
  const passwordCriteria = {
    hasLowercase: /[a-z]/.test(formData.password),
    hasUppercase: /[A-Z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecial: /[^A-Za-z0-9]/.test(formData.password),
    minLength: formData.password.length >= 8,
    noUsername: formData.username ? !formData.password.toLowerCase().includes(formData.username.toLowerCase()) : true
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
        domain: formData.domain,
        number: formData.number,
        password: formData.password,
        role: formData.role,
        plan: formData.plan,
        isTrial: true
      });

      // Auto login on successful registration
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      navigate(`/checkout?plan=${formData.plan || 'standard'}&registered=true`);
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
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-200 mb-3">
          <Zap size={26} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">BexEmail CRM</h1>
        <h2 className="mt-2 text-2xl font-extrabold text-slate-800 tracking-tight">
          Domain & Account Registration
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium max-w-lg mx-auto">
          Register your client domain, email format, and configure your plan features.
        </p>
      </div>

      {/* Main Registration Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 sm:rounded-3xl border border-slate-200/80">
          
          {error && (
            <div className="mb-6 p-4 bg-amber-50 text-amber-900 rounded-2xl text-xs font-bold border border-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="flex-shrink-0 text-amber-600" />
                <span>{error}</span>
              </div>
              {error.toLowerCase().includes('already registered') && (
                <Link to="/login" className="px-3 py-1.5 bg-amber-600 text-white text-xs font-black rounded-xl hover:bg-amber-700 transition flex-shrink-0">
                  Sign in & Update Plan
                </Link>
              )}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleRegister}>
            
            {/* Domain Registration Section */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                <Globe size={16} className="text-primary-600" />
                <span>CRM Domain Registration Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Client Domain Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Globe size={18} />
                    </div>
                    <input
                      type="text"
                      name="domain"
                      required
                      value={formData.domain}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition"
                      placeholder="bexcodeservices.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Business Email *
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
                      placeholder="vimal@bexcodeservices.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    placeholder="Vimal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition"
                  placeholder="vimalbex"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone size={18} />
                  </div>
                  <input
                    type="text"
                    name="number"
                    required
                    value={formData.number}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>
            </div>

            {/* Plan Selection Cards (Matching PDF Page 2 Table) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Select CRM Plan Tier *
                </label>
                <span className="text-[11px] font-bold text-primary-600">4 Plans Available</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plans.map((p) => {
                  const isSelected = formData.plan === p.code;
                  return (
                    <div
                      key={p.code}
                      onClick={() => setFormData({ ...formData, plan: p.code })}
                      className={`cursor-pointer p-4 rounded-2xl border-2 transition-all relative ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {p.popular && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-amber-400 text-slate-900 font-black text-[9px] uppercase tracking-wider rounded-full shadow-xs">
                          POPULAR
                        </span>
                      )}
                      
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">{p.name} Plan</div>
                          <div className="text-xs font-black text-primary-700 mt-0.5">{p.price}</div>
                          {p.priceSub && <div className="text-[10px] text-slate-500 font-semibold">{p.priceSub}</div>}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100/80 text-[11px] space-y-1 text-slate-600 font-medium">
                        <div><strong>Role Access:</strong> {p.seats}</div>
                        <div><strong>Allowed Limits:</strong> <span className="font-bold text-slate-800">{p.limits}</span></div>
                        <div><strong>Contacts:</strong> {p.contacts}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary-600 hover:text-primary-700 hover:underline transition"
                  >
                    <Wand2 size={13} className="text-amber-500" />
                    <span>Generate Password</span>
                  </button>
                </div>
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

            {/* Mailchimp style password rules list */}
            {formData.password.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-[11px] text-slate-600">
                <div className="font-extrabold uppercase text-[10px] text-slate-500 tracking-wider mb-1">Password Requirements:</div>
                <div className={`flex items-center gap-1.5 ${passwordCriteria.hasLowercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span>{passwordCriteria.hasLowercase ? '✓' : '•'}</span> One lowercase character
                </div>
                <div className={`flex items-center gap-1.5 ${passwordCriteria.hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span>{passwordCriteria.hasUppercase ? '✓' : '•'}</span> One uppercase character
                </div>
                <div className={`flex items-center gap-1.5 ${passwordCriteria.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span>{passwordCriteria.hasNumber ? '✓' : '•'}</span> One number
                </div>
                <div className={`flex items-center gap-1.5 ${passwordCriteria.hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span>{passwordCriteria.hasSpecial ? '✓' : '•'}</span> One special character
                </div>
                <div className={`flex items-center gap-1.5 ${passwordCriteria.minLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span>{passwordCriteria.minLength ? '✓' : '•'}</span> 8 characters minimum
                </div>
                {formData.username && (
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.noUsername ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}`}>
                    <span>{passwordCriteria.noUsername ? '✓' : '✗'}</span> Must not contain username
                  </div>
                )}
              </div>
            )}

            {/* Trial Features Checklist */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Domain Verification & Instant Activation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>14 Days free trial access to configured plan modules</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-primary-200 text-xs font-black text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Registering Domain & Account...' : 'Complete CRM Registration'}</span>
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
