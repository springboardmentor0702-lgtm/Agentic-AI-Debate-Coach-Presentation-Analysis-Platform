'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { getCurrentUser } from '@/services/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

interface AdminMetrics {
  total_users: number;
  total_active_users: number;
  total_inactive_users: number;
  users_by_role: Record<string, number>;
  total_debates: number;
  total_presentations: number;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function checkAdminAndFetch() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const user = await getCurrentUser();
      if (user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }

      await fetchMetrics();
      await fetchUsers();
    } catch (err) {
      setError('Failed to verify admin access');
      console.error(err);
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  }

  async function fetchMetrics() {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${BACKEND_URL}/admin/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  }

  async function fetchUsers() {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${BACKEND_URL}/admin/users?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(userId: number, isActive: boolean) {
    try {
      const token = localStorage.getItem('accessToken');
      const endpoint = isActive ? 'deactivate' : 'activate';
      
      const response = await fetch(`${BACKEND_URL}/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      fetchUsers();
    } catch (err) {
      setError('Failed to update user status');
      console.error(err);
    }
  }

  useEffect(() => {
    void checkAdminAndFetch();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-slate-600">{error || 'Failed to load admin dashboard'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600 mt-2">System overview and user management</p>
          </div>
          <Link
            href="/dashboard"
            className="px-6 py-2 bg-slate-500 text-white font-semibold rounded-lg hover:bg-slate-600 transition"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-teal-600">{metrics.total_users}</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Active This Week</h3>
            <p className="text-3xl font-bold text-green-600">{metrics.total_active_users}</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Total Debates</h3>
            <p className="text-3xl font-bold text-blue-600">{metrics.total_debates}</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Total Exports</h3>
            <p className="text-3xl font-bold text-purple-600">{metrics.total_presentations}</p>
          </div>
        </div>

        {/* Users by Role */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Users by Role</h3>
            <div className="space-y-3">
              {Object.entries(metrics.users_by_role).map(([role, count]) => (
                <div key={role} className="flex justify-between items-center">
                  <span className="text-slate-600">{role}</span>
                  <span className="text-xl font-bold text-teal-600">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Role Summary</h3>
            <div className="space-y-3">
              {['LEARNER', 'DEBATE_EXPERT', 'DEBATE_COACH', 'ADMIN'].map((role) => (
                <div key={role} className="flex justify-between items-center">
                  <span className="text-slate-600">{role}</span>
                  <span className="text-xl font-bold text-teal-600">{metrics.users_by_role[role] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="pb-3 font-semibold text-slate-600">Name</th>
                  <th className="pb-3 font-semibold text-slate-600">Email</th>
                  <th className="pb-3 font-semibold text-slate-600">Role</th>
                  <th className="pb-3 font-semibold text-slate-600">Status</th>
                  <th className="pb-3 font-semibold text-slate-600">Joined</th>
                  <th className="pb-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3">{user.full_name}</td>
                    <td className="py-3">{user.email}</td>
                    <td className="py-3">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        user.is_active 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-slate-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
                          user.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
