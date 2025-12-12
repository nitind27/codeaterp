import pool from '../../../../lib/db.js';
import { authenticate } from '../../../../lib/auth.js';
import { handleOptions, errorResponse, successResponse } from '../cors.js';

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return handleOptions();
}

// Get dashboard data for Flutter app
export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status, {
        sessionExpired: authResult.sessionExpired || false
      });
    }

    const { user } = authResult;
    const today = new Date().toISOString().split('T')[0];

    // Get employee info
    const [employees] = await pool.execute(
      `SELECT e.*, u.email, u.role 
       FROM employees e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.user_id = ?`,
      [user.id]
    );

    const employee = employees.length > 0 ? employees[0] : null;

    // Get today's attendance
    let todayAttendance = null;
    if (employee) {
      const [attendance] = await pool.execute(
        'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
        [employee.id, today]
      );
      if (attendance.length > 0) {
        todayAttendance = {
          hasClockedIn: !!attendance[0].clock_in,
          hasClockedOut: !!attendance[0].clock_out,
          clockIn: attendance[0].clock_in,
          clockOut: attendance[0].clock_out,
          totalHours: attendance[0].total_hours,
          status: attendance[0].status
        };
      }
    }

    // Get pending leave count
    let pendingLeaveCount = 0;
    if (employee) {
      const [leaves] = await pool.execute(
        'SELECT COUNT(*) as count FROM leave_applications WHERE employee_id = ? AND status = ?',
        [employee.id, 'pending']
      );
      pendingLeaveCount = leaves[0].count;
    }

    // Get my tasks count
    let myTasksStats = { total: 0, todo: 0, inProgress: 0, done: 0 };
    if (employee) {
      const [tasks] = await pool.execute(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
         FROM tasks WHERE assigned_to = ?`,
        [employee.id]
      );
      myTasksStats = {
        total: tasks[0].total || 0,
        todo: tasks[0].todo || 0,
        inProgress: tasks[0].in_progress || 0,
        done: tasks[0].done || 0
      };
    }

    // Get upcoming holidays
    const [holidays] = await pool.execute(
      `SELECT * FROM holidays 
       WHERE end_date >= CURRENT_DATE() 
       ORDER BY start_date ASC LIMIT 3`
    );

    // Get leave balance summary
    let leaveBalance = [];
    if (employee) {
      const currentYear = new Date().getFullYear();
      const [balance] = await pool.execute(
        `SELECT lb.*, lt.name as leave_type_name, lt.code as leave_type_code
         FROM leave_balance lb
         JOIN leave_types lt ON lb.leave_type_id = lt.id
         WHERE lb.employee_id = ? AND lb.year = ?`,
        [employee.id, currentYear]
      );
      leaveBalance = balance.map(b => ({
        leaveType: b.leave_type_name,
        code: b.leave_type_code,
        total: b.total_days,
        used: b.used_days,
        available: b.total_days - b.used_days - b.pending_days
      }));
    }

    // Admin/HR specific stats
    let adminStats = null;
    if (user.role === 'admin' || user.role === 'hr') {
      const [totalEmployees] = await pool.execute(
        'SELECT COUNT(*) as count FROM employees e JOIN users u ON e.user_id = u.id WHERE u.is_active = TRUE'
      );
      const [presentToday] = await pool.execute(
        'SELECT COUNT(DISTINCT employee_id) as count FROM attendance WHERE date = ? AND status = ?',
        [today, 'present']
      );
      const [pendingLeaves] = await pool.execute(
        'SELECT COUNT(*) as count FROM leave_applications WHERE status = ?',
        ['pending']
      );
      const [activeProjects] = await pool.execute(
        "SELECT COUNT(*) as count FROM projects WHERE status IN ('planning', 'in_progress')"
      );

      adminStats = {
        totalEmployees: totalEmployees[0].count,
        presentToday: presentToday[0].count,
        pendingLeaves: pendingLeaves[0].count,
        activeProjects: activeProjects[0].count
      };
    }

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: employee ? {
          id: employee.id,
          employeeId: employee.employee_id,
          firstName: employee.first_name,
          lastName: employee.last_name,
          fullName: `${employee.first_name} ${employee.last_name}`,
          department: employee.department,
          designation: employee.designation,
          avatar: employee.avatar
        } : null
      },
      todayAttendance,
      pendingLeaveCount,
      myTasksStats,
      leaveBalance,
      upcomingHolidays: holidays.map(h => ({
        id: h.id,
        title: h.title,
        startDate: h.start_date,
        endDate: h.end_date,
        totalDays: h.total_days
      })),
      adminStats,
      serverDate: today
    });
  } catch (error) {
    console.error('Flutter Dashboard error:', error);
    return errorResponse('Internal server error', 500);
  }
}

