'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const ALL_TABS = [
  { id: 'profile', label: 'Profile', icon: '👤', roles: null },
  { id: 'security', label: 'Security', icon: '🔒', roles: null },
  { id: 'account', label: 'Account Info', icon: 'ℹ️', roles: null },
  { id: 'system', label: 'System Settings', icon: '⚙️', roles: ['admin'] },
];

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  const [profileData, setProfileData] = useState({
    first_name: '', last_name: '', phone: '', gender: '',
    date_of_birth: '', address: '', city: '', state: '',
    country: 'India', postal_code: '',
    emergency_contact_name: '', emergency_contact_phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState(null);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [savingPassword, setSavingPassword] = useState(false);

  const [systemSettings, setSystemSettings] = useState({
    company_name: '', company_email: '', smtp_host: '', smtp_port: '587',
    smtp_user: '', smtp_password: '', smtp_from_email: '',
    birthday_reminder_days: '7', company_anniversary_date: '',
  });
  const [savingSystem, setSavingSystem] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { router.push('/login'); return; }
    const parsed = JSON.parse(userData);
    setUser(parsed);
    fetchProfile(token);
    if (parsed.role === 'admin') fetchSystemSettings(token);
  }, []);

  const fetchProfile = async (token) => {
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && data.user.employee) {
        const emp = data.user.employee;
        setEmployeeProfile(emp);
        setProfileData({
          first_name: emp.firstName || '', last_name: emp.lastName || '',
          phone: emp.phone || '', gender: emp.gender || '',
          date_of_birth: emp.dateOfBirth ? emp.dateOfBirth.split('T')[0] : '',
          address: emp.address || '', city: emp.city || '',
          state: emp.state || '', country: emp.country || 'India',
          postal_code: emp.postalCode || '',
          emergency_contact_name: emp.emergencyContactName || '',
          emergency_contact_phone: emp.emergencyContactPhone || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemSettings = async (token) => {
    try {
      const res = await fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        const s = data.settings;
        setSystemSettings({
          company_name: s.company_name?.value || '',
          company_email: s.company_email?.value || '',
          smtp_host: s.smtp_host?.value || '',
          smtp_port: s.smtp_port?.value || '587',
          smtp_user: s.smtp_user?.value || '',
          smtp_password: s.smtp_password?.value || '',
          smtp_from_email: s.smtp_from_email?.value || '',
          birthday_reminder_days: s.birthday_reminder_days?.value || '7',
          company_anniversary_date: s.company_anniversary_date?.value || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch system settings:', err);
    }
  };

  const handleProfileSave = async () => {
    if (!profileData.first_name || !profileData.last_name) {
      toast.error('First name and last name are required'); return;
    }
    if (!employeeProfile?.id) { toast.error('No employee profile found'); return; }
    setSavingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/employees/${employeeProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Profile updated successfully');
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        stored.name = `${profileData.first_name} ${profileData.last_name}`;
        localStorage.setItem('user', JSON.stringify(stored));
        setUser((prev) => ({ ...prev, name: stored.name }));
        await fetchProfile(token);
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required'); return;
    }
    if (passwordData.newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error('New passwords do not match'); return; }
    if (passwordData.currentPassword === passwordData.newPassword) { toast.error('New password must be different from current'); return; }
    setSavingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Password changed successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSystemSave = async () => {
    if (!systemSettings.company_name) { toast.error('Company name is required'); return; }
    setSavingSystem(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: systemSettings }),
      });
      const data = await res.json();
      if (data.success) toast.success('System settings saved successfully');
      else toast.error(data.error || 'Failed to save settings');
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setSavingSystem(false);
    }
  };

  const handleTestEmail = async () => {
    if (!systemSettings.smtp_host || !systemSettings.smtp_user) {
      toast.error('Please fill SMTP host and username first'); return;
    }
    setTestingEmail(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: systemSettings }),
      });
      toast.success('SMTP settings saved. Test email feature coming soon.');
    } catch (err) {
      toast.error('Failed to save SMTP settings');
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading || !user) return <LogoLoader />;

  const TABS = ALL_TABS.filter((t) => !t.roles || t.roles.includes(user.role));

  const roleColors = {
    admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    hr: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    project_manager: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    employee: 'bg-green-500/20 text-green-400 border-green-500/30',
    intern: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  return (
    <Layout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Settings</h1>
          <p className="text-codeat-gray text-lg">Manage your profile and account preferences</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-codeat-muted/30">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-semibold rounded-t-lg transition-all duration-200 border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-codeat-accent border-codeat-accent bg-codeat-mid'
                  : 'text-codeat-gray border-transparent hover:text-codeat-silver hover:bg-codeat-mid/50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-6 lg:p-8 shadow-xl space-y-6">
            <h2 className="text-xl font-bold text-codeat-silver">Personal Information</h2>
            {!employeeProfile ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-3 opacity-30">👤</div>
                <p className="text-codeat-gray">No employee profile linked to your account.</p>
                <p className="text-codeat-gray text-sm mt-1">Contact HR to set up your profile.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField label="First Name" value={profileData.first_name} onChange={(v) => setProfileData((p) => ({ ...p, first_name: v }))} placeholder="First name" required />
                  <InputField label="Last Name" value={profileData.last_name} onChange={(v) => setProfileData((p) => ({ ...p, last_name: v }))} placeholder="Last name" required />
                  <InputField label="Phone" value={profileData.phone} onChange={(v) => setProfileData((p) => ({ ...p, phone: v }))} placeholder="+91 XXXXX XXXXX" type="tel" />
                  <div>
                    <label className="block text-sm font-medium text-codeat-gray mb-2">Gender</label>
                    <select value={profileData.gender} onChange={(e) => setProfileData((p) => ({ ...p, gender: e.target.value }))} className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/40 rounded-lg text-codeat-silver focus:outline-none focus:border-codeat-accent transition-colors">
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <InputField label="Date of Birth" value={profileData.date_of_birth} onChange={(v) => setProfileData((p) => ({ ...p, date_of_birth: v }))} type="date" />
                </div>
                <div className="border-t border-codeat-muted/20 pt-5">
                  <h3 className="text-codeat-silver font-semibold mb-4">Address</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <InputField label="Street Address" value={profileData.address} onChange={(v) => setProfileData((p) => ({ ...p, address: v }))} placeholder="Street address" />
                    </div>
                    <InputField label="City" value={profileData.city} onChange={(v) => setProfileData((p) => ({ ...p, city: v }))} placeholder="City" />
                    <InputField label="State" value={profileData.state} onChange={(v) => setProfileData((p) => ({ ...p, state: v }))} placeholder="State" />
                    <InputField label="Country" value={profileData.country} onChange={(v) => setProfileData((p) => ({ ...p, country: v }))} placeholder="Country" />
                    <InputField label="Postal Code" value={profileData.postal_code} onChange={(v) => setProfileData((p) => ({ ...p, postal_code: v }))} placeholder="Postal code" />
                  </div>
                </div>
                <div className="border-t border-codeat-muted/20 pt-5">
                  <h3 className="text-codeat-silver font-semibold mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <InputField label="Contact Name" value={profileData.emergency_contact_name} onChange={(v) => setProfileData((p) => ({ ...p, emergency_contact_name: v }))} placeholder="Emergency contact name" />
                    <InputField label="Contact Phone" value={profileData.emergency_contact_phone} onChange={(v) => setProfileData((p) => ({ ...p, emergency_contact_phone: v }))} placeholder="Emergency contact phone" type="tel" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={handleProfileSave} disabled={savingProfile} className="px-8 py-3 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl font-semibold hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {savingProfile ? <><div className="spinner w-4 h-4"></div>Saving...</> : 'Save Changes'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-6 lg:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-codeat-silver">Change Password</h2>
              <p className="text-codeat-gray text-sm mt-1">Use a strong password with at least 6 characters.</p>
            </div>
            <div className="max-w-md space-y-5">
              <PasswordField label="Current Password" value={passwordData.currentPassword} onChange={(v) => setPasswordData((p) => ({ ...p, currentPassword: v }))} show={showPasswords.current} onToggle={() => setShowPasswords((p) => ({ ...p, current: !p.current }))} placeholder="Enter current password" />
              <PasswordField label="New Password" value={passwordData.newPassword} onChange={(v) => setPasswordData((p) => ({ ...p, newPassword: v }))} show={showPasswords.new} onToggle={() => setShowPasswords((p) => ({ ...p, new: !p.new }))} placeholder="Enter new password" />
              <PasswordField label="Confirm New Password" value={passwordData.confirmPassword} onChange={(v) => setPasswordData((p) => ({ ...p, confirmPassword: v }))} show={showPasswords.confirm} onToggle={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))} placeholder="Confirm new password" />
              {passwordData.newPassword && <PasswordStrength password={passwordData.newPassword} />}
              {passwordData.confirmPassword && (
                <p className={`text-xs ${passwordData.newPassword === passwordData.confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                  {passwordData.newPassword === passwordData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
              <button onClick={handlePasswordChange} disabled={savingPassword} className="w-full px-6 py-3 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl font-semibold hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {savingPassword ? <><div className="spinner w-4 h-4"></div>Updating...</> : 'Update Password'}
              </button>
            </div>
            <div className="border-t border-codeat-muted/20 pt-5">
              <h3 className="text-codeat-silver font-semibold mb-3">Security Tips</h3>
              <ul className="space-y-2 text-sm text-codeat-gray">
                {['Use a mix of uppercase, lowercase, numbers, and symbols', 'Never share your password with anyone', 'Change your password regularly', 'Do not reuse passwords from other accounts'].map((tip) => (
                  <li key={tip} className="flex items-start gap-2"><span className="text-codeat-accent mt-0.5">•</span>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Account Info Tab */}
        {activeTab === 'account' && (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-6 lg:p-8 shadow-xl space-y-6">
            <h2 className="text-xl font-bold text-codeat-silver">Account Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard label="Email Address" value={user.email} icon="📧" />
              <InfoCard label="Role" icon="🎭" value={
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${roleColors[user.role] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                  {user.role?.replace('_', ' ').toUpperCase()}
                </span>
              } />
              {employeeProfile && (
                <>
                  <InfoCard label="Employee ID" value={employeeProfile.employeeId} icon="🪪" />
                  <InfoCard label="Department" value={employeeProfile.department || '—'} icon="🏢" />
                  <InfoCard label="Designation" value={employeeProfile.designation || '—'} icon="💼" />
                  <InfoCard label="Employment Type" value={employeeProfile.employmentType?.replace('_', ' ') || '—'} icon="📋" />
                  <InfoCard label="Joining Date" icon="📅" value={employeeProfile.joiningDate ? new Date(employeeProfile.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />
                </>
              )}
            </div>
            <div className="border-t border-codeat-muted/20 pt-5">
              <p className="text-codeat-gray text-sm">To update your email, department, designation, or employment type, please contact HR or your administrator.</p>
            </div>
          </div>
        )}

        {/* System Settings Tab — Admin Only */}
        {activeTab === 'system' && user.role === 'admin' && (
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-6 lg:p-8 shadow-xl space-y-5">
              <div>
                <h2 className="text-xl font-bold text-codeat-silver">Company Information</h2>
                <p className="text-codeat-gray text-sm mt-1">Basic details shown across the system and emails.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputField label="Company Name" value={systemSettings.company_name} onChange={(v) => setSystemSettings((p) => ({ ...p, company_name: v }))} placeholder="e.g. Codeat Infotech" required />
                <InputField label="Company Email" value={systemSettings.company_email} onChange={(v) => setSystemSettings((p) => ({ ...p, company_email: v }))} placeholder="e.g. info@codeat.com" type="email" />
                <InputField label="Company Anniversary Date" value={systemSettings.company_anniversary_date} onChange={(v) => setSystemSettings((p) => ({ ...p, company_anniversary_date: v }))} type="date" />
                <InputField label="Birthday Reminder (days before)" value={systemSettings.birthday_reminder_days} onChange={(v) => setSystemSettings((p) => ({ ...p, birthday_reminder_days: v }))} placeholder="e.g. 7" type="number" />
              </div>
            </div>

            {/* SMTP Config */}
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-6 lg:p-8 shadow-xl space-y-5">
              <div>
                <h2 className="text-xl font-bold text-codeat-silver">Email / SMTP Configuration</h2>
                <p className="text-codeat-gray text-sm mt-1">Used for welcome emails, leave notifications, birthday reminders, etc.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputField label="SMTP Host" value={systemSettings.smtp_host} onChange={(v) => setSystemSettings((p) => ({ ...p, smtp_host: v }))} placeholder="e.g. smtp.gmail.com" />
                <InputField label="SMTP Port" value={systemSettings.smtp_port} onChange={(v) => setSystemSettings((p) => ({ ...p, smtp_port: v }))} placeholder="e.g. 587" type="number" />
                <InputField label="SMTP Username" value={systemSettings.smtp_user} onChange={(v) => setSystemSettings((p) => ({ ...p, smtp_user: v }))} placeholder="e.g. your-email@gmail.com" />
                <div>
                  <label className="block text-sm font-medium text-codeat-gray mb-2">SMTP Password</label>
                  <div className="relative">
                    <input type={showSmtpPassword ? 'text' : 'password'} value={systemSettings.smtp_password} onChange={(e) => setSystemSettings((p) => ({ ...p, smtp_password: e.target.value }))} placeholder="App password or SMTP password" className="w-full px-4 py-3 pr-12 bg-codeat-dark border border-codeat-muted/40 rounded-lg text-codeat-silver placeholder-codeat-gray/50 focus:outline-none focus:border-codeat-accent transition-colors" />
                    <button type="button" onClick={() => setShowSmtpPassword((v) => !v)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-codeat-gray hover:text-codeat-silver transition-colors" aria-label={showSmtpPassword ? 'Hide' : 'Show'}>
                      {showSmtpPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                  <p className="text-codeat-gray text-xs mt-1">For Gmail, use an App Password — not your account password.</p>
                </div>
                <InputField label="From Email Address" value={systemSettings.smtp_from_email} onChange={(v) => setSystemSettings((p) => ({ ...p, smtp_from_email: v }))} placeholder="e.g. noreply@codeat.com" type="email" />
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300">
                <p className="font-semibold mb-1">💡 Gmail Setup</p>
                <p>Host: <span className="font-mono text-blue-200">smtp.gmail.com</span> &nbsp;|&nbsp; Port: <span className="font-mono text-blue-200">587</span> &nbsp;|&nbsp; Enable 2FA on your Google account, then generate an App Password from Google Account → Security → App Passwords.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={handleTestEmail} disabled={testingEmail || savingSystem} className="px-6 py-3 bg-codeat-dark border border-codeat-muted/40 text-codeat-silver rounded-xl font-semibold hover:border-codeat-accent hover:text-codeat-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                {testingEmail ? 'Saving...' : 'Save & Test SMTP'}
              </button>
              <button onClick={handleSystemSave} disabled={savingSystem} className="px-8 py-3 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl font-semibold hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {savingSystem ? <><div className="spinner w-4 h-4"></div>Saving...</> : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-codeat-gray mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/40 rounded-lg text-codeat-silver placeholder-codeat-gray/50 focus:outline-none focus:border-codeat-accent transition-colors"
      />
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-codeat-gray mb-2">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-12 bg-codeat-dark border border-codeat-muted/40 rounded-lg text-codeat-silver placeholder-codeat-gray/50 focus:outline-none focus:border-codeat-accent transition-colors"
        />
        <button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 pr-4 flex items-center text-codeat-gray hover:text-codeat-silver transition-colors" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }) {
  const checks = [
    { label: 'Min 6 chars', pass: password.length >= 6 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special char', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'][score];
  const textColor = ['', 'text-red-400', 'text-yellow-400', 'text-blue-400', 'text-green-400'][score];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? strengthColor : 'bg-codeat-muted/30'}`} />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <div className="flex gap-3 flex-wrap">
          {checks.map((c) => (
            <span key={c.label} className={`text-xs ${c.pass ? 'text-green-400' : 'text-codeat-gray/60'}`}>
              {c.pass ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
        {score > 0 && <span className={`text-xs font-semibold ${textColor}`}>{strengthLabel}</span>}
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="bg-codeat-dark/50 rounded-xl p-4 border border-codeat-muted/30">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <p className="text-codeat-gray text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <div className="text-codeat-silver font-semibold mt-1">{value}</div>
    </div>
  );
}
