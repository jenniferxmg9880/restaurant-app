import { useState, useEffect } from "react";

// ─────────────────────────────────────────────
//  🔧 CONFIGURATION — fill these in!
//  1. Go to https://supabase.com and create a free project
//  2. Settings → API → copy Project URL and anon key
// ─────────────────────────────────────────────
const SUPABASE_URL = "https://htinjdvtessheedxqlfu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aW5qZHZ0ZXNzaGVlZHhxbGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjQ1NjgsImV4cCI6MjA5MDgwMDU2OH0.YSVuEAC_Anvgf9toVjS2jviYV_NptBtLx6XkYm2hYM0";
const TABLE = "Menu_Items";

async function supabaseRequest(method, body, id) {
  const url = id
    ? `${SUPABASE_URL}/rest/v1/${TABLE}?MenuItem_ID=eq.${id}`
    : `${SUPABASE_URL}/rest/v1/${TABLE}`;

  const res = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return method === "DELETE" ? null : res.json();
}

const CATEGORIES = ["Appetizer", "Main Course", "Dessert", "Drink", "Side", "Special"];
const EMPTY = { Dish_Name: "", Category: "", Price: "" };

export default function MenuItemsApp() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', id? }
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");

  // ── Fetch ─────────────────────────────────
  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await supabaseRequest("GET");
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  // ── Derived data ──────────────────────────
  const categories = ["All", ...new Set(items.map((i) => i.Category).filter(Boolean))];
  const filtered = filterCategory === "All" ? items : items.filter((i) => i.Category === filterCategory);

  // ── Modal helpers ─────────────────────────
  const openAdd = () => { setForm(EMPTY); setModal({ mode: "add" }); };
  const openEdit = (item) => {
    setForm({ Dish_Name: item.Dish_Name ?? "", Category: item.Category ?? "", Price: item.Price ?? "" });
    setModal({ mode: "edit", id: item.MenuItem_ID });
  };

  // ── Save ──────────────────────────────────
  const handleSave = async () => {
    if (!form.Dish_Name.trim()) { setError("Dish name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, Price: parseFloat(form.Price) || 0 };
      if (modal.mode === "add") {
        await supabaseRequest("POST", payload);
      } else {
        await supabaseRequest("PATCH", payload, modal.id);
      }
      setModal(null);
      fetchItems();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────
  const handleDelete = async (id) => {
    setError(null);
    try {
      await supabaseRequest("DELETE", null, id);
      setDeleteId(null);
      fetchItems();
    } catch (e) {
      setError(e.message);
    }
  };

  const s = styles;

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div>
            <div style={s.eyebrow}>RESTAURANT OS</div>
            <h1 style={s.title}>Menu Items</h1>
          </div>
          <button style={s.btnPrimary} onClick={openAdd}>+ Add Dish</button>
        </div>
      </header>

      <main style={s.main}>
        {error && <div style={s.errorBanner}><strong>Error:</strong> {error}</div>}

        {/* ── Stats ── */}
        <div style={s.statsRow}>
          {[
            { label: "Total Dishes", value: items.length },
            { label: "Categories", value: categories.length - 1 },
            { label: "Avg Price", value: items.length ? `$${(items.reduce((a, i) => a + Number(i.Price || 0), 0) / items.length).toFixed(2)}` : "—" },
            { label: "Most Expensive", value: items.length ? `$${Math.max(...items.map((i) => Number(i.Price || 0))).toFixed(2)}` : "—" },
          ].map((stat) => (
            <div key={stat.label} style={s.statCard}>
              <div style={s.statValue}>{stat.value}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Category filter ── */}
        <div style={s.filterRow}>
          {categories.map((cat) => (
            <button
              key={cat}
              style={{ ...s.filterBtn, ...(filterCategory === cat ? s.filterBtnActive : {}) }}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div style={s.tableWrap}>
          {loading ? (
            <div style={s.center}>Loading menu…</div>
          ) : filtered.length === 0 ? (
            <div style={s.center}>No dishes found. Add your first one!</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  {["ID", "Dish Name", "Category", "Price", "Actions"].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.MenuItem_ID} style={{ ...s.tr, background: i % 2 === 0 ? "#fafaf8" : "#fff" }}>
                    <td style={{ ...s.td, color: "#c8590a", fontWeight: 700, fontFamily: "monospace" }}>#{item.MenuItem_ID}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{item.Dish_Name}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: categoryColor(item.Category) }}>
                        {item.Category || "—"}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontWeight: 600 }}>${Number(item.Price || 0).toFixed(2)}</td>
                    <td style={s.td}>
                      <div style={s.actionRow}>
                        <button style={s.btnEdit} onClick={() => openEdit(item)}>Edit</button>
                        <button style={s.btnDelete} onClick={() => setDeleteId(item.MenuItem_ID)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div style={s.overlay} onClick={() => { setModal(null); setError(null); }}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{modal.mode === "add" ? "Add New Dish" : `Edit Dish #${modal.id}`}</h2>

            <label style={s.fieldLabel}>
              Dish Name *
              <input
                style={s.input}
                type="text"
                placeholder="e.g. Grilled Salmon"
                value={form.Dish_Name}
                onChange={(e) => setForm({ ...form, Dish_Name: e.target.value })}
              />
            </label>

            <label style={s.fieldLabel}>
              Category
              <select
                style={s.input}
                value={form.Category}
                onChange={(e) => setForm({ ...form, Category: e.target.value })}
              >
                <option value="">— Select category —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label style={s.fieldLabel}>
              Price ($)
              <input
                style={s.input}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.Price}
                onChange={(e) => setForm({ ...form, Price: e.target.value })}
              />
            </label>

            {error && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 8 }}>{error}</div>}

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => { setModal(null); setError(null); }}>Cancel</button>
              <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Dish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div style={s.overlay} onClick={() => setDeleteId(null)}>
          <div style={{ ...s.modal, maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Delete dish #{deleteId}?</h2>
            <p style={{ color: "#555", marginBottom: 24 }}>This action cannot be undone.</p>
            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setDeleteId(null)}>Cancel</button>
              <button style={{ ...s.btnDelete, padding: "10px 20px", borderRadius: 8 }} onClick={() => handleDelete(deleteId)}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Category badge colors ──────────────────────
function categoryColor(cat) {
  const map = {
    Appetizer: "#fff3cd",
    "Main Course": "#d4edda",
    Dessert: "#f8d7da",
    Drink: "#d1ecf1",
    Side: "#e2e3e5",
    Special: "#fde8d8",
  };
  return map[cat] || "#f0f0ea";
}

// ── Styles ─────────────────────────────────────
const styles = {
  page: { minHeight: "100vh", background: "#f5f4ef", fontFamily: "'Georgia', serif" },
  header: { background: "#1a1a1a", borderBottom: "4px solid #c8590a" },
  headerInner: { maxWidth: 1100, margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: "#c8590a", fontSize: 11, fontFamily: "monospace", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 },
  title: { color: "#fff", fontSize: 32, margin: 0, fontWeight: 400, letterSpacing: -1 },
  main: { maxWidth: 1100, margin: "0 auto", padding: "32px 24px" },
  errorBanner: { background: "#fdecea", border: "1px solid #f5c6cb", color: "#c0392b", padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 14 },
  statsRow: { display: "flex", gap: 16, marginBottom: 24 },
  statCard: { flex: 1, background: "#fff", border: "1px solid #e5e2d9", borderRadius: 12, padding: "20px 24px" },
  statValue: { fontSize: 28, fontWeight: 700, color: "#1a1a1a", letterSpacing: -1 },
  statLabel: { fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, fontFamily: "monospace" },
  filterRow: { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  filterBtn: { background: "#fff", border: "1px solid #ddd", borderRadius: 20, padding: "6px 16px", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif", color: "#555" },
  filterBtnActive: { background: "#1a1a1a", color: "#fff", border: "1px solid #1a1a1a" },
  tableWrap: { background: "#fff", border: "1px solid #e5e2d9", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { background: "#1a1a1a", color: "#fff", padding: "12px 16px", textAlign: "left", fontSize: 12, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", fontWeight: 500 },
  tr: { borderBottom: "1px solid #eee" },
  td: { padding: "13px 16px", fontSize: 14, color: "#333" },
  badge: { display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontFamily: "monospace" },
  actionRow: { display: "flex", gap: 8 },
  center: { padding: 48, textAlign: "center", color: "#888", fontSize: 16 },
  btnPrimary: { background: "#c8590a", color: "#fff", border: "none", padding: "11px 22px", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 15, cursor: "pointer", fontWeight: 600 },
  btnSecondary: { background: "#fff", color: "#333", border: "1px solid #ccc", padding: "11px 22px", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 15, cursor: "pointer" },
  btnEdit: { background: "#f0f0ea", color: "#333", border: "1px solid #ddd", padding: "6px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" },
  btnDelete: { background: "#fdecea", color: "#c0392b", border: "1px solid #f5c6cb", padding: "6px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  modalTitle: { margin: "0 0 24px", fontSize: 22, fontWeight: 400, color: "#1a1a1a" },
  fieldLabel: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, fontSize: 13, color: "#555", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5, background: "#fff" },
  input: { padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 15, fontFamily: "Georgia, serif", color: "#1a1a1a", outline: "none" },
  modalFooter: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 },
};
