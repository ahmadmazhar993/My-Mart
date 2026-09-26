import React, { useEffect, useState } from 'react';
import { userService } from '../../services';
import { useAuthStore } from '../../store';
import { useToast } from '../../components/ToastProvider';

const roleBadge = (role) => {
  const colors = {
    admin: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200',
    seller: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    customer: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200',
  };
  return colors[role] || colors.customer;
};

const statusBadge = (status) => {
  const colors = {
    active: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    inactive: 'bg-gray-50 text-gray-500 ring-1 ring-inset ring-gray-200',
    banned: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
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
      {/* Header card */}
      <div className="rounded-xl border border-gray-100 bg-white px-6 py-5 shadow-card">
        <h2 className="text-2xl font-bold tracking-tight text-dark">Users</h2>
        <p className="mt-0.5 text-sm text-gray-500">Manage user accounts and access</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50/95 text-left text-gray-500 backdrop-blur">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr
                      key={user.id}
                      className={`border-b border-gray-50 transition-colors hover:bg-primary-50/40 ${
                        idx % 2 === 1 ? 'bg-gray-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {[user.fullName].filter(Boolean).join(' ') || '—'}
                        {user.id === currentUser?.id && (
                          <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${roleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadge(user.status.toLowerCase())}`}>
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
                            className="w-28 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium capitalize text-gray-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
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