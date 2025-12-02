import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import Navbar from '../components/Navbar';
import { Users, Home, MapPin, Activity, Loader2, Mail, CheckCircle, XCircle, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'smtp'>('overview');

  // SMTP state
  const [smtpSettings, setSmtpSettings] = useState<any>(null);
  const [isSmtpLoading, setIsSmtpLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: 'Family Tracker',
    admin_email: '',
    notification_emails: [] as string[],
  });
  const [newEmail, setNewEmail] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, usersData, familiesData, smtpData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getFamilies(),
        adminApi.getSmtpSettings(),
      ]);
      setStats(statsData.stats);
      setUsers(usersData.users);
      setFamilies(familiesData.families);

      if (smtpData.smtpSettings) {
        setSmtpSettings(smtpData.smtpSettings);
        setSmtpForm({
          smtp_host: smtpData.smtpSettings.smtp_host || '',
          smtp_port: smtpData.smtpSettings.smtp_port || 587,
          smtp_secure: smtpData.smtpSettings.smtp_secure || false,
          smtp_user: smtpData.smtpSettings.smtp_user || '',
          smtp_password: '',
          from_email: smtpData.smtpSettings.from_email || '',
          from_name: smtpData.smtpSettings.from_name || 'Family Tracker',
          admin_email: smtpData.smtpSettings.admin_email || '',
          notification_emails: smtpData.smtpSettings.notification_emails || [],
        });
      }
    } catch (error: any) {
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSmtpSave = async () => {
    if (!smtpForm.smtp_host || !smtpForm.smtp_user || !smtpForm.admin_email) {
      toast.error('Please fill in all required SMTP fields');
      return;
    }

    if (!smtpForm.smtp_password && !smtpSettings) {
      toast.error('Password is required for new SMTP configuration');
      return;
    }

    setIsSmtpLoading(true);
    try {
      const dataToSend = { ...smtpForm };
      if (!dataToSend.smtp_password && smtpSettings) {
        delete (dataToSend as any).smtp_password;
      }

      await adminApi.saveSmtpSettings(dataToSend);
      toast.success('SMTP settings saved successfully');
      await loadData();
    } catch (error: any) {
      toast.error('Failed to save SMTP settings');
    } finally {
      setIsSmtpLoading(false);
    }
  };

  const handleSmtpTest = async () => {
    setIsTesting(true);
    try {
      const result = await adminApi.testSmtpConnection();
      if (result.success) {
        toast.success('SMTP connection successful!');
      } else {
        toast.error('SMTP connection failed');
      }
    } catch (error: any) {
      toast.error('SMTP connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const addNotificationEmail = () => {
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      if (!smtpForm.notification_emails.includes(newEmail)) {
        setSmtpForm({
          ...smtpForm,
          notification_emails: [...smtpForm.notification_emails, newEmail],
        });
        setNewEmail('');
      } else {
        toast.error('Email already added');
      }
    } else {
      toast.error('Invalid email address');
    }
  };

  const removeNotificationEmail = (email: string) => {
    setSmtpForm({
      ...smtpForm,
      notification_emails: smtpForm.notification_emails.filter((e) => e !== email),
    });
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-16 px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Admin Dashboard
          </h1>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={'py-4 px-1 border-b-2 font-medium text-sm transition-colors ' + (
                  activeTab === 'overview'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Overview
                </div>
              </button>
              <button
                onClick={() => setActiveTab('smtp')}
                className={'py-4 px-1 border-b-2 font-medium text-sm transition-colors ' + (
                  activeTab === 'smtp'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  SMTP Settings
                  {smtpSettings && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {!smtpSettings && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Users</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats?.totalUsers || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Families</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats?.totalFamilies || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Home className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Locations</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats?.totalLocations || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Last 24h</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats?.locationsLast24h || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="card mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Users ({users.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Family
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Role
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {user.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {user.email}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {user.family_name || '-'}
                          </td>
                          <td className="py-3 px-4">
                            {user.is_admin ? (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                                Admin
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                                User
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Families Table */}
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Families ({families.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Creator
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Members
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {families.map((family) => (
                        <tr key={family.id} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">
                            {family.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {family.creator_name}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {family.member_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* SMTP Settings Tab - PART 2 FOLLOWS */}
          {activeTab === 'smtp' && (
            <div className="card max-w-4xl">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-primary-600" />
                <h2 className="text-2xl font-bold text-gray-900">SMTP Configuration</h2>
              </div>

              <div className="space-y-6">
                {/* SMTP Server Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Server Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP Host *
                      </label>
                      <input
                        type="text"
                        value={smtpForm.smtp_host}
                        onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                        className="input w-full"
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP Port *
                      </label>
                      <input
                        type="number"
                        value={smtpForm.smtp_port}
                        onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: parseInt(e.target.value) })}
                        className="input w-full"
                        placeholder="587"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP User *
                      </label>
                      <input
                        type="text"
                        value={smtpForm.smtp_user}
                        onChange={(e) => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                        className="input w-full"
                        placeholder="your-email@gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP Password {smtpSettings ? '(Leave blank to keep current)' : '*'}
                      </label>
                      <input
                        type="password"
                        value={smtpForm.smtp_password}
                        onChange={(e) => setSmtpForm({ ...smtpForm, smtp_password: e.target.value })}
                        className="input w-full"
                        placeholder={smtpSettings ? '********' : 'Your app password'}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={smtpForm.smtp_secure}
                        onChange={(e) => setSmtpForm({ ...smtpForm, smtp_secure: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                      />
                      <span className="text-sm text-gray-700">
                        Use SSL/TLS (Port 465 = checked, Port 587 = unchecked)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Email Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        From Email *
                      </label>
                      <input
                        type="email"
                        value={smtpForm.from_email}
                        onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
                        className="input w-full"
                        placeholder="noreply@familytracker.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        From Name
                      </label>
                      <input
                        type="text"
                        value={smtpForm.from_name}
                        onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })}
                        className="input w-full"
                        placeholder="Family Tracker"
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Recipients */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Recipients</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Email * (Always receives notifications)
                    </label>
                    <input
                      type="email"
                      value={smtpForm.admin_email}
                      onChange={(e) => setSmtpForm({ ...smtpForm, admin_email: e.target.value })}
                      className="input w-full"
                      placeholder="admin@example.com"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notification Emails
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addNotificationEmail()}
                        className="input flex-1"
                        placeholder="parent@example.com"
                      />
                      <button onClick={addNotificationEmail} className="btn btn-secondary">
                        Add
                      </button>
                    </div>
                    {smtpForm.notification_emails.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {smtpForm.notification_emails.map((email) => (
                          <div
                            key={email}
                            className="flex items-center justify-between bg-gray-50 p-2 rounded"
                          >
                            <span className="text-sm text-gray-700">{email}</span>
                            <button
                              onClick={() => removeNotificationEmail(email)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSmtpSave}
                    disabled={isSmtpLoading}
                    className="btn btn-primary"
                  >
                    {isSmtpLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </button>
                  {smtpSettings && (
                    <button
                      onClick={handleSmtpTest}
                      disabled={isTesting}
                      className="btn btn-secondary"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Test Connection
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Help Text */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Gmail Configuration</h4>
                  <p className="text-sm text-blue-800">
                    For Gmail, use <code className="bg-blue-100 px-1 rounded">smtp.gmail.com</code> with port <code className="bg-blue-100 px-1 rounded">587</code> (unchecked SSL).
                    You must use an App Password instead of your regular password.
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    To create an App Password: Enable 2FA, visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">myaccount.google.com/apppasswords</a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
