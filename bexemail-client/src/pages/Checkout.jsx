import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  CreditCard, ShieldCheck, CheckCircle2, Lock, ArrowLeft, Sparkles, QrCode, 
  Building2, Wallet, ArrowRight, Check, AlertCircle, Copy, FileText
} from 'lucide-react';
import axios from 'axios';
import { useModal } from '../context/ModalContext';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { alert: customAlert } = useModal();

  const planCodeFromUrl = searchParams.get('plan') || 'standard';
  const isFromRegister = searchParams.get('registered') === 'true';
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [activeTab, setActiveTab] = useState('card');
  const [selectedPlanCode, setSelectedPlanCode] = useState(planCodeFromUrl.toLowerCase());
  const [loading, setLoading] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState(null);

  // Card Form State
  const [cardData, setCardData] = useState({
    name: currentUser.name || 'John Doe',
    number: '4242 4242 4242 4242',
    exp: '12/28',
    cvc: '123'
  });

  // Net Banking State
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Wallet State
  const [selectedWallet, setSelectedWallet] = useState('Google Pay');

  const plansCatalog = {
    free: {
      code: 'free',
      name: 'Free Plan',
      price: '₹0',
      priceText: '₹0 / month',
      seats: '1 Seat (Admin only)',
      contacts: 'Up to 250 contacts',
      emails: '1,000 emails/mo',
      numericPrice: 0
    },
    essentials: {
      code: 'essentials',
      name: 'Essentials Plan',
      price: '₹300',
      priceText: '₹300/mo for 12 months (then ₹550/mo)',
      seats: '3 Seats (Admin/Associates)',
      contacts: 'Up to 50,000 contacts',
      emails: '5,000 emails/mo',
      numericPrice: 300
    },
    standard: {
      code: 'standard',
      name: 'Standard Plan',
      price: '₹525',
      priceText: '₹525/mo for 12 months (then ₹800/mo)',
      seats: '5 Seats (Admin/Associates)',
      contacts: 'Up to 100,000 contacts',
      emails: '6,000 emails/mo',
      numericPrice: 525
    },
    premium: {
      code: 'premium',
      name: 'Premium Plan',
      price: '₹10,000',
      priceText: '₹10,000/mo for 12 months (then ₹15,000/mo)',
      seats: '10 Seats (Admin/Associates)',
      contacts: 'Contact us for custom plan',
      emails: '150,000 emails/mo',
      numericPrice: 10000
    }
  };

  const activePlan = plansCatalog[selectedPlanCode] || plansCatalog.standard;

  const fillDemoCard = () => {
    setCardData({
      name: currentUser.name || 'John Doe',
      number: '4242 4242 4242 4242',
      exp: '12/28',
      cvc: '123'
    });
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const headers = {
        'x-user-id': currentUser.id || 1,
        'x-user-role': currentUser.role || 'Super Admin'
      };

      const payload = {
        user_id: currentUser.id || 1,
        plan_code: activePlan.code,
        payment_method: activeTab,
        card_details: activeTab === 'card' ? cardData : null
      };

      let resData = null;
      try {
        const res = await axios.post('/api/payments/process-checkout', payload, { headers })
          .catch(() => axios.post('http://localhost:5000/api/payments/process-checkout', payload, { headers }))
          .catch(() => axios.post('/api/auth/my-subscription', { plan_code: activePlan.code }, { headers }));
        resData = res?.data;
      } catch (apiErr) {
        console.warn('API fallback for checkout triggered:', apiErr);
      }

      // Generate transaction receipt ID
      const generatedTxn = resData?.transaction_id || `TXN_BEX_${Math.floor(100000000 + Math.random() * 900000000)}`;

      // Update local storage user session
      const updatedUser = resData?.user || {
        ...currentUser,
        subscription: {
          plan_code: activePlan.code,
          plan_name: activePlan.name,
          seats_limit: activePlan.code === 'free' ? 1 : activePlan.code === 'essentials' ? 3 : activePlan.code === 'standard' ? 5 : 10,
          contacts_limit: activePlan.code === 'free' ? 250 : activePlan.code === 'essentials' ? 50000 : activePlan.code === 'standard' ? 100000 : 1000000,
          emails_limit: activePlan.code === 'free' ? 1000 : activePlan.code === 'essentials' ? 5000 : activePlan.code === 'standard' ? 6000 : 150000,
          status: 'active'
        }
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('isAuthenticated', 'true');

      setSuccessReceipt({
        txnId: generatedTxn,
        planName: activePlan.name,
        amount: activePlan.priceText,
        seats: activePlan.seats,
        contacts: activePlan.contacts
      });

    } catch (err) {
      console.error('Payment checkout error:', err);
      customAlert({ 
        title: 'Payment Error', 
        message: err.response?.data?.error || 'Failed to process payment checkout. Please try again.', 
        type: 'danger' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (successReceipt) {
    return (
      <div className="min-h-screen bg-slate-900 py-12 px-4 flex items-center justify-center">
        <div className="bg-white max-w-lg w-full rounded-3xl p-8 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payment Authorized!</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Your subscription has been upgraded to <strong>{successReceipt.planName}</strong>.
          </p>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Transaction Reference:</span>
              <span className="font-mono font-bold text-slate-900">{successReceipt.txnId}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Active Plan Tier:</span>
              <span className="font-extrabold text-indigo-600">{successReceipt.planName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Seat Limit Granted:</span>
              <span className="font-bold text-slate-900">{successReceipt.seats}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Max Contact Capacity:</span>
              <span className="font-bold text-slate-900">{successReceipt.contacts}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition"
            >
              View My Profile
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <span>Go to Dashboard</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
          <Link to="/profile" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition">
            <ArrowLeft size={16} />
            <span>Back to Profile</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-full border border-emerald-800">
            <ShieldCheck size={16} />
            <span>256-Bit SSL Encrypted Dummy Gateway</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Order Summary & Plan Selector */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase text-indigo-400 tracking-wider">Order Summary</span>
                <span className="text-[11px] font-bold text-slate-400">Step 2 of 2</span>
              </div>

              <div className="space-y-3 mb-6">
                {Object.values(plansCatalog).map(p => {
                  const isSelected = selectedPlanCode === p.code;
                  return (
                    <div
                      key={p.code}
                      onClick={() => setSelectedPlanCode(p.code)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-950/40 shadow-md' 
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{p.name}</span>
                        <span className="text-xs font-extrabold text-indigo-400">{p.priceText}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                        <span>{p.seats}</span>
                        <span>{p.contacts}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Selected Tier:</span>
                  <span className="font-bold text-white">{activePlan.name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Billing Cycle:</span>
                  <span className="font-bold text-white">Monthly Subscription</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax & Fees (Dummy):</span>
                  <span className="font-bold text-emerald-400">Included ₹0</span>
                </div>
                <div className="pt-3 border-t border-slate-700/80 flex justify-between text-sm font-black text-white">
                  <span>Total Amount Due:</span>
                  <span className="text-base text-indigo-400">{activePlan.priceText}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Methods & Dummy Processing */}
          <div className="lg:col-span-7">
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl">
              
              <h3 className="text-lg font-black text-white mb-2 flex items-center">
                <CreditCard className="mr-2 text-indigo-400" size={20} />
                Select Payment Option
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Choose any preferred method below to simulate your instant subscription payment.
              </p>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-4 gap-2 mb-6 p-1 bg-slate-900 rounded-2xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('card')}
                  className={`py-2.5 px-2 text-xs font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    activeTab === 'card' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard size={15} />
                  <span>Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('upi')}
                  className={`py-2.5 px-2 text-xs font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    activeTab === 'upi' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode size={15} />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('netbanking')}
                  className={`py-2.5 px-2 text-xs font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    activeTab === 'netbanking' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 size={15} />
                  <span>Banking</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('wallet')}
                  className={`py-2.5 px-2 text-xs font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    activeTab === 'wallet' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wallet size={15} />
                  <span>Wallets</span>
                </button>
              </div>

              {/* Tab Contents */}
              <form onSubmit={handleProcessPayment} className="space-y-5">
                
                {/* CARD TAB */}
                {activeTab === 'card' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-2xl border border-slate-700">
                      <span className="text-xs font-bold text-slate-300">Quick Test Helper:</span>
                      <button
                        type="button"
                        onClick={fillDemoCard}
                        className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-black hover:bg-amber-500/30 transition flex items-center gap-1"
                      >
                        <Sparkles size={13} />
                        <span>Fill Demo Test Card</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardData.name}
                        onChange={(e) => setCardData({...cardData, name: e.target.value})}
                        required
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-indigo-500"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Card Number (Demo)</label>
                      <input
                        type="text"
                        value={cardData.number}
                        onChange={(e) => setCardData({...cardData, number: e.target.value})}
                        required
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-indigo-500"
                        placeholder="4242 4242 4242 4242"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Expiry Date</label>
                        <input
                          type="text"
                          value={cardData.exp}
                          onChange={(e) => setCardData({...cardData, exp: e.target.value})}
                          required
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-indigo-500"
                          placeholder="12/28"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">CVC / CVV</label>
                        <input
                          type="text"
                          value={cardData.cvc}
                          onChange={(e) => setCardData({...cardData, cvc: e.target.value})}
                          required
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-indigo-500"
                          placeholder="123"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* UPI TAB */}
                {activeTab === 'upi' && (
                  <div className="space-y-4 animate-in fade-in duration-200 text-center py-4">
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto border-4 border-indigo-500">
                      <QrCode size={120} className="text-slate-900" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">Scan QR Code via PhonePe / Google Pay / Paytm</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">VPA UPI ID: <strong className="text-indigo-400 font-mono">bexemail@upi</strong></p>
                    </div>
                  </div>
                )}

                {/* NET BANKING TAB */}
                {activeTab === 'netbanking' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-slate-300 mb-1">Select Bank</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-500"
                    >
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="State Bank of India">State Bank of India (SBI)</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    </select>
                  </div>
                )}

                {/* WALLET TAB */}
                {activeTab === 'wallet' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-slate-300 mb-1">Select Wallet</label>
                    <select
                      value={selectedWallet}
                      onChange={(e) => setSelectedWallet(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-500"
                    >
                      <option value="Google Pay">Google Pay</option>
                      <option value="PhonePe">PhonePe</option>
                      <option value="Paytm">Paytm</option>
                      <option value="Razorpay Simulator">Razorpay Simulator</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-900/40 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                >
                  <Lock size={18} />
                  <span>{loading ? 'Authorizing Payment...' : `Complete Payment (${activePlan.priceText})`}</span>
                </button>
              </form>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Checkout;
