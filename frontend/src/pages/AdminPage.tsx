import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import Navbar from '../components/Navbar';
import { Users, Home, MapPin, Activity, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, usersData, familiesData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getFamilies(),
      ]);
      setStats(statsData.stats);
      setUsers(usersData.users);
      setFamilies(familiesData.families);
    } catch (error: any) {
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        </div>
      </div>
    </>
  );
}
