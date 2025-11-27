# Database Migrations

This folder contains migration scripts to update your database schema.

## Adding date_of_birth Field

If your database was created before the `date_of_birth` field was added to the employees table, use one of these migration scripts:

### Option 1: Simple Migration (MySQL 8.0+)
```bash
mysql -u your_username -p codeat_erp < add_date_of_birth.sql
```

### Option 2: Safe Migration (MySQL 5.7+ / MariaDB)
This version checks if the column exists before adding it:
```bash
mysql -u your_username -p codeat_erp < add_date_of_birth_safe.sql
```

### Option 3: Manual SQL (phpMyAdmin)
1. Open phpMyAdmin
2. Select `codeat_erp` database
3. Go to SQL tab
4. Run this command:

```sql
ALTER TABLE employees 
ADD COLUMN date_of_birth DATE 
AFTER phone;
```

### Verify the Migration
After running the migration, verify the column was added:

```sql
DESCRIBE employees;
```

Or check in phpMyAdmin:
1. Go to `employees` table
2. Click on "Structure" tab
3. Look for `date_of_birth` column

## Notes
- The `date_of_birth` field is optional (allows NULL values)
- It's used for birthday tracking and celebrations
- The field is already included in the main `schema.sql` file for new installations

