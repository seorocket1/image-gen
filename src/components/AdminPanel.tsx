import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Coins, Shield, X, Save, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  website_url: string | null;
  brand_name: string | null;
  credits: number;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { user: currentUser } = useAuth();
  const { addNotification } = useNotifications();

  // Create user form state
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    websiteUrl: '',
    brandName: '',
    credits: 50,
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser?.isAdmin) {
      loadUsers();
    }
  }, [isOpen, currentUser]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_all_users');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      addNotification({
        type: 'error',
        title: 'Error Loading Users',
        message: 'Failed to load user list. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: createForm.email,
        password: createForm.password,
        email_confirm: true,
        user_metadata: {
          first_name: createForm.firstName,
          last_name: createForm.lastName,
          website_url: createForm.websiteUrl || null,
          brand_name: createForm.brandName || null,
        },
      });

      if (authError) throw authError;

      // Update credits if different from default
      if (createForm.credits !== 50 && authData.user) {
        const { error: creditError } = await supabase.rpc('admin_update_credits', {
          p_user_id: authData.user.id,
          p_new_credits: createForm.credits,
          p_reason: 'Initial credit allocation',
        });

        if (creditError) {
          console.error('Error setting initial credits:', creditError);
        }
      }

      addNotification({
        type: 'success',
        title: 'User Created',
        message: `Successfully created user account for ${createForm.email}`,
      });

      // Reset form and reload users
      setCreateForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        websiteUrl: '',
        brandName: '',
        credits: 50,
      });
      setShowCreateUser(false);
      loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      addNotification({
        type: 'error',
        title: 'User Creation Failed',
        message: error.message || 'Failed to create user account',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserCredits = async (userId: string, newCredits: number) => {
    try {
      const { data, error } = await supabase.rpc('admin_update_credits', {
        p_user_id: userId,
        p_new_credits: newCredits,
        p_reason: 'Admin credit adjustment',
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Credits Updated',
        message: `Successfully updated user credits to ${newCredits}`,
      });

      loadUsers();
    } catch (error: any) {
      console.error('Error updating credits:', error);
      addNotification({
        type: 'error',
        title: 'Credit Update Failed',
        message: error.message || 'Failed to update user credits',
      });
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'User Deleted',
        message: `Successfully deleted user ${userEmail}`,
      });

      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      addNotification({
        type: 'error',
        title: 'User Deletion Failed',
        message: error.message || 'Failed to delete user',
      });
    }
  };

  if (!isOpen) return null;

  // Check if current user is admin
  if (!currentUser?.isAdmin) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have admin privileges to access this panel.</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 mr-4">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Admin Panel</h2>
              <p className="text-purple-100">Manage users and credits</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Actions */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">User Management</h3>
            <button
              onClick={() => setShowCreateUser(true)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </button>
          </div>

          {/* Create User Modal */}
          {showCreateUser && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
                  <button
                    onClick={() => setShowCreateUser(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={createUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={createForm.firstName}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={createForm.lastName}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={createForm.password}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={createForm.websiteUrl}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, websiteUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={createForm.brandName}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, brandName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Credits
                    </label>
                    <input
                      type="number"
                      value={createForm.credits}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, credits: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create User'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateUser(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            {user.brand_name && (
                              <div className="text-sm text-gray-500">{user.brand_name}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser?.id === user.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={editingUser.credits}
                                onChange={(e) => setEditingUser(prev => prev ? { ...prev, credits: parseInt(e.target.value) || 0 } : null)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                min="0"
                              />
                              <button
                                onClick={() => {
                                  updateUserCredits(user.id, editingUser.credits);
                                  setEditingUser(null);
                                }}
                                className="p-1 text-green-600 hover:text-green-800"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="p-1 text-gray-600 hover:text-gray-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {user.credits}
                              </span>
                              <button
                                onClick={() => setEditingUser(user)}
                                className="p-1 text-blue-600 hover:text-blue-800"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_admin 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_admin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {!user.is_admin && (
                            <button
                              onClick={() => deleteUser(user.id, user.email)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};