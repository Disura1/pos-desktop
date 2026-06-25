import React, { useState, useEffect } from "react";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  hardDeleteBranch,
} from "../../services/branchService";

const empty = {
  branch_name: "",
  address: "",
  phone: "",
  receipt_prefix: "",
  is_active: true,
};

const BranchManager = () => {
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "success" });

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "success" }), 3500);
  };

  const load = () => {
    setLoading(true);
    getBranches()
      .then(setBranches)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(empty);
    setEditBranch(null);
    setShowModal(true);
  };
  const openEdit = (b) => {
    setForm({
      branch_name: b.branch_name,
      address: b.address || "",
      phone: b.phone || "",
      receipt_prefix: b.receipt_prefix || "",
      is_active: b.is_active,
    });
    setEditBranch(b);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.branch_name.trim()) return;
    setSaving(true);
    try {
      if (editBranch) await updateBranch(editBranch.id, form);
      else await createBranch(form);
      showMsg(editBranch ? "Branch updated!" : "Branch created!");
      setShowModal(false);
      load();
    } catch (err) {
      showMsg("Error: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (b) => {
    if (
      !window.confirm(
        `Deactivate "${b.branch_name}"?\n\nThe branch will be hidden from active use but data is kept.`,
      )
    )
      return;
    try {
      await deleteBranch(b.id);
      showMsg(`"${b.branch_name}" deactivated.`);
      load();
    } catch (err) {
      showMsg("Error: " + (err.response?.data?.error || err.message), "error");
    }
  };

  const handleHardDelete = async (b) => {
    if (
      !window.confirm(
        `⚠️ PERMANENTLY DELETE "${b.branch_name}"?\n\n` +
          `This will remove the branch and all its inventory records.\n` +
          `Sales history will be kept.\n\n` +
          `This CANNOT be undone. Are you sure?`,
      )
    )
      return;
    try {
      await hardDeleteBranch(b.id);
      showMsg(`"${b.branch_name}" permanently deleted.`);
      load();
    } catch (err) {
      showMsg("Error: " + (err.response?.data?.error || err.message), "error");
    }
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-sub)" }}>
          {branches.length} branch(es) total
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + New Branch
        </button>
      </div>

      {/* Message */}
      {msg.text && (
        <div
          className={`alert alert-${msg.type === "error" ? "danger" : "success"}`}
          style={{ marginBottom: 16 }}
        >
          {msg.text}
        </div>
      )}

      {/* Branch Cards */}
      <div className="grid-3" style={{ gap: 16 }}>
        {loading ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40 }}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          branches.map((b) => (
            <div
              key={b.id}
              className="card"
              style={{
                borderTop: `4px solid ${b.is_active ? "var(--pink)" : "var(--border)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {b.branch_name}
                  </div>
                  <span
                    className={`badge ${b.is_active ? "badge-success" : "badge-gray"}`}
                  >
                    {b.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <span style={{ fontSize: 24 }}>🏪</span>
              </div>

              {b.address && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-sub)",
                    marginBottom: 4,
                  }}
                >
                  📍 {b.address}
                </div>
              )}
              {b.phone && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-sub)",
                    marginBottom: 4,
                  }}
                >
                  📞 {b.phone}
                </div>
              )}
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 14,
                }}
              >
                👥 {b.staff_count || 0} staff
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => openEdit(b)}
                >
                  Edit
                </button>
                {b.is_active && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDeactivate(b)}
                    title="Deactivate (keeps data)"
                  >
                    Deactivate
                  </button>
                )}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleHardDelete(b)}
                  title="Permanently delete this branch"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal modal-sm">
            <div className="modal-title">
              {editBranch ? "✏️ Edit Branch" : "🏪 New Branch"}
            </div>
            <div className="form-group">
              <label className="form-label">Branch Name *</label>
              <input
                className="form-control"
                value={form.branch_name}
                onChange={(e) =>
                  setForm({ ...form, branch_name: e.target.value })
                }
                placeholder="e.g. Kandy Branch"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                className="form-control"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-control"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+94 XX XXX XXXX"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Receipt Prefix</label>
              <input
                className="form-control"
                style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                value={form.receipt_prefix || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    receipt_prefix: e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 6),
                  })
                }
                placeholder="e.g. TGM"
                maxLength={6}
              />
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 3,
                }}
              >
                Used in receipt numbers — e.g. TGM-000007. Max 6 characters.
              </div>
            </div>
            {editBranch && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={form.is_active ? "true" : "false"}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.value === "true" })
                  }
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            )}
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <span className="spinner" /> : "Save Branch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManager;
