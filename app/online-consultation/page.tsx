'use client';

import React, { useState } from 'react';
import Navbar from '@/components/sections/Navbar';
import Footer from '@/components/sections/Footer';
import { motion, AnimatePresence } from 'motion/react';
import { Video, ShieldCheck, FileText, UploadCloud, RefreshCw, Calendar, CheckCircle2, ChevronRight, User, Phone, Mail, MapPin } from 'lucide-react';
import { siteConfig } from '@/config/site';

export default function OnlineConsultationPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: 'Male',
    city: '',
    state: '',
    preferredDate: '',
    preferredTimeSlot: '',
    chiefComplaint: '',
    symptomsDuration: '',
    previousMedicalHistory: '',
    currentMedicines: '',
    knownAllergies: '',
    preferredLanguage: 'English'
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Dummy file state for demo
  const [filesSelected, setFilesSelected] = useState(0);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Are you online?');
      }

      // 1. Create order
      const orderRes = await fetch('/api/telemedicine/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt: formData.phone })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok && !orderData.isMock) throw new Error(orderData.error || 'Order creation failed');

      if (orderData.isMock) {
        const verifyRes = await fetch('/api/telemedicine/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: 'mock_payment',
            razorpay_signature: 'mock_signature',
            appointmentData: formData,
            isMock: true
          })
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');

        setSuccess(true);
        setLoading(false);
        return;
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Skin Hub Clinic',
        description: 'Online Telemedicine Consultation Fee',
        image: '/favicon.ico',
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            setLoading(true);
            // 3. Verify Payment & Save Appointment
            const verifyRes = await fetch('/api/telemedicine/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                appointmentData: formData
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');

            setSuccess(true);
          } catch (err: any) {
            setError(err.message || 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone
        },
        theme: {
          color: '#0d9488' // primary teal
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        setError('Payment failed or cancelled.');
        setLoading(false);
      });
      paymentObject.open();

    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const benefits = [
    { icon: <Video className="w-6 h-6" />, title: 'Consult from Home' },
    { icon: <ShieldCheck className="w-6 h-6" />, title: 'Secure Video Meeting' },
    { icon: <FileText className="w-6 h-6" />, title: 'Digital Prescription' },
    { icon: <UploadCloud className="w-6 h-6" />, title: 'Upload Reports' },
    { icon: <RefreshCw className="w-6 h-6" />, title: 'Follow-up Support' }
  ];

  return (
    <main className="min-h-screen bg-surface selection:bg-primary/20 selection:text-primary">
      <Navbar />

      {/* Hero Landing Section */}
      <section className="pt-24 sm:pt-32 pb-20 bg-gradient-to-br from-primary/5 via-white to-emerald-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center px-4 py-1.5 rounded-full bg-white border border-gray-200 text-primary font-sans text-xs font-bold uppercase tracking-widest mb-6 shadow-sm"
          >
            <Video className="w-4 h-4 mr-2" /> Dedicated Telemedicine System
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-tight mb-6"
          >
            Expert Dermatology <br className="hidden sm:block"/> <span className="text-primary italic">from anywhere.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-sans text-lg text-gray-600 max-w-2xl mx-auto mb-12"
          >
            Skip the travel. Consult with {siteConfig.doctorName} directly from your smartphone or computer with our secure online consultation platform.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 sm:gap-6"
          >
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100">
                <div className="text-primary">{b.icon}</div>
                <span className="font-sans text-sm font-bold text-gray-800">{b.title}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works & Form Section */}
      <section className="py-20 relative z-20 -mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Col: How it works */}
            <div className="lg:col-span-5 space-y-12">
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50">
                <h3 className="font-playfair text-2xl font-bold text-gray-900 mb-8">How Online Consultation Works</h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                  
                  {[
                    { title: "Book Consultation", desc: "Fill out the detailed request form." },
                    { title: "Clinic Review", desc: "Staff reviews and confirms your slot." },
                    { title: "Confirmation Email", desc: "Receive email with instructions." },
                    { title: "Questionnaire", desc: "Complete Pre-Consultation form online." },
                    { title: "Video Meeting", desc: "Join secure video call with doctor." },
                    { title: "Prescription", desc: "Get digital PDF & daily routine tracking." },
                  ].map((step, i) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-primary text-white font-bold text-sm shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        {i + 1}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-surface p-4 rounded-2xl border border-gray-100 shadow-sm ml-4 md:ml-0 md:group-odd:pr-8 md:group-even:pl-8">
                        <h4 className="font-bold text-gray-900 text-sm mb-1">{step.title}</h4>
                        <p className="text-xs text-gray-500 font-sans">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                  
                </div>
              </div>
            </div>

            {/* Right Col: Form */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 border border-gray-100 shadow-2xl shadow-gray-200/50">
                
                <AnimatePresence mode="wait">
                  {success ? (
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-20"
                    >
                      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50">
                        <CheckCircle2 className="w-12 h-12" />
                      </div>
                      <h3 className="font-playfair text-3xl font-black text-gray-900 mb-4">Request Submitted Successfully</h3>
                      <p className="font-sans text-gray-600 text-base leading-relaxed max-w-md mx-auto mb-8">
                        Our clinic staff will review your request shortly. You will receive a confirmation email with instructions on how to complete the pre-consultation questionnaire.
                      </p>
                      <button 
                        onClick={() => window.location.href = '/'}
                        className="px-8 py-4 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                      >
                        Return Home
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="mb-8">
                        <h2 className="font-playfair text-3xl font-bold text-gray-900 mb-2">Book Your Slot</h2>
                        <p className="text-gray-500 font-sans text-sm">Please provide accurate details. Do not submit payment until confirmed.</p>
                      </div>

                      {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl flex items-center">
                          {error}
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Personal Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Full Name *</label>
                            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="John Doe" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Mobile Number *</label>
                            <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="+91 00000 00000" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Email Address *</label>
                            <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="john@example.com" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Age *</label>
                              <input required type="number" name="age" value={formData.age} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="25" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Gender *</label>
                              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none">
                                <option>Male</option><option>Female</option><option>Other</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">City *</label>
                            <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Mumbai" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">State *</label>
                            <input required type="text" name="state" value={formData.state} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Maharashtra" />
                          </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Medical Context */}
                        <div className="space-y-1.5">
                          <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Chief Complaint *</label>
                          <textarea required name="chiefComplaint" value={formData.chiefComplaint} onChange={handleChange} rows={2} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Briefly describe your main skin or hair issue..." />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Symptoms Duration *</label>
                            <input required type="text" name="symptomsDuration" value={formData.symptomsDuration} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g., 2 weeks, 3 months" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Preferred Language</label>
                            <select name="preferredLanguage" value={formData.preferredLanguage} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none">
                              <option>English</option><option>Hindi</option>
                            </select>
                          </div>
                        </div>

                        {/* Scheduling */}
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-5">
                          <h4 className="font-bold text-gray-900 text-sm flex items-center"><Calendar className="w-4 h-4 mr-2 text-primary" /> Scheduling Preference</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Preferred Date *</label>
                              <input required type="date" name="preferredDate" value={formData.preferredDate} onChange={handleChange} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Preferred Time Slot *</label>
                              <select required name="preferredTimeSlot" value={formData.preferredTimeSlot} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none">
                                <option value="">Select Time</option>
                                <option>Morning (10 AM - 1 PM)</option>
                                <option>Afternoon (2 PM - 5 PM)</option>
                                <option>Evening (6 PM - 9 PM)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <button 
                          type="submit"
                          disabled={loading}
                          className="w-full py-4 bg-primary hover:brightness-110 text-white font-bold rounded-xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                        >
                          {loading ? 'Submitting Request...' : 'Submit Request'}
                          {!loading && <ChevronRight className="w-5 h-5" />}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
