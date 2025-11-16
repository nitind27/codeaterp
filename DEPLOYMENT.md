# Codeat Infotech ERP - Deployment Instructions

## Prerequisites

- Node.js 18+ installed
- MySQL 8.0+ installed and running
- npm or yarn package manager
- Git (optional)

---

## Step 1: Clone/Download Project

```bash
# If using Git
git clone <repository-url>
cd codeaterp

# Or extract the project files to a directory
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js
- React
- MySQL2
- Socket.io
- JWT
- And other dependencies

---

## Step 3: Database Setup

### 3.1 Create Database

1. Open phpMyAdmin or MySQL command line
2. Create a new database named `codeat_erp`
3. Or run:
```sql
CREATE DATABASE codeat_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3.2 Import Schema

1. Open phpMyAdmin
2. Select the `codeat_erp` database
3. Go to "Import" tab
4. Choose the file: `database/schema.sql`
5. Click "Go" to import

Or via command line:
```bash
mysql -u root -p codeat_erp < database/schema.sql
```

### 3.3 Verify Tables

After import, you should see the following tables:
- users
- employees
- documents
- attendance
- leave_types
- leave_balance
- leave_applications
- projects
- project_members
- tasks
- timesheets
- complaints
- complaint_attachments
- complaint_notes
- discussion_channels
- channel_members
- messages
- notifications
- system_settings
- holidays
- activity_logs
- interviews
- email_queue

---

## Step 4: Environment Configuration

### 4.1 Create .env File

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=codeat_erp

# JWT Secrets (IMPORTANT: Change these in production!)
JWT_SECRET=your-very-secure-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-very-secure-refresh-secret-key-change-this-in-production

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@codeat.com

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

### 4.2 Update Default Admin Password

The default admin user is created with:
- Email: `admin@codeat.com`
- Password: `admin123` (stored as hash in database)

**IMPORTANT**: Change the default password immediately after first login!

To change via SQL:
```sql
-- Generate a new password hash (use bcrypt)
-- Or use the application's password change feature
```

---

## Step 5: Configure Email (Optional but Recommended)

### 5.1 Gmail Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use this app password in `SMTP_PASSWORD`

### 5.2 Other SMTP Providers

Update the SMTP settings in `.env` according to your email provider:
- **Outlook**: smtp-mail.outlook.com, port 587
- **Yahoo**: smtp.mail.yahoo.com, port 587
- **Custom SMTP**: Use your provider's settings

---

## Step 6: Run Development Server

### Option 1: Standard Next.js (No Socket.io)

```bash
npm run dev
```

The application will be available at: `http://localhost:3000`

### Option 2: With Socket.io Server

For real-time features (discussions), use the custom server:

```bash
node server.js
```

Or update `package.json`:
```json
{
  "scripts": {
    "dev": "node server.js",
    "start": "NODE_ENV=production node server.js"
  }
}
```

---

## Step 7: Production Build

### 7.1 Build Application

```bash
npm run build
```

### 7.2 Start Production Server

```bash
npm start
```

Or with Socket.io:
```bash
NODE_ENV=production node server.js
```

---

## Step 8: Production Deployment

### 8.1 Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts
4. Add environment variables in Vercel dashboard
5. Note: Socket.io requires a custom server, consider using Vercel's serverless functions or a separate Node.js server

### 8.2 Traditional Server (VPS/Cloud)

1. **Install Node.js and MySQL** on your server
2. **Clone/Upload** project files
3. **Install dependencies**: `npm install --production`
4. **Set up environment variables** in `.env`
5. **Build**: `npm run build`
6. **Use PM2** for process management:
```bash
npm install -g pm2
pm2 start server.js --name codeat-erp
pm2 save
pm2 startup
```

7. **Set up Nginx** as reverse proxy:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

8. **Set up SSL** with Let's Encrypt:
```bash
sudo certbot --nginx -d yourdomain.com
```

### 8.3 Docker Deployment (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t codeat-erp .
docker run -p 3000:3000 --env-file .env codeat-erp
```

---

## Step 9: Security Checklist

- [ ] Change default admin password
- [ ] Update JWT secrets to strong random strings
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Regular database backups
- [ ] Keep dependencies updated
- [ ] Review and restrict file upload permissions
- [ ] Set up rate limiting (already included)
- [ ] Configure CORS properly for production

---

## Step 10: Initial Setup

1. **Login** with default admin credentials:
   - Email: `admin@codeat.com`
   - Password: `admin123`

2. **Change admin password** immediately

3. **Configure system settings**:
   - Go to Settings
   - Update company information
   - Configure email settings
   - Set up holidays

4. **Create users**:
   - Add HR users
   - Add Project Managers
   - Add Employees
   - Add Interns

5. **Set up leave types** (defaults are already created):
   - Casual Leave (12 days)
   - Sick Leave (10 days)
   - Earned Leave (15 days)

6. **Initialize leave balances** for existing employees

---

## Troubleshooting

### Database Connection Error

- Verify MySQL is running: `sudo systemctl status mysql`
- Check database credentials in `.env`
- Ensure database exists: `SHOW DATABASES;`
- Check user permissions

### Port Already in Use

- Change port in `next.config.mjs` or `server.js`
- Or kill the process: `lsof -ti:3000 | xargs kill`

### Module Not Found Errors

- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then reinstall
- Check Node.js version: `node --version` (should be 18+)

### Email Not Sending

- Verify SMTP credentials
- Check firewall/network settings
- Test SMTP connection separately
- Check email queue in database

### Socket.io Not Working

- Ensure using `server.js` instead of standard Next.js dev server
- Check WebSocket support on hosting platform
- Verify CORS settings

---

## Backup and Maintenance

### Database Backup

```bash
# Daily backup script
mysqldump -u root -p codeat_erp > backup_$(date +%Y%m%d).sql
```

### Automated Backups

Set up cron job:
```bash
0 2 * * * /path/to/backup-script.sh
```

### Log Rotation

Configure log rotation for application logs and activity logs.

---

## Support

For issues or questions:
1. Check the API documentation: `API_DOCUMENTATION.md`
2. Review error logs
3. Check database activity logs table
4. Contact system administrator

---

## License

This ERP system is proprietary software for Codeat Infotech.

