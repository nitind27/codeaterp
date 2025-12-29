'use client';

import { useState, useEffect } from 'react';
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

  const downloadReceipt = async (paymentId) => {
    try {
      if (!paymentId) {
        toast.error('Payment ID is required');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/fees/receipt/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load receipt' }));
        toast.error(errorData.error || 'Failed to load receipt');
        return;
      }

      const data = await response.json();
      if (!data.success || !data.receipt) {
        toast.error(data.error || 'Failed to load receipt data');
        return;
      }

      const receipt = data.receipt;

      // Validate receipt data
      if (!receipt.receiptNumber || !receipt.paymentDate || !receipt.intern || !receipt.payment || !receipt.fees) {
        toast.error('Invalid receipt data');
        return;
      }

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = margin;

      // Header
      doc.setFillColor(26, 101, 109); // codeat-teal
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT RECEIPT', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Receipt No: ${receipt.receiptNumber}`, pageWidth / 2, 30, { align: 'center' });

      yPos = 50;
      doc.setTextColor(0, 0, 0);

      // Company Info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Codeat Infotech', margin, yPos);
      doc.text('ERP System', margin, yPos + 5);

      // Date
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', pageWidth - margin - 40, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(receipt.paymentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }), pageWidth - margin, yPos);

      yPos += 20;

      // Intern Details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Intern Details:', margin, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Name: ${receipt.intern.name}`, margin, yPos);
      yPos += 6;
      doc.text(`Employee ID: ${receipt.intern.employeeId}`, margin, yPos);
      yPos += 6;
      if (receipt.intern.email) {
        doc.text(`Email: ${receipt.intern.email}`, margin, yPos);
        yPos += 6;
      }

      yPos += 10;

      // Payment Details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Payment Details:', margin, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Amount Paid: ₹${receipt.payment.amount.toFixed(2)}`, margin, yPos);
      yPos += 6;
      doc.text(`Payment Method: ${receipt.payment.paymentMethod.charAt(0).toUpperCase() + receipt.payment.paymentMethod.slice(1).replace('_', ' ')}`, margin, yPos);
      yPos += 6;
      if (receipt.payment.transactionId) {
        doc.text(`Transaction ID: ${receipt.payment.transactionId}`, margin, yPos);
        yPos += 6;
      }

      yPos += 10;

      // Fees Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Fees Summary:', margin, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Total Fees: ₹${receipt.fees.totalFees.toFixed(2)}`, margin, yPos);
      yPos += 6;
      doc.text(`Amount Paid: ₹${receipt.fees.paidAmount.toFixed(2)}`, margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(211, 47, 47); // Red for remaining
      doc.text(`Remaining Amount: ₹${receipt.fees.remainingAmount.toFixed(2)}`, margin, yPos);

      yPos += 15;
      doc.setTextColor(0, 0, 0);

      // Payment History
      if (receipt.paymentHistory && receipt.paymentHistory.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Payment History:', margin, yPos);
        yPos += 8;

        // Table header
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Date', margin + 5, yPos);
        doc.text('Amount', margin + 60, yPos);
        doc.text('Method', margin + 110, yPos);
        yPos += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        receipt.paymentHistory.slice(0, 5).forEach(payment => {
          if (yPos > 250) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), margin + 5, yPos);
          doc.text(`₹${payment.amount.toFixed(2)}`, margin + 60, yPos);
          doc.text(payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1).replace('_', ' '), margin + 110, yPos);
          yPos += 6;
        });
      }

      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('This is a computer-generated receipt.', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString('en-US')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save PDF
      doc.save(`Receipt-${receipt.receiptNumber}.pdf`);
      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(error.message || 'Error downloading receipt. Please try again.');
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
                    <tr key={fee.id} className="hover:bg-codeat-dark/40 transition-colors duration-200">
                      {isAdmin && (
                        <td className="px-4 sm:px-6 py-4">
                          <div>
                            <div className="text-codeat-silver font-semibold">{fee.employeeName}</div>
                            <div className="text-codeat-gray text-xs">{fee.employeeCode} • {fee.email}</div>
                          </div>
                        </td>
                      )}
                      <td className="px-4 sm:px-6 py-4 text-codeat-silver font-medium">
                        ₹{fee.totalFees.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-green-400 font-semibold">
                        ₹{fee.paidAmount.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-red-400 font-semibold">
                        ₹{fee.remainingAmount.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-gray text-sm">
                        {fee.payments.length} payment{fee.payments.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex gap-2">
                          {isAdmin && (
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
                              className="px-3 py-1.5 bg-codeat-accent text-white rounded-lg hover:bg-codeat-accent/80 transition text-xs font-semibold"
                            >
                              Add Payment
                            </button>
                          )}
                          {fee.payments.length > 0 && (
                            <button
                              onClick={() => downloadReceipt(fee.payments[0].id)}
                              className="px-3 py-1.5 bg-codeat-teal text-white rounded-lg hover:bg-codeat-teal/80 transition text-xs font-semibold"
                            >
                              Download Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
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
                    <div className="text-codeat-silver font-semibold">₹{payment.amount.toFixed(2)}</div>
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
                      <span className="text-codeat-silver font-semibold ml-2">₹{selectedIntern.totalFees.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-codeat-gray">Paid:</span>
                      <span className="text-green-400 font-semibold ml-2">₹{selectedIntern.paidAmount.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-codeat-gray">Remaining:</span>
                      <span className="text-red-400 font-semibold ml-2">₹{selectedIntern.remainingAmount.toFixed(2)}</span>
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
                    Maximum: ₹{selectedIntern.remainingAmount.toFixed(2)}
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
      </div>
    </Layout>
  );
}

