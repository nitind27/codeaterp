# Flutter API Documentation

This documentation covers all the APIs available for Flutter mobile app integration.

## Base URL

All Flutter APIs are available at:
```
http://your-server:3000/flutter_api/
```

## Authentication

Most APIs require authentication via Bearer token. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## CORS Support

All Flutter APIs include proper CORS headers and support OPTIONS preflight requests.

---

## 🔐 Authentication APIs

### 1. Login
**POST** `/flutter_api/auth/login`

Login with email and password. Supports optional location verification.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your_password",
  "location": {
    "latitude": 21.1877888,
    "longitude": 72.8367104
  },
  "skipLocationCheck": false,
  "deviceInfo": "Flutter App - Android 12"
}
```

**Parameters:**
- `email` (required): User's email address
- `password` (required): User's password
- `location` (optional): Current GPS location
- `skipLocationCheck` (optional): Set to `true` to bypass location verification for testing
- `deviceInfo` (optional): Device information for logging

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "sessionToken": "session_token_here",
  "previousSessionLoggedOut": false,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "employee",
    "employee": {
      "id": 1,
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "department": "Engineering",
      "designation": "Developer",
      "avatar": null
    }
  },
  "officeLocation": {
    "latitude": 21.1877888,
    "longitude": 72.8367104,
    "radiusInKm": 5
  }
}
```

**Error Response (403 - Location Required):**
```json
{
  "success": false,
  "error": "Location access is required for employees and interns.",
  "locationRequired": true,
  "officeLocation": { ... }
}
```

---

### 2. Get Current User
**GET** `/flutter_api/auth/me`

Get the currently authenticated user's details.

**Headers:** Authorization: Bearer <token>

**Success Response:**
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

---

### 3. Register User (Admin/HR only)
**POST** `/flutter_api/auth/register`

Register a new user. Requires admin or HR role.

**Headers:** Authorization: Bearer <token>

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "employee",
  "employeeData": {
    "first_name": "Jane",
    "last_name": "Doe",
    "department": "Engineering",
    "designation": "Developer"
  }
}
```

---

## 📊 Dashboard API

### Get Dashboard Data
**GET** `/flutter_api/dashboard`

Get comprehensive dashboard data for the current user.

**Success Response:**
```json
{
  "success": true,
  "user": { ... },
  "todayAttendance": {
    "hasClockedIn": true,
    "hasClockedOut": false,
    "clockIn": "09:30",
    "clockOut": null,
    "totalHours": null,
    "status": "present"
  },
  "pendingLeaveCount": 2,
  "myTasksStats": {
    "total": 10,
    "todo": 3,
    "inProgress": 5,
    "done": 2
  },
  "leaveBalance": [...],
  "upcomingHolidays": [...],
  "adminStats": { ... },
  "serverDate": "2025-12-12"
}
```

---

## ⏰ Attendance APIs

### 1. Get Attendance Records
**GET** `/flutter_api/attendance`

**Query Parameters:**
- `employee_id` (optional): Filter by employee ID
- `start_date` (optional): Filter from date (YYYY-MM-DD)
- `end_date` (optional): Filter to date (YYYY-MM-DD)
- `status` (optional): Filter by status (present, absent, half_day)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

---

### 2. Get Today's Attendance
**GET** `/flutter_api/attendance/today`

Get current user's attendance status for today.

**Success Response:**
```json
{
  "success": true,
  "hasClockedIn": true,
  "hasClockedOut": false,
  "attendance": {
    "id": 123,
    "date": "2025-12-12",
    "clockIn": "09:30",
    "clockOut": null,
    "status": "present"
  },
  "date": "2025-12-12"
}
```

---

### 3. Clock In
**POST** `/flutter_api/attendance`

Clock in for today.

**Request Body:**
```json
{
  "location": {
    "latitude": 21.1877888,
    "longitude": 72.8367104
  },
  "skipLocationCheck": false
}
```

---

### 4. Clock Out
**PUT** `/flutter_api/attendance`

Clock out for today.

**Request Body:**
```json
{
  "location": {
    "latitude": 21.1877888,
    "longitude": 72.8367104
  },
  "skipLocationCheck": false
}
```

---

## 👥 Employee APIs

### 1. Get All Employees (Admin/HR/PM only)
**GET** `/flutter_api/employees`

**Query Parameters:**
- `department` (optional): Filter by department
- `status` (optional): Filter by status (active/inactive)
- `search` (optional): Search by name, email, or employee ID
- `page`, `limit` for pagination

---

### 2. Get Single Employee
**GET** `/flutter_api/employees/{id}`

---

### 3. Create Employee (Admin/HR only)
**POST** `/flutter_api/employees`

**Request Body:**
```json
{
  "email": "newemployee@example.com",
  "password": "password123",
  "role": "employee",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+91-9876543210",
  "department": "Engineering",
  "designation": "Developer",
  "joining_date": "2025-01-01"
}
```

---

### 4. Update Employee
**PUT** `/flutter_api/employees/{id}`

---

### 5. Delete Employee (Admin/HR only)
**DELETE** `/flutter_api/employees/{id}`

---

## 🏖️ Leave APIs

### 1. Get Leave Applications
**GET** `/flutter_api/leave`

**Query Parameters:**
- `employee_id`, `status`, `start_date`, `end_date`, `page`, `limit`

---

### 2. Apply for Leave
**POST** `/flutter_api/leave`

**Request Body:**
```json
{
  "leaveTypeId": 1,
  "startDate": "2025-12-20",
  "endDate": "2025-12-21",
  "durationType": "full_day",
  "reason": "Personal work"
}
```

**Duration Types:**
- `full_day`: Full day leave
- `half_day`: Half day (requires `halfDaySlot`: "before_lunch" or "after_lunch")
- `hourly`: Hourly leave (requires `startTime` and `endTime`)

---

### 3. Approve/Reject Leave (Admin/HR only)
**PUT** `/flutter_api/leave/{id}`

**Request Body:**
```json
{
  "status": "approved",
  "rejectionReason": "Optional reason for rejection"
}
```

---

### 4. Get Leave Balance
**GET** `/flutter_api/leave/balance`

**Query Parameters:**
- `employee_id` (optional): Get balance for specific employee

---

### 5. Get Leave Types
**GET** `/flutter_api/leave/types`

---

## 📋 Project APIs

### 1. Get All Projects
**GET** `/flutter_api/projects`

**Query Parameters:**
- `status`, `manager_id`, `search`, `page`, `limit`

---

### 2. Get Single Project
**GET** `/flutter_api/projects/{id}`

Includes project members and task statistics.

---

### 3. Create Project (Admin/HR/PM only)
**POST** `/flutter_api/projects`

---

### 4. Update Project
**PUT** `/flutter_api/projects/{id}`

---

### 5. Delete Project (Admin/HR only)
**DELETE** `/flutter_api/projects/{id}`

---

## ✅ Task APIs

### 1. Get All Tasks
**GET** `/flutter_api/tasks`

**Query Parameters:**
- `project_id`, `assigned_to`, `status`, `priority`, `page`, `limit`

---

### 2. Get Single Task
**GET** `/flutter_api/tasks/{id}`

---

### 3. Create Task (Admin/HR/PM only)
**POST** `/flutter_api/tasks`

**Request Body:**
```json
{
  "projectId": 1,
  "title": "Task Title",
  "description": "Task description",
  "assignedTo": 5,
  "status": "todo",
  "priority": "high",
  "dueDate": "2025-12-31",
  "estimatedHours": 8
}
```

---

### 4. Update Task
**PUT** `/flutter_api/tasks/{id}`

Employees can only update `status` and `actual_hours` for their assigned tasks.

---

### 5. Delete Task (Admin/HR/PM only)
**DELETE** `/flutter_api/tasks/{id}`

---

## 🎉 Holiday APIs

### 1. Get Holidays
**GET** `/flutter_api/holidays`

**Query Parameters:**
- `year` (optional): Filter by year
- `upcoming` (optional): Set to "true" for upcoming holidays only

---

### 2. Create Holiday (Admin/HR only)
**POST** `/flutter_api/holidays`

---

### 3. Update Holiday (Admin/HR only)
**PUT** `/flutter_api/holidays/{id}`

---

### 4. Delete Holiday (Admin/HR only)
**DELETE** `/flutter_api/holidays/{id}`

---

## 🏆 Achievement APIs

### Get Achievements
**GET** `/flutter_api/achievements`

**Query Parameters:**
- `employee_id`, `year`

### Create Achievement (Admin/HR only)
**POST** `/flutter_api/achievements`

---

## 📝 Complaint APIs

### 1. Get Complaints
**GET** `/flutter_api/complaints`

Employees see only their own complaints. Admin/HR see all.

### 2. Submit Complaint
**POST** `/flutter_api/complaints`

**Request Body:**
```json
{
  "subject": "Complaint Subject",
  "description": "Detailed description",
  "category": "workplace",
  "priority": "medium"
}
```

---

## 🎂 Anniversaries API

### Get Upcoming Anniversaries
**GET** `/flutter_api/anniversaries`

Returns upcoming birthdays and work anniversaries (next 3 days).

---

## 🎤 Interview APIs (Admin/HR only)

### 1. Get Interviews
**GET** `/flutter_api/interviews`

### 2. Schedule Interview
**POST** `/flutter_api/interviews`

---

## 💬 Channel & Message APIs

### 1. Get Channels
**GET** `/flutter_api/channels`

### 2. Create Channel
**POST** `/flutter_api/channels`

### 3. Get Messages
**GET** `/flutter_api/messages?channelId={id}`

### 4. Send Message
**POST** `/flutter_api/messages`

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message here",
  "sessionExpired": false
}
```

### Common HTTP Status Codes:
- `200`: Success
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid/expired token)
- `403`: Forbidden (insufficient permissions or location check failed)
- `404`: Not Found
- `500`: Internal Server Error

---

## Flutter Implementation Tips

### 1. HTTP Client Setup
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiClient {
  static const String baseUrl = 'http://your-server:3000/flutter_api';
  String? _token;
  
  void setToken(String token) {
    _token = token;
  }
  
  Future<Map<String, dynamic>> get(String endpoint) async {
    final response = await http.get(
      Uri.parse('$baseUrl$endpoint'),
      headers: {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      },
    );
    return jsonDecode(response.body);
  }
  
  Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      },
      body: jsonEncode(body),
    );
    return jsonDecode(response.body);
  }
}
```

### 2. Location Permission (for Android)
Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### 3. Handle Session Expiry
Check for `sessionExpired: true` in error responses and redirect to login.

---

## Contact

For API issues or questions, contact the backend team.

