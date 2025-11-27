import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authorize } from '../../../../lib/auth.js';
import { logActivity } from '../../../../lib/logger.js';

// Get all interviews
export async function GET(req) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const interviewerId = searchParams.get('interviewer_id');
    const search = searchParams.get('search');

    let query = `
      SELECT i.*, 
             e.first_name as interviewer_first_name, 
             e.last_name as interviewer_last_name,
             u.email as created_by_email
      FROM interviews i
      LEFT JOIN employees e ON i.interviewer_id = e.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (interviewerId) {
      query += ' AND i.interviewer_id = ?';
      params.push(interviewerId);
    }

    if (search) {
      query += ' AND (i.candidate_name LIKE ? OR i.candidate_email LIKE ? OR i.position LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY i.interview_date DESC, i.created_at DESC';

    const [interviews] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      interviews: interviews.map(interview => ({
        id: interview.id,
        candidateName: interview.candidate_name,
        candidateEmail: interview.candidate_email,
        candidatePhone: interview.candidate_phone,
        position: interview.position,
        interviewDate: interview.interview_date,
        interviewerId: interview.interviewer_id,
        interviewerName: interview.interviewer_first_name && interview.interviewer_last_name
          ? `${interview.interviewer_first_name} ${interview.interviewer_last_name}`
          : null,
        status: interview.status,
        result: interview.result,
        notes: interview.notes,
        resumePath: interview.resume_path,
        createdBy: interview.created_by,
        createdByEmail: interview.created_by_email,
        createdAt: interview.created_at,
        updatedAt: interview.updated_at
      }))
    });
  } catch (error) {
    console.error('Get interviews error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create interview
export async function POST(req) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const data = await req.json();
    const { 
      candidateName, 
      candidateEmail, 
      candidatePhone, 
      position, 
      interviewDate, 
      interviewerId, 
      status, 
      notes 
    } = data;

    if (!candidateName) {
      return NextResponse.json(
        { error: 'Candidate name is required' },
        { status: 400 }
      );
    }

    if (!interviewDate) {
      return NextResponse.json(
        { error: 'Interview date is required' },
        { status: 400 }
      );
    }

    // Validate interviewer if provided
    if (interviewerId) {
      const [interviewer] = await pool.execute(
        'SELECT id FROM employees WHERE id = ?',
        [interviewerId]
      );
      if (interviewer.length === 0) {
        return NextResponse.json(
          { error: 'Invalid interviewer selected' },
          { status: 400 }
        );
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO interviews 
       (candidate_name, candidate_email, candidate_phone, position, interview_date, 
        interviewer_id, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        candidateName,
        candidateEmail || null,
        candidatePhone || null,
        position || null,
        interviewDate,
        interviewerId || null,
        status || 'scheduled',
        notes || null,
        user.id
      ]
    );

    await logActivity(user.id, 'create_interview', 'interview', result.insertId, 
      `Scheduled interview for ${candidateName}`, req);

    return NextResponse.json({
      success: true,
      message: 'Interview scheduled successfully',
      interview: {
        id: result.insertId,
        candidateName
      }
    });
  } catch (error) {
    console.error('Create interview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

