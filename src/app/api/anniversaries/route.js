import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authorize } from '../../../../lib/auth.js';

// Get upcoming birthdays, work anniversaries, and company anniversary (next 3 days)
export async function GET(req) {
  try {
    const authResult = await authorize('admin', 'hr', 'project_manager', 'employee', 'intern')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    // Fetch upcoming birthdays (within next 3 days)
    // Calculate days until birthday for each employee, handling year rollover
    const [birthdays] = await pool.execute(`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.date_of_birth,
        e.department,
        e.designation,
        e.avatar,
        CASE
          WHEN DATE(CONCAT(YEAR(CURDATE()), '-', MONTH(e.date_of_birth), '-', DAY(e.date_of_birth))) >= CURDATE()
          THEN DATEDIFF(DATE(CONCAT(YEAR(CURDATE()), '-', MONTH(e.date_of_birth), '-', DAY(e.date_of_birth))), CURDATE())
          ELSE DATEDIFF(DATE(CONCAT(YEAR(CURDATE()) + 1, '-', MONTH(e.date_of_birth), '-', DAY(e.date_of_birth))), CURDATE())
        END as days_until
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.date_of_birth IS NOT NULL
        AND u.is_active = TRUE
      HAVING days_until >= 0 AND days_until <= 3
      ORDER BY days_until, MONTH(e.date_of_birth), DAY(e.date_of_birth)
      LIMIT 20
    `);

    // Fetch upcoming work anniversaries (within next 3 days)
    const [anniversaries] = await pool.execute(`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.joining_date,
        e.department,
        e.designation,
        e.avatar,
        CASE
          WHEN DATE(CONCAT(YEAR(CURDATE()), '-', MONTH(e.joining_date), '-', DAY(e.joining_date))) >= CURDATE()
          THEN DATEDIFF(DATE(CONCAT(YEAR(CURDATE()), '-', MONTH(e.joining_date), '-', DAY(e.joining_date))), CURDATE())
          ELSE DATEDIFF(DATE(CONCAT(YEAR(CURDATE()) + 1, '-', MONTH(e.joining_date), '-', DAY(e.joining_date))), CURDATE())
        END as days_until,
        YEAR(CURDATE()) - YEAR(e.joining_date) as years_of_service
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.joining_date IS NOT NULL
        AND u.is_active = TRUE
      HAVING days_until >= 0 AND days_until <= 3
      ORDER BY days_until, MONTH(e.joining_date), DAY(e.joining_date)
      LIMIT 20
    `);

    // Get company anniversary date from system settings
    const [settings] = await pool.execute(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['company_anniversary_date']
    );

    let companyAnniversary = null;
    if (settings.length > 0 && settings[0].setting_value) {
      const anniversaryDate = new Date(settings[0].setting_value);
      const currentYear = today.getFullYear();
      const anniversaryThisYear = new Date(currentYear, anniversaryDate.getMonth(), anniversaryDate.getDate());
      const anniversaryNextYear = new Date(currentYear + 1, anniversaryDate.getMonth(), anniversaryDate.getDate());
      
      let daysUntil = 0;
      if (anniversaryThisYear >= today) {
        daysUntil = Math.ceil((anniversaryThisYear - today) / (1000 * 60 * 60 * 24));
      } else {
        daysUntil = Math.ceil((anniversaryNextYear - today) / (1000 * 60 * 60 * 24));
      }

      if (daysUntil >= 0 && daysUntil <= 3) {
        companyAnniversary = {
          date: settings[0].setting_value,
          daysUntil: daysUntil,
          years: currentYear - anniversaryDate.getFullYear()
        };
      }
    }

    // Format birthdays
    const formattedBirthdays = birthdays.map(b => {
      const birthDate = new Date(b.date_of_birth);
      const currentYear = today.getFullYear();
      const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
      
      // Calculate age - they'll be this age on their birthday
      let age = currentYear - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age = age - 1;
      }
      // On their birthday, they'll be age + 1
      age = age + 1;

      return {
        id: b.id,
        name: `${b.first_name} ${b.last_name}`,
        firstName: b.first_name,
        lastName: b.last_name,
        department: b.department,
        designation: b.designation,
        avatar: b.avatar,
        date: b.date_of_birth,
        daysUntil: b.days_until,
        age: age,
        type: 'birthday'
      };
    });

    // Format work anniversaries
    const formattedAnniversaries = anniversaries.map(a => {
      return {
        id: a.id,
        name: `${a.first_name} ${a.last_name}`,
        firstName: a.first_name,
        lastName: a.last_name,
        department: a.department,
        designation: a.designation,
        avatar: a.avatar,
        date: a.joining_date,
        daysUntil: a.days_until,
        yearsOfService: a.years_of_service,
        type: 'work_anniversary'
      };
    });

    return NextResponse.json({
      success: true,
      birthdays: formattedBirthdays,
      workAnniversaries: formattedAnniversaries,
      companyAnniversary: companyAnniversary
    });
  } catch (error) {
    console.error('Get anniversaries error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

