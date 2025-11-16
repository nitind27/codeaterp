import XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Export to Excel
export function exportToExcel(data, filename = 'export.xlsx') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}

// Export to CSV
export function exportToCSV(data, filename = 'export.csv') {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export to PDF
export function exportToPDF(data, title, filename = 'export.pdf') {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);

  // Add table
  doc.autoTable({
    startY: 25,
    head: [Object.keys(data[0] || {})],
    body: data.map(row => Object.values(row)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [52, 74, 81] } // codeat-teal
  });

  doc.save(filename);
}

// Export attendance report
export function exportAttendanceReport(attendance, format = 'excel') {
  const data = attendance.map(att => ({
    'Employee ID': att.employeeCode,
    'Employee Name': att.employeeName,
    'Date': new Date(att.date).toLocaleDateString(),
    'Clock In': att.clockIn || '-',
    'Clock Out': att.clockOut || '-',
    'Total Hours': att.totalHours || '-',
    'Status': att.status
  }));

  const filename = `attendance_report_${new Date().toISOString().split('T')[0]}`;

  if (format === 'excel') {
    exportToExcel(data, `${filename}.xlsx`);
  } else if (format === 'csv') {
    exportToCSV(data, `${filename}.csv`);
  } else if (format === 'pdf') {
    exportToPDF(data, 'Attendance Report', `${filename}.pdf`);
  }
}

// Export employee list
export function exportEmployeeList(employees, format = 'excel') {
  const data = employees.map(emp => ({
    'Employee ID': emp.employeeId,
    'Name': emp.fullName,
    'Email': emp.email,
    'Department': emp.department || '-',
    'Designation': emp.designation || '-',
    'Joining Date': emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '-',
    'Status': emp.isActive ? 'Active' : 'Inactive'
  }));

  const filename = `employees_${new Date().toISOString().split('T')[0]}`;

  if (format === 'excel') {
    exportToExcel(data, `${filename}.xlsx`);
  } else if (format === 'csv') {
    exportToCSV(data, `${filename}.csv`);
  } else if (format === 'pdf') {
    exportToPDF(data, 'Employee List', `${filename}.pdf`);
  }
}

// Export leave report
export function exportLeaveReport(leaves, format = 'excel') {
  const data = leaves.map(leave => ({
    'Employee ID': leave.employeeCode,
    'Employee Name': leave.employeeName,
    'Leave Type': leave.leaveTypeName,
    'Start Date': new Date(leave.startDate).toLocaleDateString(),
    'End Date': new Date(leave.endDate).toLocaleDateString(),
    'Total Days': leave.totalDays,
    'Status': leave.status,
    'Applied Date': new Date(leave.appliedAt).toLocaleDateString()
  }));

  const filename = `leave_report_${new Date().toISOString().split('T')[0]}`;

  if (format === 'excel') {
    exportToExcel(data, `${filename}.xlsx`);
  } else if (format === 'csv') {
    exportToCSV(data, `${filename}.csv`);
  } else if (format === 'pdf') {
    exportToPDF(data, 'Leave Report', `${filename}.pdf`);
  }
}

