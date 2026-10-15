import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { familyApi } from '../lib/api';
import { Family } from '../types';
import Navbar from '../components/Navbar';
import {
  Users,
  UserPlus,
  LogOut,
  Loader2,
  Mail,
  Calendar,
  Edit2,
  X,
  Check,
  Smartphone,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function FamilyPage() {
  const { user, updateUser } = useAuthStore();
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [editFamilyName, setEditFamilyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const loadFamily = async () => {
    if (!user?.family_id) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await familyApi.getMyFamily();
      setFamily(response.family);
      setEditFamilyName(response.family.name);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to load family');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFamily();
  }, [user?.family_id]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await familyApi.createFamily(newFamilyName);
      setFamily(response.family);
      updateUser({ ...user!, family_id: response.family.id });
      toast.success('Family created successfully!');
      setNewFamilyName('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create family');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      await familyApi.inviteUser(inviteEmail);
      toast.success('User invited successfully!');
      setInviteEmail('');
      await loadFamily();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateFamily = async () => {
    try {
      const response = await familyApi.updateFamily(editFamilyName);
      setFamily(response.family);
      setIsEditing(false);
      toast.success('Family name updated!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update family');
    }
  };

  const handleLeaveFamily = async () => {
    if (!confirm('Are you sure you want to leave this family?')) return;

    try {
      await familyApi.leaveFamily();
      updateUser({ ...user!, family_id: null });
      setFamily(null);
      toast.success('Left family successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to leave family');
    }
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

  if (!family) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-16 px-4 py-12">
          <div className="max-w-md mx-auto">
            <div className="card">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                  <Users className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Create Your Family
                </h2>
                <p className="text-gray-600 mt-2">
                  Start tracking your loved ones by creating a family group
                </p>
              </div>

              <form onSubmit={handleCreateFamily} className="space-y-4">
                <div>
                  <label
                    htmlFor="familyName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Family Name
                  </label>
                  <input
                    id="familyName"
                    type="text"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    className="input"
                    placeholder="The Smiths"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Users className="w-5 h-5" />
                      Create Family
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-16 px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Family Info */}
          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editFamilyName}
                      onChange={(e) => setEditFamilyName(e.target.value)}
                      className="input flex-1"
                    />
                    <button
                      onClick={handleUpdateFamily}
                      className="btn btn-primary p-2"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditFamilyName(family.name);
                      }}
                      className="btn btn-secondary p-2"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {family.name}
                    </h1>
                    {user?.id === family.created_by && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                  <Calendar className="w-4 h-4" />
                  Created{' '}
                  {formatDistanceToNow(new Date(family.created_at), {
                    addSuffix: true,
                  })}
                </div>
              </div>
              <button
                onClick={handleLeaveFamily}
                className="btn btn-danger flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Leave Family
              </button>
            </div>

            {/* Invite User */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Invite Family Member
              </h3>
              <form onSubmit={handleInviteUser} className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="member@example.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {isInviting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Invite
                    </>
                  )}
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                The user must already have an account to be invited
              </p>
            </div>
          </div>

          {/* Mobile App Setup */}
          <Link
            to="/owntracks"
            className="block card hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-primary-50 via-primary-100 to-blue-100 border-2 border-primary-200 hover:border-primary-400 group"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-primary-700 transition-colors">
                  Setup Mobile App
                </h3>
                <p className="text-sm text-gray-700">
                  Share your location with family members using the mobile tracking app
                </p>
              </div>
              <ArrowRight className="w-6 h-6 text-primary-600 flex-shrink-0 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </Link>

          {/* Family Members */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Family Members ({family.members?.length || 0})
            </h2>
            <div className="space-y-3">
              {family.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {member.name}
                      </h3>
                      {member.id === user?.id && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-medium">
                          You
                        </span>
                      )}
                      {member.is_admin && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    Joined{' '}
                    {formatDistanceToNow(new Date(member.created_at), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
