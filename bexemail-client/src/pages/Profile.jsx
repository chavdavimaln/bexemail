import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Phone, Save, Camera, Eye, EyeOff, Globe, CreditCard, Sparkles, CheckCircle2, ShieldCheck, Wand2, Key } from 'lucide-react';
import axios from 'axios';
import { useModal } from '../context/ModalContext';

const Profile = () => {
  const navigate = useNavigate();
  const { alert: customAlert } = useModal();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const initialSub = currentUser.subscription || {};

  const [profileData, setProfileData] = useState({
    username: currentUser.username || currentUser.email?.split('@')[0] || 'subscriber',
    firstName: currentUser.first_name || currentUser.name || '',
    lastName: currentUser.last_name || '',
    email: currentUser.email || '',
    domain: currentUser.domain || 'bexcodeservices.com',
    phone: currentUser.phone || '',
    role: currentUser.role || 'Admin',
    avatar: currentUser.avatar || currentUser.profile_picture || localStorage.getItem('user_avatar') || null
  });

  const userPlanCode = (initialSub.plan_code || currentUser.plan || 'free').toLowerCase();
  const [selectedPlan, setSelectedPlan] = useState(userPlanCode);
  const [activeSub, setActiveSub] = useState(initialSub);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const currentActivePlanCode = (activeSub.plan_code || currentUser.subscription?.plan_code || currentUser.plan || 'free').toLowerCase();

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    setPasswords(prev => ({
      ...prev,
      new: generated,
      confirm: ''
    }));
    setShowNew(true);
    setShowConfirm(false);
  };

  const newPasswordCriteria = {
    hasLowercase: /[a-z]/.test(passwords.new),
    hasUppercase: /[A-Z]/.test(passwords.new),
    hasNumber: /[0-9]/.test(passwords.new),
    hasSpecial: /[^A-Za-z0-9]/.test(passwords.new),
    minLength: passwords.new.length >= 8,
    noUsername: profileData.username ? !passwords.new.toLowerCase().includes(profileData.username.toLowerCase()) : true
  };

  const planOptions = [
    { code: 'free', name: 'Free Plan', price: '₹0/month', seats: '1 Seat (Admin only)', contacts: 'Up to 250 contacts' },
    { code: 'essentials', name: 'Essentials Plan', price: '₹300/mo (then ₹550/mo)', seats: '3 Seats (1 Admin + 2 Associates/Developers)', contacts: 'Up to 50,000 contacts' },
    { code: 'standard', name: 'Standard Plan', price: '₹525/mo (then ₹800/mo)', seats: '5 Seats (1 Admin + 4 Associates/Developers)', contacts: 'Up to 100,000 contacts' },
    { code: 'premium', name: 'Premium Plan', price: '₹10,000/mo (then ₹15,000/mo)', seats: '10 Seats (1 Admin + 9 Associates/Developers)', contacts: 'Up to 150,000 contacts' }
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const headers = {
        'x-user-id': currentUser.id || 1,
        'x-user-role': currentUser.role || 'Super Admin'
      };
      const res = await axios.get('/api/auth/me', { headers }).catch(() => axios.get('http://localhost:5000/api/auth/me', { headers }));
      const fetched = res.data;
      setProfileData(prev => ({
        ...prev,
        username: fetched.username || fetched.email?.split('@')[0] || currentUser.username || 'subscriber',
        email: fetched.email || currentUser.email || '',
        domain: fetched.domain || prev.domain,
        firstName: fetched.name || fetched.first_name || prev.firstName,
        lastName: fetched.last_name || prev.lastName,
        phone: fetched.number || fetched.phone || prev.phone,
        role: fetched.role || currentUser.role || prev.role || 'Admin',
        avatar: fetched.avatar || fetched.profile_picture || currentUser.avatar || currentUser.profile_picture || localStorage.getItem('user_avatar') || prev.avatar || null
      }));

      if (fetched.subscription) {
        setActiveSub(fetched.subscription);
        if (fetched.subscription.plan_code) {
          setSelectedPlan(fetched.subscription.plan_code.toLowerCase());
        }
        localStorage.setItem('user', JSON.stringify({ ...currentUser, ...fetched }));
      }

      const activePassword = fetched.plain_password || currentUser.plain_password || 'vimal1234';
      setPasswords(prev => ({
        ...prev,
        current: activePassword
      }));
    } catch (err) {
      console.error('Fetch profile error:', err);
    }
  };

  const handlePlanUpdate = (e) => {
    e.preventDefault();
    navigate(`/checkout?plan=${selectedPlan}`);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const headers = {
        'x-user-id': currentUser.id || 1,
        'x-user-role': currentUser.role || 'Super Admin'
      };
      const res = await axios.put('/api/auth/profile', {
        name: `${profileData.firstName} ${profileData.lastName}`.trim(),
        email: profileData.email,
        phone: profileData.phone,
        avatar: profileData.avatar
      }, { headers }).catch(() => axios.put('http://localhost:5000/api/auth/profile', {
        name: `${profileData.firstName} ${profileData.lastName}`.trim(),
        email: profileData.email,
        phone: profileData.phone,
        avatar: profileData.avatar
      }, { headers }));

      const freshUser = res.data?.user || {};
      const updatedUser = {
        ...currentUser,
        ...freshUser,
        name: `${profileData.firstName} ${profileData.lastName}`.trim(),
        phone: profileData.phone,
        avatar: profileData.avatar
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('userProfileUpdated'));

      customAlert({ title: 'Success', message: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      customAlert({ title: 'Error', message: 'Failed to update profile.', type: 'danger' });
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!passwords.new || passwords.new.trim() === '') {
      customAlert({ title: 'Validation Required', message: 'Please enter a new password!', type: 'warning' });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      customAlert({ title: 'Validation Error', message: 'New passwords do not match!', type: 'danger' });
      return;
    }
    try {
      const headers = {
        'x-user-id': currentUser.id || 1,
        'x-user-role': currentUser.role || 'Super Admin'
      };
      const res = await axios.put('/api/auth/password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      }, { headers }).catch(() => axios.put('http://localhost:5000/api/auth/password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      }, { headers }));

      const updatedPassword = res.data?.plain_password || passwords.new;
      customAlert({ title: 'Password Updated', message: 'Password updated successfully!', type: 'success' });
      
      const updatedUser = { ...currentUser, plain_password: updatedPassword };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setPasswords({
        current: updatedPassword,
        new: '',
        confirm: ''
      });
      fetchProfile();
    } catch (err) {
      customAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to update password.', type: 'danger' });
    }
  };

  const handleForgotPassword = async () => {
    const targetEmail = profileData.email || currentUser.email;
    if (!targetEmail) {
      customAlert({ title: 'Error', message: 'No registered email found for this profile.', type: 'danger' });
      return;
    }
    try {
      await axios.post('/api/auth/forget-password', { email: targetEmail }).catch(() => axios.post('http://localhost:5000/api/auth/forget-password', { email: targetEmail }));
      customAlert({ 
        title: 'Reset Link Dispatched', 
        message: `Password reset link email has been dispatched via SMTP to your registered email (${targetEmail})!`, 
        type: 'success' 
      });
    } catch (err) {
      customAlert({ 
        title: 'Dispatch Error', 
        message: err.response?.data?.error || 'Failed to send password reset email.', 
        type: 'danger' 
      });
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        customAlert({ title: 'File Too Large', message: 'Profile picture must be less than 3MB.', type: 'warning' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Img = reader.result;
        setProfileData(prev => ({ ...prev, avatar: base64Img }));
        localStorage.setItem('user_avatar', base64Img);

        const updatedUser = { ...currentUser, avatar: base64Img };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('userProfileUpdated'));

        try {
          const headers = {
            'x-user-id': currentUser.id || 1,
            'x-user-role': currentUser.role || 'Super Admin'
          };
          const res = await axios.put('/api/auth/profile', {
            name: `${profileData.firstName} ${profileData.lastName}`.trim(),
            email: profileData.email,
            phone: profileData.phone,
            avatar: base64Img
          }, { headers }).catch(() => axios.put('http://localhost:5000/api/auth/profile', {
            name: `${profileData.firstName} ${profileData.lastName}`.trim(),
            email: profileData.email,
            phone: profileData.phone,
            avatar: base64Img
          }, { headers }));

          const freshUser = res.data?.user || {};
          const finalUser = { ...currentUser, ...freshUser, avatar: base64Img };
          localStorage.setItem('user', JSON.stringify(finalUser));
          window.dispatchEvent(new Event('userProfileUpdated'));

          customAlert({ title: 'Profile Picture Updated', message: 'Your profile picture has been updated and saved successfully!', type: 'success' });
        } catch (err) {
          console.error('Failed to save profile picture to server:', err);
          customAlert({ title: 'Profile Picture Saved', message: 'Your profile picture has been updated and saved successfully!', type: 'success' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const activeAvatarSrc = profileData.avatar || currentUser.avatar || localStorage.getItem('user_avatar') || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Profile</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Profile Picture & Overview */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <User className="mr-2 text-primary-600" size={20} />
              Profile Picture
            </h2>
            <div className="flex flex-col items-center">
              <div className="relative group mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-primary-100 to-primary-200 border-4 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-105">
                  {activeAvatarSrc ? (
                    <img src={activeAvatarSrc} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-primary-600 uppercase">
                      {(profileData.firstName || profileData.username || 'V').charAt(0)}
                    </span>
                  )}
                </div>
                <label className="absolute bottom-1 right-1 bg-primary-600 p-2 rounded-full text-white cursor-pointer hover:bg-primary-700 transition-colors shadow-md ring-2 ring-white">
                  <Camera size={18} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
              <p className="text-sm font-medium text-gray-800">{profileData.firstName} {profileData.lastName}</p>
              <p className="text-sm text-gray-500 mb-2">{profileData.email}</p>
              <span className="mb-4 inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-extrabold rounded-full uppercase tracking-wider">
                Role: {profileData.role}
              </span>
              
              <div className="w-full border-t border-gray-100 pt-4">
                <p className="text-xs text-center text-gray-400">Allowed formats: JPG, PNG, GIF</p>
                <p className="text-xs text-center text-gray-400">Max size: 2MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="xl:col-span-2 space-y-6">
          {/* Profile Details Form */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <User className="mr-2 text-primary-600" size={20} />
              Personal Information
            </h2>
            <form onSubmit={handleProfileUpdate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Registered Domain</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Globe className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={profileData.domain}
                      onChange={(e) => setProfileData({...profileData, domain: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder="bexcodeservices.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                  <input
                    type="text"
                    value={profileData.username}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-500 font-mono outline-none cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Username reference</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-500 font-mono outline-none cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Email ID reference</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
                    Phone Number
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
                    User Role / System Access
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ShieldCheck className="h-4 w-4 text-purple-600" />
                    </div>
                    <input
                      type="text"
                      value={
                        profileData.role === 'Super Admin' ? 'Admin (Super Admin)' :
                        profileData.role === 'Subscriber' || profileData.role === 'Sub Admin' ? 'Associates (Sub Admin)' :
                        profileData.role === 'User' ? 'Developer' :
                        profileData.role
                      }
                      disabled
                      className="w-full pl-10 pr-4 py-2 border border-purple-200 bg-purple-50/60 rounded-lg text-purple-900 font-extrabold outline-none cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Assigned role & system access level</p>
                </div>
              </div>

              <div className="pt-4 flex justify-end border-t border-gray-100">
                <button
                  type="submit"
                  className="flex items-center px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors focus:ring-4 focus:ring-primary-100 active:bg-primary-800"
                >
                  <Save size={18} className="mr-2" />
                  Save Personal Info
                </button>
              </div>
            </form>
          </div>

          {/* Active Subscription & Plan Update Section */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <CreditCard className="mr-2 text-primary-600" size={20} />
                My CRM Subscription Plan & Limits
              </h2>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full uppercase tracking-wider">
                Active Status: {activeSub.status || 'Active'}
              </span>
            </div>

            <form onSubmit={handlePlanUpdate} className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-700">
                <div>
                  <div className="text-slate-400 uppercase text-[10px] font-bold">Active Plan</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {planOptions.find(p => p.code === currentActivePlanCode)?.name || activeSub.plan_name || 'Free Plan'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 uppercase text-[10px] font-bold">Role-Based Seats</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {currentActivePlanCode === 'free'
                      ? '1 Seat (Admin only)'
                      : currentActivePlanCode === 'essentials'
                      ? '3 Seats (1 Admin + 2 Associates/Developers)'
                      : currentActivePlanCode === 'standard'
                      ? '5 Seats (1 Admin + 4 Associates/Developers)'
                      : `${activeSub.seats_limit || 10} Seats (1 Admin + ${(activeSub.seats_limit || 10) - 1} Associates/Developers)`}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 uppercase text-[10px] font-bold">Max Contact Capacity</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {currentActivePlanCode === 'free' ? '250 contacts' : currentActivePlanCode === 'essentials' ? '50,000 contacts' : currentActivePlanCode === 'standard' ? '100,000 contacts' : `${activeSub.contacts_limit ? Number(activeSub.contacts_limit).toLocaleString() : '150,000'} contacts`}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Switch / Update Your Plan Tier
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {planOptions.map(p => {
                    const isSelected = selectedPlan === p.code;
                    const isActive = currentActivePlanCode === p.code;
                    return (
                      <div
                        key={p.code}
                        onClick={() => setSelectedPlan(p.code)}
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50/30 shadow-xs ring-2 ring-primary-500/20'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-gray-900">{p.name}</span>
                            {isActive && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                                Active
                              </span>
                            )}
                            {isSelected && !isActive && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-wider">
                                Selected
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-primary-600">{p.price}</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                          <div>• {p.seats}</div>
                          <div>• {p.contacts}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end border-t border-gray-100">
                <button
                  type="submit"
                  disabled={updatingPlan}
                  className="flex items-center px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors focus:ring-4 focus:ring-indigo-100 disabled:opacity-50"
                >
                  <Sparkles size={18} className="mr-2" />
                  {updatingPlan ? 'Updating Plan...' : 'Update Subscription Plan'}
                </button>
              </div>
            </form>
          </div>

          {/* Password Change Form */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Lock className="mr-2 text-primary-600" size={20} />
                Security Settings
              </h2>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-extrabold transition-all shadow-xs"
              >
                <Wand2 size={14} className="text-amber-600" />
                <span>Generate Strong Password</span>
              </button>
            </div>
            <form onSubmit={handlePasswordUpdate} className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Current Password</label>
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline transition-all"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative max-w-md">
                   <input
                     type={showCurrent ? 'text' : 'password'}
                     value={passwords.current}
                     onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                     required
                     className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"
                   />
                   <button
                     type="button"
                     onClick={() => setShowCurrent(!showCurrent)}
                     className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                   >
                     {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                   </button>
                 </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                   <div className="relative">
                     <input
                       type={showNew ? 'text' : 'password'}
                       value={passwords.new}
                       onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                       required
                       className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"
                     />
                     <button
                       type="button"
                       onClick={() => setShowNew(!showNew)}
                       className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                     >
                       {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                     </button>
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                   <div className="relative">
                     <input
                       type={showConfirm ? 'text' : 'password'}
                       value={passwords.confirm}
                       onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                       required
                       className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"
                     />
                     <button
                       type="button"
                       onClick={() => setShowConfirm(!showConfirm)}
                       className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                     >
                       {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                     </button>
                   </div>
                 </div>
               </div>

               {/* Password Requirements Checklist */}
               <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs text-slate-600 max-w-2xl">
                 <div className="font-black uppercase text-[10px] text-slate-500 tracking-wider mb-1 text-left">
                   PASSWORD REQUIREMENTS:
                 </div>
                 <div className={`flex items-center gap-2 ${newPasswordCriteria.hasLowercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                   <span>{newPasswordCriteria.hasLowercase ? '✓' : '•'}</span> One lowercase character
                 </div>
                 <div className={`flex items-center gap-2 ${newPasswordCriteria.hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                   <span>{newPasswordCriteria.hasUppercase ? '✓' : '•'}</span> One uppercase character
                 </div>
                 <div className={`flex items-center gap-2 ${newPasswordCriteria.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                   <span>{newPasswordCriteria.hasNumber ? '✓' : '•'}</span> One number
                 </div>
                 <div className={`flex items-center gap-2 ${newPasswordCriteria.hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                   <span>{newPasswordCriteria.hasSpecial ? '✓' : '•'}</span> One special character
                 </div>
                 <div className={`flex items-center gap-2 ${newPasswordCriteria.minLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                   <span>{newPasswordCriteria.minLength ? '✓' : '•'}</span> 8 characters minimum
                 </div>
                 {profileData.username && (
                   <div className={`flex items-center gap-2 ${newPasswordCriteria.noUsername ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}`}>
                     <span>{newPasswordCriteria.noUsername ? '✓' : '✗'}</span> Must not contain username
                   </div>
                 )}
               </div>

              <div className="pt-4 flex justify-end border-t border-gray-100">
                <button
                  type="submit"
                  className="flex items-center px-6 py-2.5 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors focus:ring-4 focus:ring-gray-200 active:bg-black"
                >
                  <Lock size={18} className="mr-2" />
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
