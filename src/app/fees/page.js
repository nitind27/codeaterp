'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function FeesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [fees, setFees] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditFeesModal, setShowEditFeesModal] = useState(false);
  const [editFeeTarget, setEditFeeTarget] = useState(null);
  const [editFeesData, setEditFeesData] = useState({ totalFees: '', notes: '' });
  const [editFeesSubmitting, setEditFeesSubmitting] = useState(false);
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState(false);
  const [deletePaymentTarget, setDeletePaymentTarget] = useState(null);
  const [deletePaymentSubmitting, setDeletePaymentSubmitting] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTarget, setReminderTarget] = useState(null);
  const [reminderData, setReminderData] = useState({ requestAmount: '', dueDate: '', notes: '' });
  const [reminderSending, setReminderSending] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTarget, setReminderTarget] = useState(null);
  const [reminderData, setReminderData] = useState({ notes: '', dueDate: '' });
  const [reminderSending, setReminderSending] = useState(false);
  const [expandedFee, setExpandedFee] = useState(null);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [feesFormData, setFeesFormData] = useState({
    employeeId: '',
    totalFees: '',
    notes: ''
  });
  const [paymentFormData, setPaymentFormData] = useState({
    internFeesId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    transactionId: '',
    notes: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== 'admin' && parsedUser.role !== 'hr' && parsedUser.role !== 'intern') {
      router.push('/dashboard');
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user'));

      // Load fees
      const feesRes = await fetch('/api/fees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const feesData = await feesRes.json();

      if (feesData.success) {
        setFees(feesData.fees || []);
      }

      // Load interns (only for admin/hr)
      if (userData.role === 'admin' || userData.role === 'hr') {
        const internsRes = await fetch('/api/employees', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const internsData = await internsRes.json();

        if (internsData.success) {
          // Filter to only interns
          const internList = internsData.employees.filter(emp => emp.role === 'intern');
          setInterns(internList);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleSetFees = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(feesFormData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setShowFeesModal(false);
        setFeesFormData({ employeeId: '', totalFees: '', notes: '' });
        loadData();
      } else {
        toast.error(data.error || 'Failed to set fees');
      }
    } catch (error) {
      toast.error('Error setting fees');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fees/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(paymentFormData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Payment recorded successfully! Email sent to intern.');
        setShowPaymentModal(false);
        setPaymentFormData({
          internFeesId: '',
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          transactionId: '',
          notes: ''
        });
        loadData();
      } else {
        toast.error(data.error || 'Failed to record payment');
      }
    } catch (error) {
      toast.error('Error recording payment');
    }
  };

  const fmt = (n) => 'Rs. ' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const openEditFees = (fee) => {
    setEditFeeTarget(fee);
    setEditFeesData({ totalFees: fee.totalFees, notes: fee.notes || '' });
    setShowEditFeesModal(true);
  };

  const handleEditFees = async (e) => {
    e.preventDefault();
    setEditFeesSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ employeeId: editFeeTarget.employeeId, totalFees: editFeesData.totalFees, notes: editFeesData.notes })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Fees updated successfully!');
        setShowEditFeesModal(false);
        setEditFeeTarget(null);
        loadData();
      } else toast.error(data.error || 'Failed to update fees');
    } catch { toast.error('Error updating fees'); }
    finally { setEditFeesSubmitting(false); }
  };

  const openDeletePayment = (fee, payment) => {
    setDeletePaymentTarget({ fee, payment });
    setShowDeletePaymentModal(true);
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentTarget) return;
    setDeletePaymentSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/fees/payments/${deletePaymentTarget.payment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payment deleted successfully!');
        setShowDeletePaymentModal(false);
        setDeletePaymentTarget(null);
        loadData();
      } else toast.error(data.error || 'Failed to delete payment');
    } catch { toast.error('Error deleting payment'); }
    finally { setDeletePaymentSubmitting(false); }
  };

  const openReminder = (fee) => {
    setReminderTarget(fee);
    setReminderData({ notes: '', dueDate: '' });
    setShowReminderModal(true);
  };

  const handleSendReminder = async (e) => {
    e.preventDefault();
    if (!reminderTarget) return;
    setReminderSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/fees/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          feesId: reminderTarget.id,
          notes: reminderData.notes || null,
          dueDate: reminderData.dueDate || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Reminder sent to ${reminderTarget.employeeName}!`);
        setShowReminderModal(false);
        setReminderTarget(null);
      } else {
        toast.error(data.error || 'Failed to send reminder');
      }
    } catch { toast.error('Error sending reminder'); }
    finally { setReminderSending(false); }
  };

  const openReminder = (fee) => {
    setReminderTarget(fee);
    setReminderData({ requestAmount: '', dueDate: '', notes: '' });
    setShowReminderModal(true);
  };

  const handleSendReminder = async (e) => {
    e.preventDefault();
    if (!reminderTarget) return;
    const reqAmt = parseFloat(reminderData.requestAmount);
    if (!reqAmt || reqAmt <= 0) { toast.error('Please enter a valid amount to request'); return; }
    if (reqAmt > reminderTarget.remainingAmount) {
      toast.error(`Amount cannot exceed remaining balance (${fmt(reminderTarget.remainingAmount)})`); return;
    }
    setReminderSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/fees/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          feesId: reminderTarget.id,
          requestAmount: reqAmt,
          dueDate: reminderData.dueDate || null,
          notes: reminderData.notes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Reminder sent to ${reminderTarget.employeeName}!`);
        setShowReminderModal(false);
        setReminderTarget(null);
      } else toast.error(data.error || 'Failed to send reminder');
    } catch { toast.error('Error sending reminder'); }
    finally { setReminderSending(false); }
  };

  const downloadReceipt = async (paymentId) => {
    if (!paymentId) { toast.error('Payment ID is required'); return; }
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    try {
      const response = await fetch(`/api/fees/receipt/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || 'Failed to load receipt'); return;
      }
      const data = await response.json();
      if (!data.success || !data.receipt) { toast.error(data.error || 'Failed to load receipt data'); return; }

      const r = data.receipt;

      // ── helpers ──────────────────────────────────────────────────────────
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const lm = 18, rm = 18; // left/right margin
      const cw = W - lm - rm;  // content width
      const payDate = new Date(r.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const method = r.payment.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const isPaid = parseFloat(r.fees.remainingAmount) <= 0;

      // ── PAGE BACKGROUND ──────────────────────────────────────────────────
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, W, H, 'F');

      // subtle grid watermark
      doc.setDrawColor(220, 228, 232);
      doc.setLineWidth(0.15);
      for (let x = 0; x <= W; x += 8) doc.line(x, 0, x, H);
      for (let y = 0; y <= H; y += 8) doc.line(0, y, W, y);

      // white receipt body
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(lm - 3, 12, cw + 6, H - 24, 4, 4, 'F');
      doc.setDrawColor(210, 220, 224);
      doc.setLineWidth(0.3);
      doc.roundedRect(lm - 3, 12, cw + 6, H - 24, 4, 4, 'S');

      // ── HEADER BAND ──────────────────────────────────────────────────────
      doc.setFillColor(15, 70, 76);
      doc.roundedRect(lm - 3, 12, cw + 6, 52, 4, 4, 'F');
      // cover bottom corners
      doc.setFillColor(15, 70, 76);
      doc.rect(lm - 3, 48, cw + 6, 16, 'F');

      // teal accent line
      doc.setFillColor(0, 188, 212);
      doc.rect(lm - 3, 62, cw + 6, 2.5, 'F');

      // company name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text('CODEAT INFOTECH', lm + 2, 32);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(160, 215, 220);
      doc.text('Internship Management System', lm + 2, 40);
      doc.text('Surat, Gujarat, India', lm + 2, 48);

      // RECEIPT title (right)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.text('RECEIPT', W - rm - 1, 35, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(160, 215, 220);
      doc.text(`No: ${r.receiptNumber}`, W - rm - 1, 44, { align: 'right' });
      doc.text(`Date: ${payDate}`, W - rm - 1, 51, { align: 'right' });

      // ── BILLED TO / RECEIPT INFO ─────────────────────────────────────────
      let y = 76;

      // left: billed to
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(130, 150, 155);
      doc.text('BILLED TO', lm, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(20, 30, 35);
      doc.text(r.intern.name, lm, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 95, 100);
      doc.text(`Employee ID: ${r.intern.employeeId}`, lm, y + 15);
      if (r.intern.email) doc.text(`Email: ${r.intern.email}`, lm, y + 21);
      if (r.intern.phone) doc.text(`Phone: ${r.intern.phone}`, lm, y + 27);

      // right: receipt meta
      const rx2 = W / 2 + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(130, 150, 155);
      doc.text('RECEIPT DETAILS', rx2, y);

      const meta = [
        ['Receipt No', r.receiptNumber],
        ['Payment Date', payDate],
        ['Payment Method', method],
        ...(r.payment.transactionId ? [['Transaction ID', r.payment.transactionId]] : []),
      ];
      doc.setFontSize(8.5);
      meta.forEach((row, i) => {
        const ry = y + 8 + i * 7;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(110, 125, 130);
        doc.text(row[0] + ':', rx2, ry);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 30, 35);
        const val = row[1].length > 22 ? row[1].slice(0, 22) + '...' : row[1];
        doc.text(val, rx2 + 32, ry);
      });

      // ── DIVIDER ──────────────────────────────────────────────────────────
      y += 38;
      doc.setDrawColor(220, 228, 232);
      doc.setLineWidth(0.4);
      doc.line(lm, y, W - rm, y);

      // ── AMOUNT PAID HERO ─────────────────────────────────────────────────
      y += 8;
      // big amount box
      doc.setFillColor(15, 70, 76);
      doc.roundedRect(lm, y, cw, 28, 3, 3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(160, 215, 220);
      doc.text('AMOUNT PAID', W / 2, y + 8, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(fmt(r.payment.amount), W / 2, y + 21, { align: 'center' });

      // status badge
      doc.setFillColor(isPaid ? 34 : 220, isPaid ? 197 : 38, isPaid ? 94 : 38);
      doc.roundedRect(W - rm - 28, y + 6, 26, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(isPaid ? 'PAID IN FULL' : 'PARTIAL', W - rm - 15, y + 12.5, { align: 'center' });

      // ── FEES BREAKDOWN TABLE ─────────────────────────────────────────────
      y += 36;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(130, 150, 155);
      doc.text('FEES BREAKDOWN', lm, y);

      y += 5;
      // table header
      doc.setFillColor(240, 245, 248);
      doc.rect(lm, y, cw, 8, 'F');
      doc.setDrawColor(210, 220, 224);
      doc.setLineWidth(0.25);
      doc.rect(lm, y, cw, 8, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(80, 95, 100);
      doc.text('DESCRIPTION', lm + 4, y + 5.5);
      doc.text('AMOUNT', W - rm - 4, y + 5.5, { align: 'right' });

      // rows
      const rows = [
        ['Total Course Fees', fmt(r.fees.totalFees), [248, 252, 253]],
        ['Amount Paid (This Receipt)', fmt(r.payment.amount), [240, 252, 244]],
        ['Total Paid to Date', fmt(r.fees.paidAmount), [240, 252, 244]],
        ['Balance Remaining', fmt(r.fees.remainingAmount), isPaid ? [240, 252, 244] : [255, 243, 243]],
      ];

      rows.forEach((row, i) => {
        const ry = y + 8 + i * 9;
        doc.setFillColor(...row[2]);
        doc.rect(lm, ry, cw, 9, 'F');
        doc.setDrawColor(220, 228, 232);
        doc.setLineWidth(0.2);
        doc.rect(lm, ry, cw, 9, 'S');

        doc.setFont('helvetica', i === 3 ? 'bold' : 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(i === 3 ? (isPaid ? 22 : 180) : 50, i === 3 ? (isPaid ? 130 : 30) : 65, i === 3 ? (isPaid ? 60 : 30) : 70);
        doc.text(row[0], lm + 4, ry + 6);
        doc.setFont('helvetica', 'bold');
        doc.text(row[1], W - rm - 4, ry + 6, { align: 'right' });
      });

      // ── PAYMENT HISTORY ──────────────────────────────────────────────────
      if (r.paymentHistory && r.paymentHistory.length > 0) {
        y += 8 + rows.length * 9 + 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(130, 150, 155);
        doc.text('PAYMENT HISTORY', lm, y);

        y += 5;
        // header
        doc.setFillColor(15, 70, 76);
        doc.rect(lm, y, cw, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(200, 230, 235);
        doc.text('#', lm + 3, y + 5.5);
        doc.text('Receipt No', lm + 12, y + 5.5);
        doc.text('Date', lm + 68, y + 5.5);
        doc.text('Method', lm + 108, y + 5.5);
        doc.text('Amount', W - rm - 3, y + 5.5, { align: 'right' });

        r.paymentHistory.forEach((p, i) => {
          const ry = y + 8 + i * 8;
          doc.setFillColor(i % 2 === 0 ? 250 : 245, i % 2 === 0 ? 252 : 249, i % 2 === 0 ? 253 : 251);
          doc.rect(lm, ry, cw, 8, 'F');
          doc.setDrawColor(225, 232, 235);
          doc.setLineWidth(0.15);
          doc.rect(lm, ry, cw, 8, 'S');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(80, 95, 100);
          doc.text(String(i + 1), lm + 3, ry + 5.5);
          doc.text((p.receiptNumber || '-').slice(0, 20), lm + 12, ry + 5.5);
          doc.text(new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), lm + 68, ry + 5.5);
          doc.text(p.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), lm + 108, ry + 5.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 70, 76);
          doc.text(fmt(p.amount), W - rm - 3, ry + 5.5, { align: 'right' });
        });
      }

      // ── DOTTED TEAR LINE ─────────────────────────────────────────────────
      const tearY = H - 38;
      doc.setDrawColor(180, 195, 200);
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([1.5, 2], 0);
      doc.line(lm, tearY, W - rm, tearY);
      doc.setLineDashPattern([], 0);
      // scissors icon text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(180, 195, 200);
      doc.text('- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -', W / 2, tearY - 1, { align: 'center' });

      // ── FOOTER STUB ──────────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 70, 76);
      doc.text('CODEAT INFOTECH', lm, tearY + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(110, 125, 130);
      doc.text(`Receipt: ${r.receiptNumber}  |  ${r.intern.name}  |  ${fmt(r.payment.amount)}`, lm, tearY + 15);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(160, 175, 180);
      doc.text('This is a computer-generated receipt and does not require a physical signature.', W / 2, tearY + 22, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, W / 2, tearY + 28, { align: 'center' });

      doc.save(`Receipt-${r.receiptNumber}.pdf`);
      toast.success('Receipt downloaded!');
    } catch (error) {
      console.error('Receipt error:', error);
      toast.error(error.message || 'Error downloading receipt');
    }
  };

  if (loading || !user) {
    return <LogoLoader />;
  }

  const isAdmin = user.role === 'admin' || user.role === 'hr';

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">
              {isAdmin ? 'Fees Management' : 'My Fees & Receipts'}
            </h1>
            <p className="text-codeat-gray text-lg">
              {isAdmin ? 'Manage intern fees and payments' : 'View your fees and download receipts'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedIntern(null);
                  setFeesFormData({ employeeId: '', totalFees: '', notes: '' });
                  setShowFeesModal(true);
                }}
                className="px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Set Fees
              </button>
            </div>
          )}
        </div>

        {/* Fees List */}
        {fees.length === 0 ? (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-12 text-center">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-codeat-silver font-bold text-xl mb-2">No Fees Records Found</h3>
            <p className="text-codeat-gray mb-6">
              {isAdmin 
                ? 'Get started by setting fees for an intern'
                : 'No fees information available. Please contact the admin to set your fees.'}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowFeesModal(true)}
                className="px-6 py-3 bg-codeat-accent text-white rounded-lg hover:bg-codeat-accent/80 transition font-medium"
              >
                Set Fees
              </button>
            )}
          </div>
        ) : (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 overflow-hidden shadow-xl">
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    {isAdmin && (
                      <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Intern</th>
                    )}
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Total Fees</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Paid</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Remaining</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Payments</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((fee) => (
                    <React.Fragment key={fee.id}>
                    <tr className="hover:bg-codeat-dark/40 transition-colors duration-200">
                      {isAdmin && (
                        <td className="px-4 sm:px-6 py-4">
                          <div>
                            <div className="text-codeat-silver font-semibold">{fee.employeeName}</div>
                            <div className="text-codeat-gray text-xs">{fee.employeeCode} • {fee.email}</div>
                          </div>
                        </td>
                      )}
                      <td className="px-4 sm:px-6 py-4 text-codeat-silver font-medium">
                        {fmt(fee.totalFees)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-green-400 font-semibold">
                        {fmt(fee.paidAmount)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-red-400 font-semibold">
                        {fmt(fee.remainingAmount)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-gray text-sm">
                        {fee.payments.length} payment{fee.payments.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedIntern(fee);
                                  setPaymentFormData({
                                    internFeesId: fee.id,
                                    amount: '',
                                    paymentDate: new Date().toISOString().split('T')[0],
                                    paymentMethod: 'cash',
                                    transactionId: '',
                                    notes: ''
                                  });
                                  setShowPaymentModal(true);
                                }}
                                disabled={fee.remainingAmount <= 0}
                                className="px-3 py-1.5 bg-codeat-accent text-white rounded-lg hover:bg-codeat-accent/80 transition text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                                Payment
                              </button>
                              <button
                                onClick={() => openEditFees(fee)}
                                className="px-3 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition text-xs font-semibold flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                Edit Fees
                              </button>
                              {fee.remainingAmount > 0 && (
                                <button
                                  onClick={() => openReminder(fee)}
                                  className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition text-xs font-semibold flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                                  Reminder
                                </button>
                              )}
                              <button
                                onClick={() => openReminder(fee)}
                                className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition text-xs font-semibold flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                                Reminder
                              </button>
                            </>
                          )}
                          {fee.payments.length > 0 && (
                            <button
                              onClick={() => setExpandedFee(expandedFee === fee.id ? null : fee.id)}
                              className="px-3 py-1.5 bg-codeat-muted/40 text-codeat-gray border border-codeat-muted/30 rounded-lg hover:bg-codeat-muted/60 transition text-xs font-semibold flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                              History
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedFee === fee.id && fee.payments.length > 0 && (
                      <tr key={`${fee.id}-history`}>
                        <td colSpan={isAdmin ? 7 : 6} className="px-4 sm:px-6 pb-4 pt-0">
                          <div className="bg-codeat-dark/60 rounded-xl border border-codeat-muted/20 overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-codeat-muted/20 flex items-center justify-between">
                              <span className="text-codeat-silver text-xs font-semibold uppercase tracking-wider">Payment History — {fee.employeeName}</span>
                              <span className="text-codeat-gray text-xs">{fee.payments.length} payment{fee.payments.length !== 1 ? 's' : ''}</span>
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-codeat-muted/20">
                                  <th className="px-4 py-2 text-left text-codeat-gray font-medium">Receipt No</th>
                                  <th className="px-4 py-2 text-left text-codeat-gray font-medium">Date</th>
                                  <th className="px-4 py-2 text-left text-codeat-gray font-medium">Method</th>
                                  <th className="px-4 py-2 text-right text-codeat-gray font-medium">Amount</th>
                                  <th className="px-4 py-2 text-right text-codeat-gray font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-codeat-muted/10">
                                {fee.payments.map(payment => (
                                  <tr key={payment.id} className="hover:bg-codeat-muted/10 transition-colors">
                                    <td className="px-4 py-2.5 text-codeat-accent font-mono">{payment.receiptNumber || '—'}</td>
                                    <td className="px-4 py-2.5 text-codeat-silver">{new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td className="px-4 py-2.5 text-codeat-gray capitalize">{payment.paymentMethod.replace(/_/g, ' ')}</td>
                                    <td className="px-4 py-2.5 text-green-400 font-semibold text-right">{fmt(payment.amount)}</td>
                                    <td className="px-4 py-2.5 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => downloadReceipt(payment.id)}
                                          className="p-1.5 rounded-lg bg-codeat-teal/10 text-codeat-teal hover:bg-codeat-teal/20 transition" title="Download receipt">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                        </button>
                                        {isAdmin && (
                                          <button onClick={() => openDeletePayment(fee, payment)}
                                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition" title="Delete payment">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment History for Interns */}
        {!isAdmin && fees.length > 0 && fees[0].payments && fees[0].payments.length > 0 && (
          <div className="bg-codeat-mid rounded-2xl p-6 lg:p-8 border border-codeat-muted/30 shadow-xl">
            <h2 className="text-2xl font-bold text-codeat-silver mb-6">Payment History</h2>
            <div className="space-y-3">
              {fees[0].payments.map((payment) => (
                <div key={payment.id} className="bg-codeat-dark/40 rounded-xl p-4 border border-codeat-muted/30 flex items-center justify-between">
                  <div>
                    <div className="text-codeat-silver font-semibold">₹{parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-codeat-gray text-sm">
                      {new Date(payment.paymentDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })} • {payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1).replace('_', ' ')}
                    </div>
                    {payment.receiptNumber && (
                      <div className="text-codeat-gray text-xs mt-1">Receipt: {payment.receiptNumber}</div>
                    )}
                  </div>
                  <button
                    onClick={() => downloadReceipt(payment.id)}
                    className="px-4 py-2 bg-codeat-teal text-white rounded-lg hover:bg-codeat-teal/80 transition font-semibold text-sm"
                  >
                    Download Receipt
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Set Fees Modal */}
        {showFeesModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md modal-backdrop flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
              <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 p-6 backdrop-blur-sm z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-codeat-silver mb-1">Set Intern Fees</h2>
                    <p className="text-codeat-gray text-sm">Set total fees for an intern</p>
                  </div>
                  <button
                    onClick={() => setShowFeesModal(false)}
                    className="p-2 hover:bg-codeat-muted/50 rounded-lg transition text-codeat-gray hover:text-codeat-silver"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleSetFees} className="p-6 lg:p-8 space-y-6">
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                    Select Intern <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={feesFormData.employeeId}
                    onChange={(e) => setFeesFormData({ ...feesFormData, employeeId: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">Select intern</option>
                    {interns.map((intern) => (
                      <option key={intern.id} value={intern.id}>
                        {intern.fullName} ({intern.employeeId}) - {intern.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                    Total Fees (₹) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={feesFormData.totalFees}
                    onChange={(e) => setFeesFormData({ ...feesFormData, totalFees: e.target.value })}
                    className="input-field"
                    placeholder="Enter total fees amount"
                    required
                  />
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Notes</label>
                  <textarea
                    value={feesFormData.notes}
                    onChange={(e) => setFeesFormData({ ...feesFormData, notes: e.target.value })}
                    className="input-field"
                    rows="3"
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-codeat-muted/30">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95"
                  >
                    Set Fees
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFeesModal(false)}
                    className="flex-1 px-6 py-3.5 bg-codeat-muted/50 text-codeat-silver rounded-xl hover:bg-codeat-muted transition-all duration-300 font-semibold border border-codeat-muted/30"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Payment Modal */}
        {showPaymentModal && selectedIntern && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md modal-backdrop flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
              <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 p-6 backdrop-blur-sm z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-codeat-silver mb-1">Add Payment</h2>
                    <p className="text-codeat-gray text-sm">Record payment for {selectedIntern.employeeName}</p>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="p-2 hover:bg-codeat-muted/50 rounded-lg transition text-codeat-gray hover:text-codeat-silver"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleAddPayment} className="p-6 lg:p-8 space-y-6">
                <div className="bg-codeat-dark/40 rounded-xl p-4 border border-codeat-muted/30">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-codeat-gray">Total Fees:</span>
                      <span className="text-codeat-silver font-semibold ml-2">{fmt(selectedIntern.totalFees)}</span>
                    </div>
                    <div>
                      <span className="text-codeat-gray">Paid:</span>
                      <span className="text-green-400 font-semibold ml-2">{fmt(selectedIntern.paidAmount)}</span>
                    </div>
                    <div>
                      <span className="text-codeat-gray">Remaining:</span>
                      <span className="text-red-400 font-semibold ml-2">{fmt(selectedIntern.remainingAmount)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                    Payment Amount (₹) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedIntern.remainingAmount}
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    className="input-field"
                    placeholder="Enter payment amount"
                    required
                  />
                  <p className="text-codeat-gray text-xs mt-1.5">
                    Maximum: {fmt(selectedIntern.remainingAmount)}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                      Payment Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                      Payment Method <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={paymentFormData.paymentMethod}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentFormData.transactionId}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, transactionId: e.target.value })}
                    className="input-field"
                    placeholder="Enter transaction ID (if applicable)"
                  />
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Notes</label>
                  <textarea
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    className="input-field"
                    rows="3"
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-codeat-muted/30">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95"
                  >
                    Record Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-6 py-3.5 bg-codeat-muted/50 text-codeat-silver rounded-xl hover:bg-codeat-muted transition-all duration-300 font-semibold border border-codeat-muted/30"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── EDIT FEES MODAL ── */}
        {showEditFeesModal && editFeeTarget && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/50 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-codeat-muted/30">
                <div>
                  <h2 className="text-xl font-bold text-codeat-silver">Edit Fees</h2>
                  <p className="text-codeat-gray text-sm mt-0.5">{editFeeTarget.employeeName} · {editFeeTarget.employeeCode}</p>
                </div>
                <button onClick={() => { setShowEditFeesModal(false); setEditFeeTarget(null); }}
                  className="p-2 hover:bg-codeat-muted/50 rounded-lg transition text-codeat-gray hover:text-codeat-silver">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* current summary */}
              <div className="mx-6 mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Fees', value: fmt(editFeeTarget.totalFees), color: 'text-codeat-silver' },
                  { label: 'Paid', value: fmt(editFeeTarget.paidAmount), color: 'text-green-400' },
                  { label: 'Remaining', value: fmt(editFeeTarget.remainingAmount), color: 'text-red-400' },
                ].map(s => (
                  <div key={s.label} className="bg-codeat-dark/50 rounded-xl p-3 border border-codeat-muted/20 text-center">
                    <p className="text-codeat-gray text-[10px] uppercase tracking-wider mb-1">{s.label}</p>
                    <p className={`${s.color} font-bold text-sm`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleEditFees} className="p-6 space-y-4">
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2">
                    New Total Fees (Rs.) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number" step="0.01" min={editFeeTarget.paidAmount}
                    value={editFeesData.totalFees}
                    onChange={e => setEditFeesData({ ...editFeesData, totalFees: e.target.value })}
                    className="input-field" required
                  />
                  <p className="text-codeat-gray/60 text-xs mt-1">
                    Minimum: {fmt(editFeeTarget.paidAmount)} (already paid amount)
                  </p>
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2">Notes</label>
                  <textarea
                    value={editFeesData.notes}
                    onChange={e => setEditFeesData({ ...editFeesData, notes: e.target.value })}
                    className="input-field" rows="2" placeholder="Optional notes..."
                  />
                </div>
                <div className="flex gap-3 pt-2 border-t border-codeat-muted/30">
                  <button type="submit" disabled={editFeesSubmitting}
                    className="flex-1 py-3 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {editFeesSubmitting ? (
                      <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</>
                    ) : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => { setShowEditFeesModal(false); setEditFeeTarget(null); }} disabled={editFeesSubmitting}
                    className="flex-1 py-3 bg-codeat-muted/50 text-codeat-silver rounded-xl font-semibold hover:bg-codeat-muted transition border border-codeat-muted/30 disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── DELETE PAYMENT MODAL ── */}
        {showDeletePaymentModal && deletePaymentTarget && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-codeat-mid rounded-2xl border border-red-500/30 w-full max-w-md shadow-2xl">
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-codeat-silver mb-1">Delete Payment</h3>
                <p className="text-codeat-gray text-sm mb-1">This will reverse the payment of</p>
                <p className="text-red-400 font-bold text-xl mb-1">{fmt(deletePaymentTarget.payment.amount)}</p>
                <p className="text-codeat-gray/60 text-xs mb-1">
                  Receipt: {deletePaymentTarget.payment.receiptNumber || '—'}
                </p>
                <p className="text-codeat-gray/60 text-xs mb-5">
                  The paid amount will be reduced and remaining balance will increase accordingly.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleDeletePayment} disabled={deletePaymentSubmitting}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {deletePaymentSubmitting ? (
                      <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Deleting...</>
                    ) : 'Yes, Delete'}
                  </button>
                  <button onClick={() => { setShowDeletePaymentModal(false); setDeletePaymentTarget(null); }} disabled={deletePaymentSubmitting}
                    className="flex-1 py-3 bg-codeat-muted/50 text-codeat-silver rounded-xl font-semibold hover:bg-codeat-muted transition border border-codeat-muted/30 disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REMINDER MODAL ── */}
        {showReminderModal && reminderTarget && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-codeat-mid rounded-2xl border border-amber-500/30 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-codeat-muted/30">
                <div>
                  <h2 className="text-xl font-bold text-codeat-silver flex items-center gap-2">
                    <span>🔔</span> Send Fees Reminder
                  </h2>
                  <p className="text-codeat-gray text-sm mt-0.5">{reminderTarget.employeeName} · {reminderTarget.employeeCode}</p>
                </div>
                <button onClick={() => { setShowReminderModal(false); setReminderTarget(null); }}
                  className="p-2 hover:bg-codeat-muted/50 rounded-lg transition text-codeat-gray hover:text-codeat-silver">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Current fees summary */}
              <div className="mx-5 mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: 'Total Fees', value: fmt(reminderTarget.totalFees), color: 'text-codeat-silver' },
                  { label: 'Paid', value: fmt(reminderTarget.paidAmount), color: 'text-green-400' },
                  { label: 'Remaining', value: fmt(reminderTarget.remainingAmount), color: 'text-red-400' },
                ].map(s => (
                  <div key={s.label} className="bg-codeat-dark/50 rounded-xl p-3 border border-codeat-muted/20 text-center">
                    <p className="text-codeat-gray text-[10px] uppercase tracking-wider mb-1">{s.label}</p>
                    <p className={`${s.color} font-bold text-sm`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendReminder} className="p-5 space-y-4">

                {/* Amount to request — REQUIRED */}
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2">
                    Amount to Request <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={reminderTarget.remainingAmount}
                    value={reminderData.requestAmount}
                    onChange={e => setReminderData({ ...reminderData, requestAmount: e.target.value })}
                    className="input-field"
                    placeholder={`Max: ${fmt(reminderTarget.remainingAmount)}`}
                    required
                  />
                  <p className="text-codeat-gray/60 text-xs mt-1">
                    Maximum payable: {fmt(reminderTarget.remainingAmount)}
                  </p>
                </div>

                {/* Live preview — after this payment */}
                {reminderData.requestAmount && parseFloat(reminderData.requestAmount) > 0 && parseFloat(reminderData.requestAmount) <= reminderTarget.remainingAmount && (
                  <div className="bg-[#0d2f32] border border-[#1A656D]/40 rounded-xl p-4 space-y-2">
                    <p className="text-[#7dd3d8] text-xs font-bold uppercase tracking-wider mb-3">📊 After This Payment</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Total Fees</span>
                      <span className="text-white font-semibold">{fmt(reminderTarget.totalFees)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Already Paid</span>
                      <span className="text-green-400 font-semibold">{fmt(reminderTarget.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-300 font-semibold">Pay Now (Requested)</span>
                      <span className="text-amber-300 font-bold">{fmt(parseFloat(reminderData.requestAmount))}</span>
                    </div>
                    <div className="h-px bg-white/10"/>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Balance After Payment</span>
                      <span className={`font-bold ${(reminderTarget.remainingAmount - parseFloat(reminderData.requestAmount)) <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {fmt(Math.max(0, reminderTarget.remainingAmount - parseFloat(reminderData.requestAmount)))}
                      </span>
                    </div>
                    {(reminderTarget.remainingAmount - parseFloat(reminderData.requestAmount)) <= 0 && (
                      <p className="text-green-400 text-xs text-center font-semibold">✅ Fees will be fully cleared!</p>
                    )}
                  </div>
                )}

                {/* Due date */}
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2">
                    Pay By Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={reminderData.dueDate}
                    onChange={e => setReminderData({ ...reminderData, dueDate: e.target.value })}
                    className="input-field"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                {/* Note */}
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2">
                    Note to Intern <span className="text-codeat-gray text-xs font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={reminderData.notes}
                    onChange={e => setReminderData({ ...reminderData, notes: e.target.value })}
                    className="input-field resize-none"
                    rows={2}
                    placeholder="e.g. Please clear dues before month end..."
                  />
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300">
                  📧 Email will be sent to <strong>{reminderTarget.email}</strong> with full payment breakdown.
                </div>

                <div className="flex gap-3 pt-1 border-t border-codeat-muted/30">
                  <button type="submit" disabled={reminderSending}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {reminderSending
                      ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Sending…</>
                      : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>Send Reminder</>
                    }
                  </button>
                  <button type="button" onClick={() => { setShowReminderModal(false); setReminderTarget(null); }} disabled={reminderSending}
                    className="flex-1 py-3 bg-codeat-muted/50 text-codeat-silver rounded-xl font-semibold hover:bg-codeat-muted transition border border-codeat-muted/30 disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
                    className="flex-1 py-3 bg-codeat-muted/50 text-codeat-silver rounded-xl font-semibold hover:bg-codeat-muted transition border border-codeat-muted/30 disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

