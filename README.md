# Codeat Infotech ERP System

A comprehensive Enterprise Resource Planning (ERP) web application built with Next.js, Tailwind CSS, MySQL, and Socket.io for real-time communication.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, HR, Project Manager, Employee, Intern)
- Secure password hashing with bcrypt
- Token refresh mechanism

### 👥 Employee Management
- Complete employee CRUD operations
- Employee profiles with documents
- Department and designation management
- Manager assignment
- Onboarding workflow

### ⏰ Attendance System
- Clock in/Clock out functionality
- Daily and monthly attendance tracking
- Attendance reports and exports
- Admin/HR can edit attendance records
- Optional geolocation tracking

### 📅 Leave Management
- Multiple leave types (Casual, Sick, Earned, Other)
- Leave application workflow
- Leave balance tracking
- Approval/Rejection by HR
- Leave history and reports

### 📁 Project & Task Management
- Project creation and management
- Task assignment and tracking
- Project member management
- Task status and priority management
- Timesheet entries

### 📝 Complaints & Grievances
- Employee complaint submission
- Status tracking (Open, In-Progress, Resolved)
- HR notes and internal attachments
- Priority management

### 💬 Real-time Group Discussions
- Socket.io powered real-time chat
- Project-based discussion channels
- Department channels
- Message history persistence
- Typing indicators

### 📊 Reporting & Exports
- Attendance reports (PDF/Excel/CSV)
- Employee lists export
- Leave reports
- Project reports
- Custom date range filters

### 🎂 Birthday Reminders
- Upcoming birthdays display
- Email reminders 1 week before birthday
- Automatic notification system

### 📈 Performance Management System
- Performance reviews and evaluations
- Goal setting and progress tracking
- KPI monitoring and measurement
- Competency and skills assessment
- Development planning

### 🎓 Training & Development
- Training courses management
- Employee certifications tracking
- Skills inventory and assessment
- Course enrollments and completion
- Learning paths and development plans

### 💰 Expense Management
- Expense claim submission
- Multi-level approval workflow
- Receipt attachment support
- Expense categories and policies
- Expense reporting and analytics

### 💼 Asset Management
- Company assets tracking
- Asset assignment to employees
- Maintenance scheduling
- Depreciation calculation
- Asset lifecycle management

### 📧 Email Notifications
- Onboarding emails
- Leave approval/rejection notifications
- Birthday reminders
- System notifications
- Configurable SMTP settings

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes, Node.js
- **Database**: MySQL 8.0+ (phpMyAdmin compatible)
- **Real-time**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **File Handling**: Multer
- **Export**: SheetJS (xlsx), jsPDF
- **Email**: Nodemailer

## Color Palette

The application uses a custom color palette based on the Codeat Infotech logo:

- **codeat-dark**: `#282b2f` (Primary background)
- **codeat-mid**: `#373c42` (Secondary background)
- **codeat-muted**: `#47494d` (Muted elements)
- **codeat-teal**: `#344a51` (Primary brand accent)
- **codeat-accent**: `#00b3c6` (Bright CTA accent)
- **codeat-silver**: `#e0e1e1` (Light text/highlights)
- **codeat-gray**: `#9da0a1` (Muted text)

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd codeaterp
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up database**
   - Create MySQL database: `codeat_erp`
   - Import schema: `database/schema.sql`
   - See `DEPLOYMENT.md` for detailed instructions

4. **Configure environment**
   - Copy `.env.example` to `.env`
   - Update database credentials
   - Set JWT secrets
   - Configure SMTP settings

5. **Run development server**
```bash
npm run dev
```

6. **Access the application**
   - Open `http://localhost:3000`
   - Login with default admin:
     - Email: `admin@codeat.com`
     - Password: `admin123`

## Project Structure

```
codeaterp/
├── database/
│   └── schema.sql          # MySQL database schema
├── lib/
│   ├── auth.js            # Authentication utilities
│   ├── db.js              # Database connection
│   ├── email.js           # Email utilities
│   ├── export.js          # Export utilities
│   ├── logger.js          # Activity logging
│   └── utils.js           # General utilities
├── public/                # Static assets
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   │   ├── auth/      # Authentication endpoints
│   │   │   ├── employees/ # Employee endpoints
│   │   │   ├── attendance/# Attendance endpoints
│   │   │   ├── leave/     # Leave endpoints
│   │   │   ├── projects/  # Project endpoints
│   │   │   ├── tasks/     # Task endpoints
│   │   │   └── complaints/# Complaint endpoints
│   │   ├── dashboard/     # Dashboard page
│   │   ├── login/         # Login page
│   │   ├── attendance/    # Attendance page
│   │   ├── leave/         # Leave page
│   │   └── ...
│   ├── components/
│   │   └── Layout.js     # Main layout component
│   └── ...
├── server.js              # Socket.io server
├── tailwind.config.js     # Tailwind configuration
├── package.json
├── API_DOCUMENTATION.md   # API documentation
└── DEPLOYMENT.md          # Deployment guide
```

## User Roles

### Admin
- Full system access
- User management
- System settings
- All reports and exports

### HR
- Employee management
- Leave approvals
- Attendance management
- Complaint handling
- Interview tracking
- Reports

### Project Manager
- Project management
- Task assignment
- Team management
- Project reports
- Project discussions

### Employee
- Personal dashboard
- Clock in/out
- Leave applications
- Task management
- Complaint submission
- Profile management

### Intern
- Similar to Employee
- Limited access to certain features

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- Rate limiting on APIs
- Secure file upload handling
- Activity logging and audit trail

## Development

### Running with Socket.io (Real-time features)

```bash
npm run dev:socket
```

### Building for production

```bash
npm run build
npm start
```

## Default Credentials

**⚠️ IMPORTANT: Change these immediately after first login!**

- **Email**: `admin@codeat.com`
- **Password**: `admin123`

## Contributing

This is a proprietary system for Codeat Infotech. For internal contributions, please follow the coding standards and submit pull requests for review.

## License

Proprietary - Codeat Infotech

## Support

For issues or questions:
1. Check the documentation files
2. Review error logs
3. Contact the system administrator

## Changelog

### Version 1.0.0
- Initial release
- Complete ERP functionality
- Real-time discussions
- Reporting and exports
- Email notifications

---

**Built with ❤️ for Codeat Infotech**
