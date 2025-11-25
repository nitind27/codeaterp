# Quick Setup Guide - Codeat Infotech ERP

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Database Setup

1. **Create Database in phpMyAdmin:**
   - Open phpMyAdmin
   - Click "New" to create database
   - Name: `codeat_erp`
   - Collation: `utf8mb4_unicode_ci`
   - Click "Create"

2. **Import Schema:**
   - Select `codeat_erp` database
   - Click "Import" tab
   - Choose file: `database/schema.sql`
   - Click "Go"

### Step 3: Environment Setup

Create `.env` file in root directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=codeat_erp

JWT_SECRET=change-this-to-random-secret-key
JWT_REFRESH_SECRET=change-this-to-random-refresh-secret-key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@codeat.com

NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Step 4: Run Application

**Option A: Standard Mode (No Socket.io)**
```bash
npm run dev
```

**Option B: With Real-time Features (Socket.io)**
```bash
npm run dev:socket
```

### Step 5: Login

Open browser: `http://localhost:3000`

**Default Admin Credentials:**
- Email: `admin@codeat.com`
- Password: `admin123`

⚠️ **Change password immediately after first login!**

---

## 📋 What's Included

✅ Complete MySQL database schema  
✅ JWT authentication system  
✅ Role-based access control  
✅ Employee management  
✅ Attendance system (Clock in/out)  
✅ Leave management with approval workflow  
✅ Project & task management  
✅ Complaints & grievances system  
✅ Real-time discussions (Socket.io)  
✅ Reporting & exports (PDF/Excel/CSV)  
✅ Email notifications  
✅ Birthday reminders  

---

## 🎨 Color Scheme

The application uses Codeat Infotech brand colors:
- Dark: `#282b2f`
- Mid: `#373c42`
- Teal: `#344a51`
- Accent: `#00b3c6`
- Silver: `#e0e1e1`

---

## 📚 Documentation

- **API Documentation**: See `API_DOCUMENTATION.md`
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Full README**: See `README.md`

---

## 🔧 Common Issues

### Database Connection Error
- Check MySQL is running
- Verify credentials in `.env`
- Ensure database `codeat_erp` exists

### Port 3000 Already in Use
- Kill process: `lsof -ti:3000 | xargs kill` (Mac/Linux)
- Or change port in `next.config.mjs`

### Module Not Found
- Delete `node_modules` folder
- Run `npm install` again

---

## 🎯 Next Steps

1. **Change default admin password**
2. **Configure email settings** (for notifications)
3. **Add company logo** to `public/` folder
4. **Create users** (HR, PM, Employees)
5. **Set up leave types** (defaults already created)
6. **Configure system settings**

---

## 💡 Tips

- Use `npm run dev:socket` for full features including real-time chat
- Check `activity_logs` table for system audit trail
- Email queue is in `email_queue` table
- All dates use ISO format (YYYY-MM-DD)

---

**Need Help?** Check the full documentation files or contact your system administrator.

