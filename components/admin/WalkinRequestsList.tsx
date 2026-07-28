'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, Clock, Search, Filter, Bell } from 'lucide-react';
import type { WalkInRequest } from '@/lib/db/walkin';

type Tab = 'Pending' | 'Emergency' | 'Accepted' | 'Completed' | 'Rejected';

export default function WalkinRequestsList() {
  const [requests, setRequests] = useState<WalkInRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Pending');
  const [search, setSearch] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Summary counts
  const [counts, setCounts] = useState({ pending: 0, emergency: 0, accepted: 0 });
  const [toastMsg, setToastMsg] = useState('');
  const prevTotalRef = React.useRef(0);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      // Determine filter based on tab
      let statusFilter = '';
      let visitTypeFilter = '';
      
      if (activeTab === 'Pending') {
        statusFilter = 'Pending';
      } else if (activeTab === 'Emergency') {
        statusFilter = 'Pending';
        visitTypeFilter = 'Emergency';
      } else if (activeTab === 'Accepted') {
        statusFilter = 'Accepted';
      } else if (activeTab === 'Completed') {
        statusFilter = 'Completed';
      } else if (activeTab === 'Rejected') {
        statusFilter = 'Rejected';
      }

      const query = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(visitTypeFilter && { visitType: visitTypeFilter }),
        ...(search && { search })
      });

      const res = await fetch(`/api/staff/walkin?${query}`);
      const data = await res.json();
      
      if (res.ok) {
        // Priority Sorting: Emergency > Follow-up > New Consultation
        const sortedData = data.data.sort((a: WalkInRequest, b: WalkInRequest) => {
          const pA = a.visitType === 'Emergency' ? 3 : a.visitType === 'Follow-up' ? 2 : 1;
          const pB = b.visitType === 'Emergency' ? 3 : b.visitType === 'Follow-up' ? 2 : 1;
          return pB - pA;
        });
        
        setRequests(sortedData);
        setTotal(data.total);
        
        // Also fetch raw counts (simplified approach: we should have a specific API for counts, 
        // but for now we'll just show the total from the current filtered query on the active tab)
        if (activeTab === 'Pending' && !search) {
          setCounts(prev => ({ ...prev, pending: data.total }));
          if (prevTotalRef.current > 0 && data.total > prevTotalRef.current) {
            setToastMsg('🔔 New Walk-in Request Arrived!');
            setTimeout(() => setToastMsg(''), 5000);
            
            // Try to play sound
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(e => console.log('Audio play blocked'));
            } catch(e) {}
          }
          prevTotalRef.current = data.total;
        }
        if (activeTab === 'Emergency' && !search) setCounts(prev => ({ ...prev, emergency: data.total }));
        if (activeTab === 'Accepted' && !search) setCounts(prev => ({ ...prev, accepted: data.total }));
      }
    } catch (error) {
      console.error('Failed to fetch requests', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, search]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // Polling
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleAction = async (id: string, action: 'accept' | 'reject' | 'complete') => {
    try {
      const res = await fetch(`/api/staff/walkin/${id}/${action}`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchRequests();
      } else {
        const error = await res.json();
        alert(error.error || `Failed to ${action} request`);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  return (
    <div className="space-y-4 pb-10 relative">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-50 bg-white border border-primary/20 shadow-xl rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Bell className="w-5 h-5 animate-[ring_2s_ease-in-out_infinite]" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{toastMsg}</p>
            <p className="text-[10px] text-gray-500">Please review in Pending tab.</p>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by Name or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark">
          Search
        </button>
      </form>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto whitespace-nowrap hide-scrollbar">
        {(['Pending', 'Emergency', 'Accepted', 'Completed', 'Rejected'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); setPage(1); }}
            className={`py-2 px-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === t 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
            {t === 'Pending' && <span className="ml-2 bg-orange-100 text-orange-700 py-0.5 px-2 rounded-full text-[10px]">{counts.pending > 0 ? counts.pending : ''}</span>}
            {t === 'Emergency' && <span className="ml-2 bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-[10px]">{counts.emergency > 0 ? counts.emergency : ''}</span>}
            {t === 'Accepted' && <span className="ml-2 bg-emerald-100 text-emerald-700 py-0.5 px-2 rounded-full text-[10px]">{counts.accepted > 0 ? counts.accepted : ''}</span>}
          </button>
        ))}
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {loading && requests.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-4 bg-white rounded-xl border border-gray-200 text-center text-sm text-gray-500">
            No {activeTab.toLowerCase()} requests found.
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-playfair font-bold text-gray-900">{req.fullName} <span className="text-sm font-sans text-gray-500">({req.age}, {req.gender.charAt(0)})</span></h4>
                  <p className="text-xs text-gray-500 font-semibold">{req.mobile}</p>
                </div>
                <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                  req.visitType === 'Emergency' ? 'bg-red-100 text-red-700' :
                  req.visitType === 'Follow-up' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {req.visitType}
                </div>
              </div>
              
              <div className="bg-surface rounded-lg p-3 my-3">
                <p className="text-xs text-gray-700"><span className="font-bold">Problem:</span> {req.problem}</p>
                {req.visitType === 'Follow-up' && req.previousVisitDate && (
                  <p className="text-xs text-gray-700 mt-1"><span className="font-bold">Prev Visit:</span> {req.previousVisitDate}</p>
                )}
                {req.visitType === 'Emergency' && req.emergencyReason && (
                  <p className="text-xs text-red-700 mt-1"><span className="font-bold">Reason:</span> {req.emergencyReason}</p>
                )}
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="text-[10px] text-gray-400 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                
                {req.status === 'Pending' && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleAction(req.id, 'reject')}
                      className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, 'accept')}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 flex items-center"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Accept
                    </button>
                  </div>
                )}
                
                {req.status === 'Accepted' && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-emerald-600 flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Accepted
                    </span>
                    <button 
                      onClick={() => handleAction(req.id, 'complete')}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary/90"
                    >
                      Mark Completed
                    </button>
                  </div>
                )}
                
                {req.status === 'Completed' && (
                  <span className="text-xs font-bold text-gray-500">
                    Completed
                  </span>
                )}
                
                {req.status === 'Rejected' && (
                  <span className="text-xs font-bold text-rose-500">
                    Rejected
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {total > pageSize && (
        <div className="flex items-center justify-between pt-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="text-xs font-bold text-gray-600 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">Page {page}</span>
          <button 
            disabled={page * pageSize >= total}
            onClick={() => setPage(p => p + 1)}
            className="text-xs font-bold text-primary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
