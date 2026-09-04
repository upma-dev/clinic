'use client';

import React, { useState, useMemo } from 'react';
import type { Booking, BookingStatus, PaymentStatus, ClinicSettings } from '@/lib/types';
import {
  Calendar, Clock, Users, CheckCircle2, XCircle, AlertCircle,
  Search, Filter, ChevronDown, ChevronRight, Download, RefreshCw,
  ArrowUpDown, Phone, MessageCircle, FileText, DollarSign, Activity,
  ChevronLeft, LayoutList, CalendarDays, Eye, Sparkles, UserX, UserCheck, Mail
} from 'lucide-react';

interface DoctorBookingHistoryProps {
  bookings: Booking[];
  settings?: ClinicSettings | null;
  onRefresh: () => void;
  onAction?: (
    id: string,
    action: string,
    nextScheduleDate?: string,
    rescheduleDate?: string,
    rescheduleTime?: string,
    rescheduleReason?: string,
    paymentMethod?: string
  ) => Promise<any> | void;
}

type QuickRange = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'custom';
type StatusFilter = 'all' | 'completed' | 'skipped' | 'cancelled' | 'confirmed' | 'pending';

export default function DoctorBookingHistory({
  bookings,
  settings,
  onRefresh,
  onAction,
}: DoctorBookingHistoryProps) {
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(settings || null);

  React.useEffect(() => {
    if (settings) {
      setClinicSettings(settings);
    } else {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => { if (data) setClinicSettings(data); })
        .catch(() => {});
    }
  }, [settings]);
  const [quickRange, setQuickRange] = useState<QuickRange>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const hasCaseFile = (b: any) => {
    if (!b) return false;
    const hasPdf = Boolean(b.prescriptionPdfBase64 && String(b.prescriptionPdfBase64).length > 50);
    const hasMeds = Boolean(
      b.prescriptionData && (
        (typeof b.prescriptionData.medicines === 'string' && b.prescriptionData.medicines.trim().length > 0) ||
        (typeof b.prescriptionData.advice === 'string' && b.prescriptionData.advice.trim().length > 0)
      )
    );
    return Boolean(
      b.hasCaseFile === true ||
      b.prescriptionSent === true ||
      b.caseFileSent === true ||
      hasPdf ||
      hasMeds
    );
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [dateStatusFilter, setDateStatusFilter] = useState<StatusFilter>('all');
  const [viewingPatientDetails, setViewingPatientDetails] = useState<Booking | null>(null);
  const [jumpDate, setJumpDate] = useState<string>('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Format date helper for human-readable display
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const day = parts[2].padStart(2, '0');
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const year = parts[0];
        return `${day} ${month} ${year}`;
      }
    } catch {}
    return dateStr;
  };

  // Determine clinic opening date (earliest historical date)
  const clinicOpeningDate = useMemo(() => {
    if ((clinicSettings as any)?.clinicOpeningDate) {
      return (clinicSettings as any).clinicOpeningDate;
    }
    const validDates = bookings
      .map(b => b.date)
      .filter(d => Boolean(d) && /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    return validDates.length > 0 ? validDates[0] : '2026-08-01';
  }, [bookings, clinicSettings]);

  // Compute date range boundary strings based on quickRange
  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (jumpDate) {
      return { rangeStart: jumpDate, rangeEnd: jumpDate };
    }

    switch (quickRange) {
      case 'today':
        return { rangeStart: today, rangeEnd: today };
      case 'yesterday':
        return { rangeStart: yesterdayStr, rangeEnd: yesterdayStr };
      case '7days': {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 6);
        return { rangeStart: d7.toISOString().split('T')[0], rangeEnd: today };
      }
      case '30days': {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 29);
        return { rangeStart: d30.toISOString().split('T')[0], rangeEnd: today };
      }
      case 'thisMonth': {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        return { rangeStart: firstOfMonth, rangeEnd: today };
      }
      case 'custom':
        return {
          rangeStart: customStartDate || clinicOpeningDate,
          rangeEnd: customEndDate || today,
        };
      case 'all':
      default:
        return { rangeStart: clinicOpeningDate, rangeEnd: today };
    }
  }, [quickRange, jumpDate, yesterdayStr, customStartDate, customEndDate, clinicOpeningDate]);

  // Filter bookings according to range and global search
  const filteredBookings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return bookings.filter((b) => {
      // 1. Block any future date (only past up to today)
      const bDate = b.date || '';
      if (bDate > todayStr) {
        return false;
      }
      if (bDate < rangeStart || bDate > rangeEnd) {
        return false;
      }

      // 2. Search Query Check
      if (q) {
        const matchName = b.name?.toLowerCase().includes(q);
        const matchPhone = b.phone?.includes(q);
        const matchService = b.service?.toLowerCase().includes(q);
        const matchId = b.id?.toLowerCase().includes(q);
        const matchDate = b.date?.includes(q);
        const matchStatus = b.status?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchService && !matchId && !matchDate && !matchStatus) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, rangeStart, rangeEnd, searchQuery]);

  // Helper to categorize status
  const isCompleted = (status?: string) => {
    const s = String(status || '').toLowerCase().trim();
    return s === 'completed';
  };

  const isSkipped = (status?: string) => {
    const s = String(status || '').toLowerCase().trim();
    return s === 'no-show' || s === 'no show' || s === 'skipped';
  };

  const isCancelled = (status?: string) => {
    const s = String(status || '').toLowerCase().trim();
    return s === 'cancelled';
  };

  const isConfirmedOrArrived = (status?: string) => {
    const s = String(status || '').toLowerCase().trim();
    return s === 'confirmed' || s === 'booked' || s === 'checked-in' || s === 'checked in' || s === 'arrived';
  };

  const isPending = (status?: string) => {
    const s = String(status || '').toLowerCase().trim();
    return s === 'pending';
  };

  // Group filtered bookings by date
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();

    for (const b of filteredBookings) {
      const dateKey = b.date || 'Unknown';
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(b);
    }

    // Sort dates descending (newest first)
    const sortedEntries = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));

    return sortedEntries.map(([date, items]) => {
      // Sort items within day by time or creation
      const sortedItems = [...items].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      const total = sortedItems.length;
      const completed = sortedItems.filter(b => isCompleted(b.status)).length;
      const skipped = sortedItems.filter(b => isSkipped(b.status)).length;
      const cancelled = sortedItems.filter(b => isCancelled(b.status)).length;
      const confirmed = sortedItems.filter(b => isConfirmedOrArrived(b.status)).length;
      const pending = sortedItems.filter(b => isPending(b.status)).length;

      const revenue = sortedItems.reduce((acc, b) => {
        if (b.paymentStatus === 'paid' || b.paymentStatus === 'Paid') {
          return acc + (b.amountPaid || b.amount || 500);
        }
        return acc;
      }, 0);

      return {
        date,
        items: sortedItems,
        total,
        completed,
        skipped,
        cancelled,
        confirmed,
        pending,
        revenue,
      };
    });
  }, [filteredBookings]);

  // Overall metrics across filtered bookings
  const overallMetrics = useMemo(() => {
    const total = filteredBookings.length;
    const completed = filteredBookings.filter(b => isCompleted(b.status)).length;
    const skipped = filteredBookings.filter(b => isSkipped(b.status)).length;
    const cancelled = filteredBookings.filter(b => isCancelled(b.status)).length;
    const confirmed = filteredBookings.filter(b => isConfirmedOrArrived(b.status)).length;
    const pending = filteredBookings.filter(b => isPending(b.status)).length;

    const revenue = filteredBookings.reduce((acc, b) => {
      if (b.paymentStatus === 'paid' || b.paymentStatus === 'Paid') {
        return acc + (b.amountPaid || b.amount || 500);
      }
      return acc;
    }, 0);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, skipped, cancelled, confirmed, pending, revenue, completionRate };
  }, [filteredBookings]);

  // Date label formatting helper
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr || dateStr === 'Unknown') return { formatted: 'Unknown Date', weekday: '', isToday: false, isYesterday: false };
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const day = parts[2];
        const year = parts[0];
        return {
          formatted: `${day} ${month} ${year}`,
          weekday: dayOfWeek,
          isToday: dateStr === todayStr,
          isYesterday: dateStr === yesterdayStr,
        };
      }
    } catch { }
    return { formatted: dateStr, weekday: '', isToday: false, isYesterday: false };
  };

  // Status Badge Component
  const renderStatusBadge = (status?: string) => {
    const s = String(status || '').toLowerCase().trim();
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Treatment Completed
        </span>
      );
    }
    if (s === 'no-show' || s === 'no show' || s === 'skipped') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-300">
          <UserX className="w-3 h-3 text-purple-600" />
          Skipped / No-Show
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="w-3 h-3 text-rose-600" />
          Cancelled
        </span>
      );
    }
    if (s === 'arrived' || s === 'checked-in' || s === 'checked in') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">
          <UserCheck className="w-3 h-3 text-blue-600" />
          Arrived / Checked In
        </span>
      );
    }
    if (s === 'confirmed' || s === 'booked') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-teal-100 text-teal-800 border border-teal-300">
          <Clock className="w-3 h-3 text-teal-600" />
          Confirmed Slot
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
        <AlertCircle className="w-3 h-3 text-amber-600" />
        Pending
      </span>
    );
  };

  // Payment Badge Component
  const renderPaymentBadge = (b: Booking) => {
    const isPaid = String(b.paymentStatus || '').toLowerCase() === 'paid';
    const amount = b.amountPaid || b.amount || (isPaid ? 500 : 0);

    if (isPaid) {
      return (
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold uppercase tracking-wider w-fit">
            Paid
          </span>
          <span className="text-[11px] font-bold text-gray-800 mt-0.5">₹{amount}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold uppercase tracking-wider w-fit">
          Unpaid
        </span>
        <span className="text-[10px] text-gray-500 font-semibold mt-0.5">₹{amount} Due</span>
      </div>
    );
  };

  // Export PDF Report for a specific date or full filtered list
  const exportReportPDF = (targetDate?: string) => {
    const exportList = targetDate
      ? filteredBookings.filter(b => b.date === targetDate)
      : filteredBookings;

    if (exportList.length === 0) {
      alert('No booking records to export as PDF.');
      return;
    }

    const total = exportList.length;
    const completed = exportList.filter(b => b.status === 'completed').length;
    const skipped = exportList.filter(b => b.status === 'no-show' || b.status === 'No Show' || (b as any).status === 'skipped').length;
    const cancelled = exportList.filter(b => b.status === 'cancelled').length;
    const confirmed = exportList.filter(b => b.status === 'arrived' || b.status === 'confirmed' || b.status === 'checked-in').length;
    const pending = exportList.filter(b => b.status === 'pending').length;
    const revenue = exportList.reduce((acc, b) => {
      if (b.paymentStatus === 'paid' || b.paymentStatus === 'Paid') return acc + (b.amountPaid || b.amount || 500);
      return acc;
    }, 0);

    const formatDisplayDate = (dateStr?: string) => {
      if (!dateStr) return '';
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          const day = parts[2].padStart(2, '0');
          const month = d.toLocaleDateString('en-US', { month: 'short' });
          const year = parts[0];
          return `${day} ${month} ${year}`;
        }
      } catch {}
      return dateStr;
    };

    const clinicName = clinicSettings?.clinicName || 'Dr. Prateek Tiwari\'s Skin Hub Clinic';
    const clinicAddress = clinicSettings?.clinicAddress || 'B-23, Bada Shopping Complex, Opposite Water Tank, Rishi Nagar, Ujjain, Madhya Pradesh 456010';
    const clinicPhone = clinicSettings?.clinicPhone || '+91 98270 42111';

    const dateScopeLabel = targetDate ? ('Daily Report: ' + formatDisplayDate(targetDate)) : ('Filtered Period Report (' + quickRange.toUpperCase() + ')');
    const generatedAt = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to open the PDF report window.');
      return;
    }

    const rowsHtml = exportList.map((bk, idx) => {
      const isPaid = String(bk.paymentStatus || '').toLowerCase() === 'paid';
      const statusStr = String(bk.status || '').toLowerCase();
      let statusBadgeClass = 'badge-pending';
      let statusLabel: string = String(bk.status || 'Pending');

      if (statusStr === 'completed') {
        statusBadgeClass = 'badge-completed';
        statusLabel = 'Completed';
      } else if (statusStr === 'no-show' || statusStr === 'no show' || (bk as any).status === 'skipped') {
        statusBadgeClass = 'badge-skipped';
        statusLabel = 'Skipped';
      } else if (statusStr === 'cancelled') {
        statusBadgeClass = 'badge-cancelled';
        statusLabel = 'Cancelled';
      } else if (statusStr === 'confirmed' || statusStr === 'arrived' || statusStr === 'checked-in') {
        statusBadgeClass = 'badge-confirmed';
        statusLabel = 'Confirmed';
      }

      const notes = bk.rescheduleReason || bk.cancellationReason || bk.appointmentNotes || '-';
      const token = bk.tokenNumber ? ('#' + bk.tokenNumber) : ('#' + (idx + 1));
      const payLabel = isPaid ? ('Paid ₹' + (bk.amountPaid || bk.amount || 500)) : 'Unpaid';
      const channelLabel = bk.source === 'walk-in' ? 'Walk-in' : (bk.bookingType === 'online' ? 'Online' : 'Clinic');
      const formattedRowDate = formatDisplayDate(bk.date);

      return '<tr>' +
        '<td style="font-weight:700;color:#0f766e;">' + token + '</td>' +
        '<td><strong>' + (bk.time || '-') + '</strong><div style="font-size:10px;color:#64748b;">' + formattedRowDate + '</div></td>' +
        '<td><strong>' + (bk.name || 'Anonymous') + '</strong><div style="font-size:10px;color:#64748b;">' + (bk.phone || '-') + '</div></td>' +
        '<td>' + (bk.service || 'Consultation') + '</td>' +
        '<td><span style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;">' + channelLabel + '</span></td>' +
        '<td><span class="badge ' + statusBadgeClass + '">' + statusLabel + '</span></td>' +
        '<td style="text-align:right;"><span class="badge ' + (isPaid ? 'badge-paid' : 'badge-unpaid') + '">' + payLabel + '</span></td>' +
        '<td style="font-size:10px;color:#64748b;max-width:180px;">' + notes + '</td>' +
      '</tr>';
    }).join('');

    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const filename = 'SkinHub_Bookings_' + (targetDate || 'Report') + '_' + Date.now() + '.pdf';

    const htmlContent = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '  <meta charset="UTF-8" />',
      '  <title>Skin Hub - Booking Report ' + (targetDate ? formatDisplayDate(targetDate) : 'Period') + '</title>',
      '  <style>',
      '    * { box-sizing: border-box; margin: 0; padding: 0; }',
      '    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1e293b; background: #f8fafc; padding: 24px; font-size: 11px; }',
      '    .no-print { max-width: 950px; margin: 0 auto 20px auto; display: flex; justify-content: space-between; align-items: center; background: #0f766e; color: white; padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 14px rgba(15, 118, 110, 0.25); }',
      '    .no-print button { cursor: pointer; font-weight: 700; font-size: 12px; padding: 8px 16px; border-radius: 8px; border: none; transition: all 0.2s; }',
      '    .btn-print { background: #ffffff; color: #0f766e; }',
      '    .btn-print:hover { background: #f0fdfa; }',
      '    .btn-download { background: #ccfbf1; color: #115e59; margin-left: 8px; }',
      '    .btn-download:hover { background: #99f6e4; }',
      '    .btn-close { background: rgba(255,255,255,0.2); color: white; margin-left: 8px; }',
      '    .btn-close:hover { background: rgba(255,255,255,0.3); }',
      '    .report-sheet { max-width: 950px; margin: 0 auto; background: #ffffff; padding: 32px 36px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }',
      '    @media print {',
      '      body { background: #ffffff; padding: 0; font-size: 10px; }',
      '      .no-print { display: none !important; }',
      '      .report-sheet { border: none; box-shadow: none; padding: 0; max-width: 100%; }',
      '      @page { size: A4 landscape; margin: 10mm; }',
      '      tr { page-break-inside: avoid; }',
      '    }',
      '    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 2px solid #0f766e; margin-bottom: 20px; }',
      '    .clinic-brand h1 { font-size: 22px; font-weight: 900; color: #0f766e; letter-spacing: -0.5px; margin-bottom: 2px; }',
      '    .clinic-brand .doctor-title { font-size: 13px; font-weight: 800; color: #1e293b; }',
      '    .clinic-brand .sub { font-size: 11px; color: #64748b; margin-top: 2px; }',
      '    .report-meta { text-align: right; }',
      '    .report-badge { display: inline-block; background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; margin-bottom: 6px; }',
      '    .report-meta .date-text { font-size: 14px; font-weight: 800; color: #0f172a; }',
      '    .report-meta .gen-time { font-size: 10px; color: #64748b; margin-top: 3px; }',
      '    .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 22px; }',
      '    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; text-align: center; }',
      '    .stat-card.completed { background: #f0fdfa; border-color: #99f6e4; }',
      '    .stat-card.skipped { background: #faf5ff; border-color: #e9d5ff; }',
      '    .stat-card.cancelled { background: #fff1f2; border-color: #fecdd3; }',
      '    .stat-card.revenue { background: #ecfdf5; border-color: #a7f3d0; }',
      '    .stat-card .num { font-size: 18px; font-weight: 900; color: #0f172a; line-height: 1.2; }',
      '    .stat-card.completed .num { color: #0d9488; }',
      '    .stat-card.skipped .num { color: #7e22ce; }',
      '    .stat-card.cancelled .num { color: #e11d48; }',
      '    .stat-card.revenue .num { color: #059669; }',
      '    .stat-card .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 3px; }',
      '    table { width: 100%; border-collapse: collapse; margin-top: 6px; }',
      '    th { background: #0f766e; color: white; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; }',
      '    th:first-child { border-top-left-radius: 6px; }',
      '    th:last-child { border-top-right-radius: 6px; text-align: left; }',
      '    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155; vertical-align: middle; }',
      '    tr:nth-child(even) td { background: #f8fafc; }',
      '    .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; }',
      '    .badge-completed { background: #ccfbf1; color: #0f766e; }',
      '    .badge-skipped { background: #f3e8ff; color: #7e22ce; }',
      '    .badge-cancelled { background: #ffe4e6; color: #be123c; }',
      '    .badge-confirmed { background: #dbeafe; color: #1d4ed8; }',
      '    .badge-pending { background: #fef3c7; color: #b45309; }',
      '    .badge-paid { background: #dcfce7; color: #15803d; font-weight: 800; }',
      '    .badge-unpaid { background: #fee2e2; color: #b91c1c; }',
      '    .footer { margin-top: 26px; padding-top: 18px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; }',
      '    .footer-note { font-size: 10px; color: #94a3b8; max-width: 550px; line-height: 1.4; }',
      '    .signature-box { text-align: center; min-width: 180px; }',
      '    .signature-line { border-bottom: 1px solid #0f172a; height: 36px; margin-bottom: 4px; }',
      '    .signature-label { font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; }',
      '  </style>',
      '  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>',
      '</head>',
      '<body>',
      '  <div class="no-print">',
      '    <div>',
      '      <strong>📄 ' + clinicName + ' — Date-wise Clinical PDF Report</strong>',
      '      <span style="opacity:0.85;font-size:11px;margin-left:8px;">(Ready to Save or Download as PDF)</span>',
      '    </div>',
      '    <div style="display:flex;gap:8px;">',
      '      <button class="btn-print" onclick="window.print()">🖨️ Save as PDF / Print</button>',
      '      <button class="btn-download" onclick="downloadDirectPdf()">📥 Download .PDF</button>',
      '      <button class="btn-close" onclick="window.close()">✕ Close</button>',
      '    </div>',
      '  </div>',
      '  <div class="report-sheet" id="report-container">',
      '    <div class="header">',
      '      <div class="clinic-brand">',
      '        <h1>' + clinicName + '</h1>',
      '        <div class="doctor-title">Dr. Prateek Tiwari • MBBS, MD (Dermatology)</div>',
      '        <div class="sub">' + clinicAddress + ' • Phone: ' + clinicPhone + '</div>',
      '      </div>',
      '      <div class="report-meta">',
      '        <span class="report-badge">Clinical Audit Report</span>',
      '        <div class="date-text">' + dateScopeLabel + '</div>',
      '        <div class="gen-time">Generated on: ' + generatedAt + '</div>',
      '      </div>',
      '    </div>',
      '    <div class="stats-grid">',
      '      <div class="stat-card">',
      '        <div class="num">' + total + '</div>',
      '        <div class="lbl">Total Patients</div>',
      '      </div>',
      '      <div class="stat-card completed">',
      '        <div class="num">' + completed + '</div>',
      '        <div class="lbl">Completed (' + completedPercent + '%)</div>',
      '      </div>',
      '      <div class="stat-card skipped">',
      '        <div class="num">' + skipped + '</div>',
      '        <div class="lbl">Skipped (No-Show)</div>',
      '      </div>',
      '      <div class="stat-card cancelled">',
      '        <div class="num">' + cancelled + '</div>',
      '        <div class="lbl">Cancelled</div>',
      '      </div>',
      '      <div class="stat-card">',
      '        <div class="num">' + confirmed + '</div>',
      '        <div class="lbl">Active Queue</div>',
      '      </div>',
      '      <div class="stat-card revenue">',
      '        <div class="num">₹' + revenue.toLocaleString('en-IN') + '</div>',
      '        <div class="lbl">Day Collections</div>',
      '      </div>',
      '    </div>',
      '    <table>',
      '      <thead>',
      '        <tr>',
      '          <th style="width:45px;">Token</th>',
      '          <th style="width:90px;">Time & Date</th>',
      '          <th>Patient Name & Phone</th>',
      '          <th>Service</th>',
      '          <th style="width:70px;">Channel</th>',
      '          <th style="width:85px;">Status</th>',
      '          <th style="width:90px;text-align:right;">Payment</th>',
      '          <th>Notes / Reason</th>',
      '        </tr>',
      '      </thead>',
      '      <tbody>',
      rowsHtml,
      '      </tbody>',
      '    </table>',
      '    <div class="footer">',
      '      <div class="footer-note">',
      '        This document is an official computer-generated clinical log from Skin Hub Clinic Portal.<br/>',
      '        All patient and consultation records are strictly confidential under Medical Ethics regulations.',
      '      </div>',
      '      <div class="signature-box">',
      '        <div class="signature-line"></div>',
      '        <div class="signature-label">Dr. Prateek Tiwari (Authorized Sign)</div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <script>',
      '    function downloadDirectPdf() {',
      '      var el = document.getElementById("report-container");',
      '      var opt = {',
      '        margin: [8, 8, 8, 8],',
      '        filename: "' + filename + '",',
      '        image: { type: "jpeg", quality: 0.98 },',
      '        html2canvas: { scale: 2, useCORS: true },',
      '        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }',
      '      };',
      '      if (window.html2pdf) {',
      '        window.html2pdf().set(opt).from(el).save();',
      '      } else {',
      '        window.print();',
      '      }',
      '    }',
      '    window.onload = function() {',
      '      setTimeout(function() {',
      '        window.print();',
      '      }, 500);',
      '    };',
      '  </script>',
      '</body>',
      '</html>'
    ].join('\n');

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  return (
    <div className="space-y-6 font-sans select-text">

      {/* ── Page Header Row ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-wider">
              Clinical Records & Audit
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs font-bold text-gray-500">
              {groupedByDate.length} Active Booking Days
            </span>
          </div>
          <h2 className="font-playfair text-2xl font-black text-gray-900 tracking-tight">
            Date-wise Booking Records & History
          </h2>
          <p className="text-xs text-gray-600 font-medium mt-1">
            Track daily patient footfall, completed consultations, skipped patients, cancellations, and clinic revenue across all dates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold transition-all shadow-xs"
            title="Refresh bookings data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => exportReportPDF()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Download complete PDF report for this period"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Period PDF</span>
          </button>
        </div>
      </div>

      {/* ── Filter & Navigation Bar ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-4">
        {/* Quick Range Selector Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-gray-500 mr-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Time Range:
            </span>
            {[
              { id: 'all' as const, label: 'All Time' },
              { id: 'today' as const, label: "Today's" },
              { id: 'yesterday' as const, label: 'Yesterday' },
              { id: '7days' as const, label: 'Last 7 Days' },
              { id: '30days' as const, label: 'Last 30 Days' },
              { id: 'thisMonth' as const, label: 'This Month' },
              { id: 'custom' as const, label: 'Custom Range' },
            ].map((tab) => {
              const active = quickRange === tab.id && !jumpDate;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setJumpDate('');
                    setQuickRange(tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Jump to Specific Date Calendar Picker */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1 whitespace-nowrap">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              Jump to Date:
            </label>
            <div className="relative flex items-center">
              <input
                type="date"
                value={jumpDate}
                min={clinicOpeningDate}
                max={todayStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val > todayStr) {
                    alert('Future dates are blocked. Please select today or an earlier date when the clinic was open.');
                    return;
                  }
                  if (clinicOpeningDate && val < clinicOpeningDate) {
                    alert(`Clinic records start from ${formatDisplayDate(clinicOpeningDate)}. Earlier dates are not available.`);
                    return;
                  }
                  setJumpDate(val);
                  if (val) {
                    setExpandedDate(val);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white text-gray-800 focus:outline-none focus:border-primary shadow-2xs"
                title={`Clinic opened: ${formatDisplayDate(clinicOpeningDate)} • Future dates blocked`}
              />
              {jumpDate && (
                <button
                  onClick={() => setJumpDate('')}
                  className="ml-1.5 px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
                  title="Clear date filter"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Range Inputs (if 'custom' is active) */}
        {quickRange === 'custom' && !jumpDate && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-bold text-gray-700">Custom Date Span:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold">From</span>
              <input
                type="date"
                value={customStartDate}
                min={clinicOpeningDate}
                max={customEndDate || todayStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val > todayStr) {
                    alert('Future dates are blocked. Please select today or an earlier date.');
                    return;
                  }
                  if (clinicOpeningDate && val < clinicOpeningDate) {
                    alert(`Clinic records start from ${formatDisplayDate(clinicOpeningDate)}.`);
                    return;
                  }
                  setCustomStartDate(val);
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold bg-white focus:outline-none focus:border-primary"
                title={`Earliest clinic date: ${formatDisplayDate(clinicOpeningDate)}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold">To</span>
              <input
                type="date"
                value={customEndDate}
                min={customStartDate || clinicOpeningDate}
                max={todayStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val > todayStr) {
                    alert('Future dates are blocked. Please select today or an earlier date.');
                    return;
                  }
                  if (clinicOpeningDate && val < clinicOpeningDate) {
                    alert(`Clinic records start from ${formatDisplayDate(clinicOpeningDate)}.`);
                    return;
                  }
                  setCustomEndDate(val);
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold bg-white focus:outline-none focus:border-primary"
                title={`Max allowed: Today (${formatDisplayDate(todayStr)})`}
              />
            </div>
          </div>
        )}

        {/* Search bar inside records */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Patient Name, Phone Number, Service, or Booking ID across dates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-primary placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Matrix Cards for Filtered Period ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Bookings */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Total Bookings</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-playfair text-2.5xl font-black text-gray-900 leading-none">
              {overallMetrics.total}
            </h3>
            <p className="text-[10px] text-gray-500 font-semibold mt-1">In selected period</p>
          </div>
        </div>

        {/* 2. Completed Treatments */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-all bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-playfair text-2.5xl font-black text-emerald-700 leading-none">
              {overallMetrics.completed}
            </h3>
            <p className="text-[10px] text-emerald-800 font-semibold mt-1">
              {overallMetrics.completionRate}% completion rate
            </p>
          </div>
        </div>

        {/* 3. Skipped / No-Show */}
        <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-all bg-purple-50/20">
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-800">Skipped (No-Show)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-playfair text-2.5xl font-black text-purple-700 leading-none">
              {overallMetrics.skipped}
            </h3>
            <p className="text-[10px] text-purple-800 font-semibold mt-1">Missed appointment slot</p>
          </div>
        </div>

        {/* 4. Cancelled */}
        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-all bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">Cancelled</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-playfair text-2.5xl font-black text-rose-700 leading-none">
              {overallMetrics.cancelled}
            </h3>
            <p className="text-[10px] text-rose-800 font-semibold mt-1">Cancelled by clinic/user</p>
          </div>
        </div>

        {/* 5. Confirmed / Arrived */}
        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-all bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">Confirmed / In-Clinic</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-playfair text-2.5xl font-black text-blue-700 leading-none">
              {overallMetrics.confirmed}
            </h3>
            <p className="text-[10px] text-blue-800 font-semibold mt-1">Slots confirmed or active</p>
          </div>
        </div>

        {/* 6. Total Revenue */}
        <div className="bg-white border border-teal-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-all bg-teal-50/20">
          <div className="flex items-center justify-between text-teal-700 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-800">Total Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-playfair text-2xl font-black text-teal-700 leading-none">
              ₹{overallMetrics.revenue.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-teal-800 font-semibold mt-1">Paid consultations</p>
          </div>
        </div>
      </div>

      {/* ── Daily Breakdown Table / Accordion ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LayoutList className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-gray-900">
              Daily History Log & Status Breakdown
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-extrabold">
              {groupedByDate.length} Days Found
            </span>
          </div>

          <p className="text-xs text-gray-500 font-semibold">
            Click on any date to inspect that day's complete patient roster and status details
          </p>
        </div>

        {groupedByDate.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Calendar className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-gray-800 text-base">No Booking Records Found</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto font-semibold">
              No patient bookings match the selected date range or search query. Try expanding your date filter or clearing search keywords.
            </p>
            <button
              onClick={() => {
                setQuickRange('all');
                setJumpDate('');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
            >
              Show All Time Records
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {groupedByDate.map((day) => {
              const isExpanded = expandedDate === day.date;
              const dateInfo = formatDateLabel(day.date);

              // Filter patients within the expanded date if dateStatusFilter is active
              const visiblePatients = day.items.filter((p) => {
                if (dateStatusFilter === 'completed') return isCompleted(p.status);
                if (dateStatusFilter === 'skipped') return isSkipped(p.status);
                if (dateStatusFilter === 'cancelled') return isCancelled(p.status);
                if (dateStatusFilter === 'confirmed') return isConfirmedOrArrived(p.status);
                if (dateStatusFilter === 'pending') return isPending(p.status);
                return true;
              });

              return (
                <div key={day.date} className="transition-colors hover:bg-slate-50/50">
                  {/* Date Summary Row */}
                  <div
                    onClick={() => {
                      setExpandedDate(isExpanded ? null : day.date);
                      setDateStatusFilter('all');
                    }}
                    className={`p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer transition-all ${
                      isExpanded ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    {/* Date Details */}
                    <div className="flex items-center gap-3.5 min-w-[220px]">
                      <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center border transition-all shrink-0 ${
                        dateInfo.isToday
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : dateInfo.isYesterday
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-white text-gray-800 border-gray-200'
                      }`}>
                        <span className="text-[9px] font-black uppercase leading-none">{dateInfo.weekday}</span>
                        <span className="text-sm font-black leading-tight mt-0.5">{day.date.split('-')[2]}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-gray-900">
                            {dateInfo.formatted}
                          </h4>
                          {dateInfo.isToday && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider">
                              Today
                            </span>
                          )}
                          {dateInfo.isYesterday && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider">
                              Yesterday
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                          {day.total} Patient{day.total === 1 ? '' : 's'} Booked • ₹{day.revenue.toLocaleString('en-IN')} Collection
                        </p>
                      </div>
                    </div>

                    {/* Status Breakdown Pills */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Completed Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        day.completed > 0
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'
                      }`}>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{day.completed} Completed</span>
                      </span>

                      {/* Skipped Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        day.skipped > 0
                          ? 'bg-purple-50 border-purple-300 text-purple-800 font-extrabold'
                          : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'
                      }`}>
                        <UserX className="w-3 h-3 text-purple-600" />
                        <span>{day.skipped} Skipped</span>
                      </span>

                      {/* Cancelled Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        day.cancelled > 0
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'
                      }`}>
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>{day.cancelled} Cancelled</span>
                      </span>

                      {/* Confirmed / Arrived Badge */}
                      {day.confirmed > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 border border-blue-300 text-blue-800">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>{day.confirmed} Active/Waiting</span>
                        </span>
                      )}

                      {/* Pending Badge */}
                      {day.pending > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 border border-amber-300 text-amber-800">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>{day.pending} Pending</span>
                        </span>
                      )}
                    </div>

                    {/* Action buttons & chevron */}
                    <div className="flex items-center gap-2 justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => exportReportPDF(day.date)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center gap-1.5 border border-rose-200 transition-all cursor-pointer shadow-2xs"
                        title="Download PDF report for this date"
                      >
                        <Download className="w-3.5 h-3.5 text-rose-600" />
                        <span className="font-extrabold">PDF</span>
                      </button>

                      <button
                        onClick={() => {
                          setExpandedDate(isExpanded ? null : day.date);
                          setDateStatusFilter('all');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isExpanded
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                      >
                        <span>{isExpanded ? 'Hide Patients' : 'View Patients'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Patients Roster for this Day */}
                  {isExpanded && (
                    <div className="bg-slate-50/80 p-4 sm:p-6 border-t border-gray-200 space-y-4">
                      {/* Sub-filtering by Status for this day */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-200">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-600 mr-1 flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5 text-primary" /> Filter Day Patients:
                          </span>
                          {[
                            { id: 'all' as const, label: `All (${day.total})` },
                            { id: 'completed' as const, label: `✅ Completed (${day.completed})` },
                            { id: 'skipped' as const, label: `⏭️ Skipped (${day.skipped})` },
                            { id: 'cancelled' as const, label: `❌ Cancelled (${day.cancelled})` },
                            { id: 'confirmed' as const, label: `📅 Confirmed/Waiting (${day.confirmed})` },
                            { id: 'pending' as const, label: `⏳ Pending (${day.pending})` },
                          ].map((f) => (
                            <button
                              key={f.id}
                              onClick={() => setDateStatusFilter(f.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                dateStatusFilter === f.id
                                  ? 'bg-gray-900 text-white shadow-xs'
                                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>

                        <span className="text-xs font-bold text-gray-500">
                          Showing {visiblePatients.length} of {day.total} Patient Record{day.total === 1 ? '' : 's'}
                        </span>
                      </div>

                      {/* Patient List Cards */}
                      {visiblePatients.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-xs font-semibold bg-white rounded-xl border border-gray-200">
                          No patients match the "{dateStatusFilter}" filter for this date.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {visiblePatients.map((patient) => {
                            const hasSkipOrCancelReason = patient.rescheduleReason || patient.cancellationReason;

                            return (
                              <div
                                key={patient.id}
                                className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                              >
                                <div>
                                  {/* Top Row: Time, Token, Source */}
                                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center gap-1 text-xs font-black text-gray-800">
                                        <Clock className="w-3.5 h-3.5 text-primary" />
                                        {patient.time || 'Flexible'}
                                      </span>
                                      {patient.tokenNumber && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-black">
                                          #{patient.tokenNumber}
                                        </span>
                                      )}
                                    </div>

                                    <div>
                                      {patient.source === 'walk-in' ? (
                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-300 text-gray-700 text-[9px] font-extrabold uppercase">
                                          🚶 Walk-in
                                        </span>
                                      ) : patient.bookingType === 'online' ? (
                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-extrabold uppercase">
                                          🌐 Online Video
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-250 text-amber-800 text-[9px] font-extrabold uppercase">
                                          🏥 In-Clinic
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Patient Identity */}
                                  <div className="mt-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <h5 className="font-extrabold text-sm text-gray-900 leading-tight">
                                          {patient.name}
                                        </h5>
                                        <p className="text-xs text-gray-600 font-semibold flex items-center gap-1 mt-0.5">
                                          <Phone className="w-3 h-3 text-gray-400" />
                                          {patient.phone}
                                        </p>
                                      </div>

                                      {renderPaymentBadge(patient)}
                                    </div>

                                    <div className="mt-2 text-xs font-semibold text-primary">
                                      Service: {patient.service}
                                    </div>

                                    {/* Age & Gender if available */}
                                    {(patient.age || patient.gender) && (
                                      <div className="text-[11px] text-gray-500 font-semibold mt-1">
                                        Intake: {patient.age ? `${patient.age} yrs` : ''} {patient.gender ? `• ${patient.gender}` : ''}
                                      </div>
                                    )}

                                    {/* Reason for skip or cancellation if present */}
                                    {hasSkipOrCancelReason && (
                                      <div className="mt-2.5 p-2 rounded-lg bg-rose-50/70 border border-rose-200 text-[11px] font-medium text-rose-800 leading-snug">
                                        <span className="font-bold">Log Reason:</span>{' '}
                                        {patient.rescheduleReason || patient.cancellationReason}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Card Bottom: Status Badge & Detail Button */}
                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                  <div>{renderStatusBadge(patient.status)}</div>

                                  <div className="flex items-center gap-1.5">
                                    {patient.status === 'completed' && (
                                      <button
                                        onClick={() => window.open(`/admin/prescription?patientId=${patient.id}&type=${patient.bookingType === 'online' ? 'telemedicine' : 'clinic'}`, '_blank')}
                                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-[#0B1B29] hover:bg-primary text-white flex items-center gap-1 transition-colors cursor-pointer"
                                        title="Ready / Write Prescription (like Pre-Paid Log)"
                                      >
                                        <FileText className="w-3 h-3" />
                                        <span>Write Rx</span>
                                      </button>
                                    )}
                                    {hasCaseFile(patient) && (
                                      <button
                                        onClick={() => window.open(`/prescription/view?id=${patient.id}`, '_blank')}
                                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                                        title="View Patient's Completed Case File & Prescription Pad"
                                      >
                                        <Eye className="w-3 h-3 text-emerald-600" />
                                        <span>View Case File</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setViewingPatientDetails(patient)}
                                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3 text-gray-500" />
                                      <span>Details</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Patient Details Modal Drawer ── */}
      {viewingPatientDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setViewingPatientDetails(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-gray-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-gray-200">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase">
                  Patient Clinical Dossier
                </span>
                <h3 className="font-playfair text-xl font-black text-gray-900 mt-1">
                  {viewingPatientDetails.name}
                </h3>
                <p className="text-xs text-gray-500 font-semibold">
                  Booking #{viewingPatientDetails.id} • {viewingPatientDetails.date} ({viewingPatientDetails.time})
                </p>
              </div>
              <button
                onClick={() => setViewingPatientDetails(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Details Grid */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-500 font-medium block">Current Status:</span>
                  <div className="mt-1">{renderStatusBadge(viewingPatientDetails.status)}</div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block">Payment Status:</span>
                  <div className="mt-1">{renderPaymentBadge(viewingPatientDetails)}</div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-2">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Contact Phone</span>
                  <span className="font-bold text-gray-900">{viewingPatientDetails.phone}</span>
                </div>
                {viewingPatientDetails.email && (
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Email</span>
                    <span className="font-bold text-gray-900">{viewingPatientDetails.email}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Service Requested</span>
                  <span className="font-bold text-primary">{viewingPatientDetails.service}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Source / Type</span>
                  <span className="font-bold text-gray-900">
                    {viewingPatientDetails.source === 'walk-in'
                      ? 'Walk-in'
                      : viewingPatientDetails.bookingType === 'online'
                      ? 'Online Video Consultation'
                      : 'In-Clinic Appointment'}
                  </span>
                </div>
                {viewingPatientDetails.tokenNumber && (
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Queue Token #</span>
                    <span className="font-bold text-amber-700">#{viewingPatientDetails.tokenNumber}</span>
                  </div>
                )}
              </div>

              {/* Intake & Clinical Details */}
              {(viewingPatientDetails.problemDescription || viewingPatientDetails.skinType || viewingPatientDetails.previousMedication) && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
                  <p className="font-bold text-blue-900 text-xs">Patient Intake Questionnaire</p>
                  {viewingPatientDetails.skinType && (
                    <p className="text-gray-700"><strong className="text-gray-900">Skin Type:</strong> {viewingPatientDetails.skinType}</p>
                  )}
                  {viewingPatientDetails.problemDescription && (
                    <p className="text-gray-700"><strong className="text-gray-900">Problem:</strong> {viewingPatientDetails.problemDescription}</p>
                  )}
                  {viewingPatientDetails.previousMedication && (
                    <p className="text-gray-700"><strong className="text-gray-900">Previous Meds:</strong> {viewingPatientDetails.previousMedication}</p>
                  )}
                </div>
              )}

              {/* Reasons & Logs */}
              {(viewingPatientDetails.rescheduleReason || viewingPatientDetails.cancellationReason || viewingPatientDetails.appointmentNotes) && (
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                  <p className="font-bold text-amber-900 text-xs">Audit & Reason Logs</p>
                  {viewingPatientDetails.rescheduleReason && (
                    <p className="text-gray-700"><strong className="text-gray-900">Skip/Reschedule:</strong> {viewingPatientDetails.rescheduleReason}</p>
                  )}
                  {viewingPatientDetails.cancellationReason && (
                    <p className="text-gray-700"><strong className="text-gray-900">Cancellation:</strong> {viewingPatientDetails.cancellationReason}</p>
                  )}
                  {viewingPatientDetails.appointmentNotes && (
                    <p className="text-gray-700"><strong className="text-gray-900">Notes:</strong> {viewingPatientDetails.appointmentNotes}</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              {viewingPatientDetails.status === 'completed' && (
                <button
                  onClick={() => window.open(`/admin/prescription?patientId=${viewingPatientDetails.id}&type=${viewingPatientDetails.bookingType === 'online' ? 'telemedicine' : 'clinic'}`, '_blank')}
                  className="px-4 py-2 rounded-xl bg-[#0B1B29] hover:bg-primary text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Ready / Write Prescription (like Pre-Paid Log)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Write Rx</span>
                </button>
              )}
              {hasCaseFile(viewingPatientDetails) && (
                <button
                  onClick={() => window.open(`/prescription/view?id=${viewingPatientDetails.id}`, '_blank')}
                  className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="View Patient's Completed Case File & Prescription Pad"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>View Case File</span>
                </button>
              )}
              {viewingPatientDetails.phone ? (
                <a
                  href={`https://wa.me/${viewingPatientDetails.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <span className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 font-semibold text-xs flex items-center">
                  No WhatsApp
                </span>
              )}
              {viewingPatientDetails.email && (
                <a
                  href={`mailto:${viewingPatientDetails.email}?subject=Skin%20Hub%20Clinic%20-%20Appointment%20Update`}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                  title={`Email patient at ${viewingPatientDetails.email}`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Patient</span>
                </a>
              )}
              <button
                onClick={() => setViewingPatientDetails(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
