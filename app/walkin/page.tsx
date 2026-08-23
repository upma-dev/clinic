'use client';

import React, { useState } from 'react';
import Navbar from '@/components/sections/Navbar';
import Footer from '@/components/sections/Footer';
import { User, Phone, Calendar, AlertCircle, CheckCircle, ArrowRight, Activity, Stethoscope } from 'lucide-react';

export default function WalkInRegistration() {
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    age: '',
    gender: 'Male',
    visitType: 'New Consultation',
    problem: '',
    symptomsDuration: '',
    medicalReports: '',
    previousVisitDate: '',
    emergencyReason: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isClosed, setIsClosed] = useState(false);

  React.useEffect(() => {
    // Enforce business hours: 11:00 AM to 7:00 PM (19:00)
    // Also closed on Sundays (0)
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    
    if (day === 0 || hour < 11 || hour >= 19) {
      setIsClosed(true);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic mobile validation
    if (formData.mobile.length < 10) {
      setError('Please enter a valid mobile number.');
      setLoading(false);
      return;
    }
    
    if (parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
      setError('Please enter a valid age.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface flex flex-col">
      <Navbar />
      
      <div className="flex-grow py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-10">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-3">
              <Activity className="w-3.5 h-3.5 mr-1" />
              Clinic Walk-in
            </span>
            <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Walk-in Patient Registration
            </h1>
            <p className="font-sans text-gray-600 mt-3 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Register yourself before arriving at the clinic. Our staff will review your request and send you a confirmation.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden p-6 sm:p-10 relative">
            
            {isClosed ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="font-playfair text-2xl font-bold text-gray-900 mb-4">Registration Closed</h3>
                <p className="font-sans text-gray-600 text-base leading-relaxed mb-4 max-w-md mx-auto">
                  Walk-in registration is currently closed. Our registration hours are <strong>11:00 AM to 7:00 PM, Monday to Saturday</strong>. 
                </p>
                <p className="font-sans text-gray-600 text-sm leading-relaxed mb-4 max-w-md mx-auto">
                  Please visit the clinic during these hours or book an online appointment.
                </p>
              </div>
            ) : success ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="font-playfair text-2xl font-bold text-gray-900 mb-4">Request Submitted Successfully</h3>
                
                <div className="bg-surface border-2 border-primary/20 rounded-2xl p-6 text-left max-w-lg mx-auto">
                  <p className="font-sans text-gray-700 text-base leading-relaxed mb-4 font-semibold text-center">
                    Your request has been submitted successfully.
                  </p>
                  <p className="font-sans text-gray-600 text-sm leading-relaxed mb-4 text-center">
                    Our staff will review your request and send you a confirmation shortly.
                  </p>
                  <p className="font-sans text-rose-600 text-sm font-bold text-center uppercase tracking-wider">
                    Please wait for confirmation before visiting the clinic.
                  </p>
                </div>

                <button 
                  onClick={() => {
                    setSuccess(false);
                    setFormData({ ...formData, fullName: '', problem: '' });
                  }}
                  className="mt-8 text-sm font-bold text-primary hover:underline"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {error && (
                  <div className="p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl mb-6 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* FULL NAME */}
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-bold text-gray-700 uppercase tracking-wider">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        required
                        type="text" 
                        name="fullName"
                        value={formData.fullName} 
                        onChange={handleChange} 
                        className="w-full pl-12 pr-4 py-3.5 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  {/* MOBILE NUMBER */}
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-bold text-gray-700 uppercase tracking-wider">Mobile Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        required
                        type="tel" 
                        name="mobile"
                        value={formData.mobile} 
                        onChange={handleChange} 
                        className="w-full pl-12 pr-4 py-3.5 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                        placeholder="+91 90000 00000"
                      />
                    </div>
                  </div>

                  {/* AGE */}
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-bold text-gray-700 uppercase tracking-wider">Age *</label>
                    <input 
                      required
                      type="number" 
                      name="age"
                      min="1" max="120"
                      value={formData.age} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3.5 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                      placeholder="e.g. 28"
                    />
                  </div>

                  {/* GENDER */}
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-bold text-gray-700 uppercase tracking-wider">Gender *</label>
                    <select 
                      required
                      name="gender"
                      value={formData.gender} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3.5 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <hr className="border-gray-100 my-6" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* VISIT TYPE */}
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-bold text-gray-700 uppercase tracking-wider">Visit Type *</label>
                    <div className="relative">
                      <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select 
                        required
                        name="visitType"
                        value={formData.visitType} 
                        onChange={handleChange} 
                        className={`w-full pl-12 pr-4 py-3.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold appearance-none ${
                          formData.visitType === 'Emergency' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-surface border-gray-200'
                        }`}
                      >
                        <option value="New Consultation">New Consultation</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Emergency">Emergency</option>
                      </select>
                    </div>
                  </div>

                  {/* PREVIOUS VISIT DATE (Conditional) */}
                  {formData.visitType === 'Follow-up' && (
                    <div className="space-y-2">
                      <label className="font-sans text-xs font-bold text-gray-700 uppercase tracking-wider">Previous Visit Date *</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          required
                          type="date" 
                          name="previousVisitDate"
                          value={formData.previousVisitDate} 
                          onChange={handleChange} 
                          className="w-full pl-12 pr-4 py-3.5 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {/* EMERGENCY REASON (Conditional) */}
                  {formData.visitType === 'Emergency' && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="font-sans text-xs font-bold text-red-700 uppercase tracking-wider flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        Emergency Reason *
                      </label>
                      <textarea 
                        required
                        name="emergencyReason"
                        rows={2}
                        value={formData.emergencyReason} 
                        onChange={handleChange} 
                        className="w-full px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-semibold placeholder:text-red-300"
                        placeholder="Briefly describe the emergency..."
                      />
                    </div>
                  )}
                </div>

                {/* PROBLEM */}
                <div className="space-y-2">
                  <label className="font-sans text-xs font-bold text-gray-700 uppercase tracking-wider">Chief Complaint / Symptoms *</label>
                  <textarea 
                    required
                    name="problem"
                    rows={3}
                    value={formData.problem} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3.5 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                    placeholder="Describe your current symptoms or reason for visit..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* SYMPTOMS DURATION */}
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-bold text-gray-700 uppercase tracking-wider">Symptoms Duration *</label>
                    <input 
                      required
                      type="text" 
                      name="symptomsDuration"
                      value={formData.symptomsDuration} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3.5 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                      placeholder="e.g. 3 days, 2 months"
                    />
                  </div>

                  {/* MEDICAL REPORTS */}
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-bold text-gray-700 uppercase tracking-wider">Medical Reports (Optional)</label>
                    <input 
                      type="text" 
                      name="medicalReports"
                      value={formData.medicalReports} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3.5 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                      placeholder="Google Drive link or describe"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-primary text-white rounded-xl font-sans font-bold text-base hover:brightness-90 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-primary/20 hover:-translate-y-1"
                  >
                    {loading ? 'Submitting Request...' : 'Submit Walk-in Request'}
                    {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
                  </button>
                  <p className="text-center font-sans text-xs text-gray-500 font-semibold mt-4">
                    By submitting, you agree to wait for staff confirmation before arriving.
                  </p>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
