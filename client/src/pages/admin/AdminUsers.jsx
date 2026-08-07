import React, { useEffect, useState } from 'react';
import { userService } from '../../services';
import { useAuthStore } from '../../store';
import { useToast } from '../../components/ToastProvider';

const roleBadge = (role) => {
  const colors = {
    admin: 'bg-purple-100 text-purple-700',
    seller: 'bg-blue-100 text-blue-700',
    customer: 'bg-gray-100 text-gray-700',
  };
  return colors[role] || colors.customer;
};

const statusBadge = (status) => {
  const colors = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    banned: 'bg-red-100 text-red-700',
  };
  return colors[status] || colors.inactive;
};

const getPageNumbers = (current, total) => {
  const delta = 1; // pages shown around current
  const range = [];
  const rangeWithDots = [];
  let last;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (last) {
      if (i - last === 2) {
        rangeWithDots.push(last + 1);
      } else if (i - last > 2) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    last = i;
  }

  return rangeWithDots;
};

const AdminUsers = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const { addToast } = useToast();

  const loadUsers = (nextPage = page) => {
    setLoading(true);
    setError('');
    userService.getAllUsers({ page: nextPage, limit: 10 })
      .then((res) => {
        setUsers(res.data?.data || []);
        setPagination(res.data?.pagination || null);
      })
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(page); }, [page]);

  const handleStatusChange = async (userId, status) => {
    if (userId === currentUser?.id) {
      setError('You cannot change your own account status.');
      return;
    }
    setUpdating(userId);
    setError('');
    try {
      await userService.updateUser(userId, { status });
      addToast(`User status updated to ${status}.`);
      loadUsers(page);
    } catch {
      setError('Failed to update user status.');
      addToast('Failed to update user status.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark">Users</h2>
        <p className="text-gray-500 text-sm">Manage user accounts and access</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-sm text-sm">{error}</div>
      )}

      <div className="bg-white rounded-sm shadow-card overflow-hidden">
        {loading ? (
          <p className="p-5 text-gray-500">Loading...</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {[user.fullName].filter(Boolean).join(' ') || '—'}
                        {user.id === currentUser?.id && (
                          <span className="ml-1 text-xs text-gray-400">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold capitalize ${roleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold capitalize ${statusBadge(user.status.toLowerCase())}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.id === currentUser?.id ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <select
                            value={user.status}
                            disabled={updating === user.id}
                            onChange={(e) => handleStatusChange(user.id, e.target.value)}
                            className="input-field py-1.5 text-xs capitalize w-28"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="banned">Banned</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">
                {users.length ? `Showing ${((page - 1) * 14) + 1}-${Math.min(page * 14, pagination?.total || users.length)} of ${pagination?.total || users.length} users` : 'No records'}
              </div>
              <div className="flex items-center gap-1.5">
                {/* First page */}
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  aria-label="First page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-500 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  «
                </button>

                {/* Previous */}
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!pagination?.hasPrevPage}
                  aria-label="Previous page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-700 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ‹
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {getPageNumbers(page, totalPages).map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots-${idx}`} className="inline-flex h-8 w-8 items-center justify-center text-sm text-gray-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        aria-current={p === page ? 'page' : undefined}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition ${p === page
                            ? 'bg-primary text-white shadow-sm'
                            : 'border border-gray-300 bg-white text-gray-700 hover:border-primary hover:text-primary'
                          }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                {/* Next */}
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!pagination?.hasNextPage}
                  aria-label="Next page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-700 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ›
                </button>

                {/* Last page */}
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  aria-label="Last page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-500 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
