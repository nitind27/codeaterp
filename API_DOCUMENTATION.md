# Codeat Infotech ERP - API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### POST /api/auth/login
Login and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "employee",
    "employee": {
      "id": 1,
      "employeeId": "EMP123456",
      "firstName": "John",
      "lastName": "Doe",
      "department": "IT",
      "designation": "Developer"
    }
  }
}
```

### GET /api/auth/me
Get current user information.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "employee",
    "employee": { ... }
  }
}
```

### POST /api/auth/register
Register a new user (Admin/HR only).

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "employee",
  "employeeData": {
    "first_name": "Jane",
    "last_name": "Smith",
    "phone": "1234567890",
    "department": "HR",
    "designation": "HR Manager"
  }
}
```

---

## Employee Endpoints

### GET /api/employees
Get all employees (Admin/HR/PM only).

**Query Parameters:**
- `department` - Filter by department
- `status` - Filter by status (active/inactive)
- `search` - Search by name, email, or employee ID

**Response:**
```json
{
  "success": true,
  "employees": [
    {
      "id": 1,
      "employeeId": "EMP123456",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "department": "IT",
      "designation": "Developer",
      "isActive": true
    }
  ]
}
```

### GET /api/employees/:id
Get single employee details.

### PUT /api/employees/:id
Update employee (Admin/HR can update all fields, employees can update limited fields).

### DELETE /api/employees/:id
Delete employee (Admin/HR only).

---

## Attendance Endpoints

### GET /api/attendance
Get attendance records.

**Query Parameters:**
- `employee_id` - Filter by employee (Admin/HR only)
- `start_date` - Start date filter
- `end_date` - End date filter
- `status` - Filter by status

**Response:**
```json
{
  "success": true,
  "attendance": [
    {
      "id": 1,
      "employeeId": 1,
      "employeeName": "John Doe",
      "date": "2024-01-15",
      "clockIn": "09:00",
      "clockOut": "18:00",
      "totalHours": 8.5,
      "status": "present"
    }
  ]
}
```

### POST /api/attendance
Clock in.

**Request Body:**
```json
{
  "location": "Office"
}
```

### PUT /api/attendance
Clock out.

**Request Body:**
```json
{
  "location": "Office"
}
```

### PUT /api/attendance/:id
Update attendance record (Admin/HR only).

---

## Leave Endpoints

### GET /api/leave
Get leave applications.

**Query Parameters:**
- `employee_id` - Filter by employee (Admin/HR only)
- `status` - Filter by status (pending/approved/rejected)
- `start_date` - Start date filter
- `end_date` - End date filter

**Response:**
```json
{
  "success": true,
  "leaves": [
    {
      "id": 1,
      "employeeId": 1,
      "employeeName": "John Doe",
      "leaveTypeName": "Casual Leave",
      "startDate": "2024-01-20",
      "endDate": "2024-01-22",
      "totalDays": 3,
      "status": "pending",
      "reason": "Personal work"
    }
  ]
}
```

### POST /api/leave
Apply for leave.

**Request Body:**
```json
{
  "leaveTypeId": 1,
  "startDate": "2024-01-20",
  "endDate": "2024-01-22",
  "reason": "Personal work",
  "attachment": null
}
```

### PUT /api/leave/:id
Approve/Reject leave (Admin/HR only).

**Request Body:**
```json
{
  "status": "approved",
  "rejectionReason": null
}
```

### GET /api/leave/balance
Get leave balance for current year.

### GET /api/leave/types
Get all leave types.

---

## Project Endpoints

### GET /api/projects
Get all projects.

**Query Parameters:**
- `status` - Filter by status
- `manager_id` - Filter by project manager
- `search` - Search projects

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "id": 1,
      "projectCode": "PRO123456",
      "name": "Website Redesign",
      "description": "Redesign company website",
      "projectManagerId": 1,
      "managerName": "John Doe",
      "status": "active",
      "priority": "high",
      "startDate": "2024-01-01",
      "endDate": "2024-06-30"
    }
  ]
}
```

### POST /api/projects
Create project (Admin/HR/PM only).

**Request Body:**
```json
{
  "name": "Website Redesign",
  "description": "Redesign company website",
  "projectManagerId": 1,
  "clientName": "ABC Corp",
  "startDate": "2024-01-01",
  "endDate": "2024-06-30",
  "status": "planning",
  "priority": "high",
  "budget": 50000
}
```

### GET /api/projects/:id
Get single project with members.

### PUT /api/projects/:id
Update project.

### DELETE /api/projects/:id
Delete project (Admin/HR only).

---

## Task Endpoints

### GET /api/tasks
Get all tasks.

**Query Parameters:**
- `project_id` - Filter by project
- `assigned_to` - Filter by assigned employee
- `status` - Filter by status
- `priority` - Filter by priority

**Response:**
```json
{
  "success": true,
  "tasks": [
    {
      "id": 1,
      "projectId": 1,
      "projectName": "Website Redesign",
      "title": "Design homepage",
      "description": "Create new homepage design",
      "assignedTo": 2,
      "assignedName": "Jane Smith",
      "status": "in_progress",
      "priority": "high",
      "dueDate": "2024-01-25T10:00:00Z"
    }
  ]
}
```

### POST /api/tasks
Create task (Admin/HR/PM only).

**Request Body:**
```json
{
  "projectId": 1,
  "title": "Design homepage",
  "description": "Create new homepage design",
  "assignedTo": 2,
  "status": "todo",
  "priority": "high",
  "dueDate": "2024-01-25T10:00:00Z",
  "estimatedHours": 8
}
```

### GET /api/tasks/:id
Get single task.

### PUT /api/tasks/:id
Update task.

### DELETE /api/tasks/:id
Delete task (Admin/HR/PM only).

---

## Complaint Endpoints

### GET /api/complaints
Get all complaints.

**Query Parameters:**
- `status` - Filter by status
- `category` - Filter by category
- `priority` - Filter by priority

**Response:**
```json
{
  "success": true,
  "complaints": [
    {
      "id": 1,
      "employeeId": 1,
      "employeeName": "John Doe",
      "subject": "Workplace Issue",
      "description": "Description of complaint",
      "category": "workplace",
      "status": "open",
      "priority": "medium",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### POST /api/complaints
Create complaint.

**Request Body:**
```json
{
  "subject": "Workplace Issue",
  "description": "Description of complaint",
  "category": "workplace",
  "priority": "medium"
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message here"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Role-Based Access

- **admin**: Full access to all endpoints
- **hr**: Access to employees, attendance, leave, complaints, reports
- **project_manager**: Access to projects, tasks, team members
- **employee**: Access to own attendance, leave, tasks, complaints, profile
- **intern**: Same as employee with limited access

---

## Notes

1. All dates should be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
2. JWT tokens expire after 24 hours
3. Refresh tokens expire after 7 days
4. File uploads are handled via multipart/form-data
5. Pagination can be added to list endpoints as needed

