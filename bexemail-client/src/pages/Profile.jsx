import React, { useState, useEffect } from 'react';
import { User, Lock, Phone, Save, Camera, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const Profile = () => {
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatar: null
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/me');
      setProfileData(prev => ({
        ...prev,
        email: res.data.email,
        firstName: res.data.role // Mock mapping for now
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://localhost:5000/api/auth/profile', { email: profileData.email });
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile.');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert('New passwords do not match!');
      return;
    }
    try {
      await axios.put('http://localhost:5000/api/auth/password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      alert('Password updated successfully!');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update password.');
    }
  };

  const handleForgotPassword = () => {
    // Simulate password reset email
    alert('A password reset link has been sent to your email address.');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

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
                  {profileData.avatar ? (
                    <img src={profileData.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-primary-600">
                      {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
                    </span>
                  )}
                </div>
                <label className="absolute bottom-1 right-1 bg-primary-600 p-2 rounded-full text-white cursor-pointer hover:bg-primary-700 transition-colors shadow-md ring-2 ring-white">
                  <Camera size={18} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
              <p className="text-sm font-medium text-gray-800">{profileData.firstName} {profileData.lastName}</p>
              <p className="text-sm text-gray-500 mb-4">{profileData.email}</p>
              
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 outline-none cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Contact support to change your email</p>
                </div>
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
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end border-t border-gray-100">
                <button
                  type="submit"
                  className="flex items-center px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors focus:ring-4 focus:ring-primary-100 active:bg-primary-800"
                >
                  <Save size={18} className="mr-2" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Password Change Form */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <Lock className="mr-2 text-primary-600" size={20} />
              Security Settings
            </h2>
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
