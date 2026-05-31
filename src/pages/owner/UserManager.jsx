import React, { useState, useEffect } from 'react';
import { getUsers, getRoles, createUser, updateUser, resetPassword } from '../../services/userService';
import { getBranches } from '../../services/branchService';
import { initials } from '../../utils/formatters';

const emptyForm = { username: '', password: '', full_name: '', role_id: '', branch_id: '', is_active: true };

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [search, setSearch] = useState('');

  const load = () => {
    Promise.all([getUsers(), getRoles(), getBranches()]).then(([u, r, b]) => { setUsers(u); setRoles(r); setBranches(b.filter(x => x.is_active)); });
  };
  useEffect(() => { load(); }, []);

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 3000); };

  const openCreate = () => { setForm(emptyForm); setEditUser(null); setShowModal(true); };
  const openEdit = (u) => {
    setForm({ full_name: u.full_name || '', role_id: u.role_id, branch_id: u.branch_id || '', is_active: u.is_active });
    setEditUser(u); setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editUser) await updateUser(editUser.id, form);
      else await createUser(form);
      showMsg(editUser ? 'User updated successfully!' : 'User created successfully!');
      setShowModal(false);
      load();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Save failed', 'danger');
    } finally { setSaving(false); }
  };

  const handleResetPw = async () => {
    if (!newPw || newPw.length < 6) { showMsg('Password must be at least 6 characters', 'danger'); return; }
    setSaving(true);
    try {
      await resetPassword(editUser.id, { newPassword: newPw });
      showMsg('Password reset successfully!');
      setShowPwModal(false);
      setNewPw('');
    } catch { showMsg('Failed to reset password', 'danger'); }
    finally { setSaving(false); }
  };

  const ROLE_COLORS = { Owner: 'badge-danger', Manager: 'badge-info', Cashier: 'badge-success' };

  const filtered = users.filter(u =>
    `${u.username} ${u.full_name} ${u.role_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <input
          className="form-control"
          style={{ maxWidth: 300 }}
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={openCreate}>+ New User</button>
      </div>

      {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 14 }}>{msg.text}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th><th>Username</th><th>Role</th><th>Branch</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--pink-light)', color: 'var(--pink-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                      {initials(u.full_name || u.username)}
                    </div>
                    <div style={{ fontWeight: 600 }}>{u.full_name || '—'}</div>
                  </div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{u.username}</td>
                <td><span className={`badge ${ROLE_COLORS[u.role_name] || 'badge-gray'}`}>{u.role_name}</span></td>
                <td style={{ fontSize: 13 }}>{u.branch_name || <span style={{ color: 'var(--text-muted)' }}>All</span>}</td>
                <td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-gray'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>Edit</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditUser(u); setShowPwModal(true); }}>Reset PW</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state"><span className="empty-state-icon">👥</span><div className="empty-state-text">No users found</div></div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{editUser ? '✏️ Edit User' : '👤 New User'}</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" />
              </div>
              {!editUser && (
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input className="form-control" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="username" autoFocus />
                </div>
              )}
            </div>
            {!editUser && (
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-control" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="form-control" value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })}>
                  <option value="">Select role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Branch</label>
                <select className="form-control" value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}>
                  <option value="">All / None</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                </select>
              </div>
            </div>
            {editUser && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.is_active ? 'true' : 'false'} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPwModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPwModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-title">🔑 Reset Password — {editUser?.username}</div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-control" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters" autoFocus />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPwModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResetPw} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
