import { useState, useEffect } from "react";

const SUPABASE_URL = "https://htinjdvtessheedxqlfu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aW5qZHZ0ZXNzaGVlZHhxbGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjQ1NjgsImV4cCI6MjA5MDgwMDU2OH0.YSVuEAC_Anvgf9toVjS2jviYV_NptBtLx6XkYm2hYM0";
const TABLE = "Menu_Items";

async function dbFetch(table, method, body = null, pkField = null, id = null) {
  const url = id
    ? `${SUPABASE_URL}/rest/v1/${table}?${pkField}=eq.${id}`
    : `${SUPABASE_URL}/rest/v1/${table}`;

  const res = await fetch(url, {
    method,
    headers: {
      apikey:         SUPABASE_ANON_KEY,
      Authorization:  `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) throw new Error(await res.text());
  if (method === "DELETE" || method === "PATCH") return null;
  return res.json();
}

const TABLES = [
  {
    key: "Menu_Items", label: "Menu Items", pk: "MenuItem_ID",
    fields: [
      { key: "Dish_Name", label: "Dish Name", type: "text" },
      { key: "Category",  label: "Category",  type: "select",
        options: ["Appetizer","Main Course","Dessert","Drink","Side","Special"] },
      { key: "Price",     label: "Price ($)", type: "number" },
    ],
  },
  {
    key: "Employees", label: "Employees", pk: "Employee_ID",
    fields: [
      { key: "Employee_Name", label: "Name",   type: "text" },
      { key: "SSN",           label: "SSN",    type: "text" },
      { key: "Role",          label: "Role",   type: "select",
        options: ["Manager","Waiter","Chef","Host","Cashier","Cleaner"] },
      { key: "Salary",        label: "Salary", type: "number" },
      { key: "Shift",         label: "Shift",  type: "select",
        options: ["Morning","Afternoon","Evening","Night"] },
    ],
  },
  {
    key: "Customer", label: "Customers", pk: "Customer_ID",
    fields: [
      { key: "Customer_Name",  label: "Name",  type: "text" },
      { key: "Customer_Email", label: "Email", type: "text" },
      { key: "Phone_Number",   label: "Phone", type: "text" },
    ],
  },
  {
    key: "Reservations", label: "Reservations", pk: "Reservation_ID",
    fields: [
      { key: "Customer_ID",      label: "Customer ID", type: "number" },
      { key: "Reservation_Date", label: "Date & Time", type: "datetime-local" },
      { key: "Number_of_people", label: "Guests",      type: "number" },
      { key: "Table_Number",     label: "Table #",     type: "number" },
    ],
  },
  {
    key: "Orders", label: "Orders", pk: "Order_ID",
    fields: [
      { key: "Customer_ID",  label: "Customer ID", type: "number" },
      { key: "Employee_ID",  label: "Employee ID", type: "number" },
      { key: "Order_Date",   label: "Order Date",  type: "datetime-local" },
      { key: "Total_Amount", label: "Total ($)",   type: "number" },
      { key: "Total_Items",  label: "Total Items", type: "number" },
    ],
  },
  {
    key: "Payments", label: "Payments", pk: "Payment_ID",
    fields: [
      { key: "Order_ID",       label: "Order ID",        type: "number" },
      { key: "Payment_Type",   label: "Payment Type",    type: "select",
        options: ["Cash","Credit Card","Debit Card","Mobile Pay"] },
      { key: "Tip_Percentage", label: "Tip (%)",         type: "number" },
      { key: "Amount_Paid",    label: "Amount Paid ($)", type: "number" },
      { key: "Payment_Date",   label: "Payment Date",    type: "datetime-local" },
    ],
  },
  {
    key: "Order_Items", label: "Order Items", pk: "OrderItem_ID",
    fields: [
      { key: "Order_ID",    label: "Order ID",      type: "number" },
      { key: "MenuItem_ID", label: "Menu Item ID",  type: "number" },
      { key: "Quantity",    label: "Quantity",      type: "number" },
      { key: "Item_Price",  label: "Item Price ($)", type: "number" },
    ],
  },
  {
    key: "Storage_Items", label: "Storage", pk: "StorageItem_ID",
    fields: [
      { key: "MenuItem_ID",        label: "Menu Item ID",     type: "number" },
      { key: "Quantity_In_Stock",  label: "Qty In Stock",     type: "number" },
      { key: "Unit",               label: "Unit",             type: "select",
        options: ["kg","g","L","ml","units","boxes","bags"] },
    ],
  },
];

const REPORTS = [
  {
    key:   "Order_Summary",
    label: "Order Summary",
    description: "Orders joined with customer and employee names",
    columns: ["Order_ID","Customer_Name","Employee_Name","Order_Date","Total_Amount","Total_Items"],
  },
  {
    key:   "Menu_Stock_Summary",
    label: "Menu Stock",
    description: "Menu items with their current storage stock levels",
    columns: ["MenuItem_ID","Dish_Name","Category","Price","Quantity_In_Stock","Unit"],
  },
  {
    key:   "Sales_By_Category",
    label: "Sales by Category",
    description: "Revenue and sales volume grouped by food category",
    columns: ["Category","Total_Orders","Total_Items_Sold","Total_Revenue","Avg_Menu_Price"],
  },
];

const EMPTY_FORM = (fields) =>
  Object.fromEntries(fields.map((f) => [f.key, ""]));

const isCurrency = (key) =>
  ["price","amount","salary","revenue","avg_menu_price","item_price"]
    .some((k) => key.toLowerCase().includes(k));

const isDate = (key) => key.toLowerCase().includes("date");

function formatCell(key, val) {
  if (val === null || val === undefined || val === "") return "—";
  if (isDate(key))     return new Date(val).toLocaleString();
  if (isCurrency(key)) return `$${Number(val).toFixed(2)}`;
  return val;
}

function ReportView({ report }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    dbFetch(report.key, "GET")
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [report.key]);

  const s = styles;

  return (
    <div>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 16, fontFamily: "monospace" }}>
        {report.description}
      </p>
      {error && <div style={s.errorBanner}>{error}</div>}
      <div style={s.tableWrap}>
        {loading ? (
          <div style={s.center}>Loading {report.label}…</div>
        ) : rows.length === 0 ? (
          <div style={s.center}>No data yet — add records to the related tables first.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {report.columns.map((col) => (
                  <th key={col} style={s.th}>{col.replace(/_/g, " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={s.tr}>
                  {report.columns.map((col) => (
                    <td key={col} style={s.td}>{formatCell(col, row[col])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


function TableView({ tableDef }) {
  const { key, pk, fields, label } = tableDef;
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM(fields));
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteId, setDeleteId] = useState(null);

  const fetch_ = async () => {
    setLoading(true); setError(null);
    try   { setRows(await dbFetch(key, "GET")); }
    catch (e) { setError(e.message); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, [key]);

  const handleAdd = async () => {
    setSaving(true); setError(null);
    try {
      const payload = Object.fromEntries(
        fields.map((f) => [f.key, f.type === "number" ? parseFloat(form[f.key]) || 0 : form[f.key]])
      );
      await dbFetch(key, "POST", payload);
      setForm(EMPTY_FORM(fields));
      fetch_();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (row) => {
    setEditId(row[pk]);
    setEditForm(Object.fromEntries(fields.map((f) => [f.key, row[f.key] ?? ""])));
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const payload = Object.fromEntries(
        fields.map((f) => [f.key, f.type === "number" ? parseFloat(editForm[f.key]) || 0 : editForm[f.key]])
      );
      await dbFetch(key, "PATCH", payload, pk, editId);
      setEditId(null);
      fetch_();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setError(null);
    try { await dbFetch(key, "DELETE", null, pk, id); setDeleteId(null); fetch_(); }
    catch (e) { setError(e.message); }
  };

  const s = styles;
  const displayFields = fields.slice(0, 4);

  return (
    <div>
      {error && <div style={s.errorBanner}>{error}</div>}

      <div style={s.addRow}>
        {fields.map((f) => (
          f.type === "select" ? (
            <select key={f.key} style={s.input}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
              <option value="">{f.label}</option>
              {f.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input key={f.key} style={s.input} type={f.type}
              placeholder={f.label}
              step={f.type === "number" ? "0.01" : undefined}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          )
        ))}
        <button style={s.btnPrimary} onClick={handleAdd} disabled={saving}>
          {saving ? "Adding…" : "+ Add row"}
        </button>
      </div>

      <div style={s.tableWrap}>
        {loading ? (
          <div style={s.center}>Loading {label}…</div>
        ) : rows.length === 0 ? (
          <div style={s.center}>No records yet — add your first row above.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                {displayFields.map((f) => <th key={f.key} style={s.th}>{f.label}</th>)}
                <th style={{ ...s.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) =>
                editId === row[pk] ? (
                  <tr key={row[pk]} style={{ ...s.tr, background: "#fffdf9" }}>
                    <td style={{ ...s.td, color: "#888", fontSize: 13 }}>{row[pk]}</td>
                    {fields.map((f) => (
                      <td key={f.key} style={s.td}>
                        {f.type === "select" ? (
                          <select style={s.inlineInput} value={editForm[f.key]}
                            onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}>
                            {f.options.map((o) => <option key={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input style={s.inlineInput} type={f.type}
                            step={f.type === "number" ? "0.01" : undefined}
                            value={editForm[f.key]}
                            onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                          />
                        )}
                      </td>
                    ))}
                    <td style={{ ...s.td, textAlign: "right" }}>
                      <button style={s.btnSave} onClick={handleSave} disabled={saving}>
                        {saving ? "…" : "Save"}
                      </button>
                      <button style={s.btnCancel} onClick={() => setEditId(null)}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={row[pk]} style={s.tr}>
                    <td style={{ ...s.td, color: "#c8590a", fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>#{row[pk]}</td>
                    {displayFields.map((f) => (
                      <td key={f.key} style={s.td}>{formatCell(f.key, row[f.key])}</td>
                    ))}
                    <td style={{ ...s.td, textAlign: "right" }}>
                      <button style={s.btnEdit} onClick={() => startEdit(row)}>Edit</button>
                      <button style={s.btnDel}  onClick={() => setDeleteId(row[pk])}>Remove</button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>

      {deleteId && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Remove this record?</h2>
            <p style={{ color: "#555", marginBottom: 24, fontSize: 14 }}>
              Record <strong>#{deleteId}</strong> will be permanently deleted.
            </p>
            <div style={s.modalFooter}>
              <button style={s.btnCancel} onClick={() => setDeleteId(null)}>Cancel</button>
              <button style={{ ...s.btnDel, padding: "10px 20px", borderRadius: 8 }}
                onClick={() => handleDelete(deleteId)}>Yes, remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function App() {
  const [activeKey,     setActiveKey]     = useState("Menu_Items");
  const [section,       setSection]       = useState("tables"); // "tables" | "reports"
  const [activeReport,  setActiveReport]  = useState("Order_Summary");

  const activeTable  = TABLES.find((t)  => t.key === activeKey);
  const activeRep    = REPORTS.find((r) => r.key === activeReport);
  const s = styles;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerInner}>
          <div>
            <div style={s.eyebrow}>RESTAURANT OS</div>
            <h1 style={s.title}>Dashboard</h1>
          </div>
          <div style={s.sectionTabs}>
            <button
              style={{ ...s.sectionTab, ...(section === "tables"  ? s.sectionTabActive : {}) }}
              onClick={() => setSection("tables")}>
              Tables
            </button>
            <button
              style={{ ...s.sectionTab, ...(section === "reports" ? s.sectionTabActive : {}) }}
              onClick={() => setSection("reports")}>
              Reports
            </button>
          </div>
        </div>
      </header>

      <div style={s.layout}>
        {/* Sidebar */}
        <nav style={s.sidebar}>
          {section === "tables" ? (
            TABLES.map((t) => (
              <button key={t.key}
                style={{ ...s.navBtn, ...(activeKey === t.key ? s.navBtnActive : {}) }}
                onClick={() => setActiveKey(t.key)}>
                {t.label}
              </button>
            ))
          ) : (
            REPORTS.map((r) => (
              <button key={r.key}
                style={{ ...s.navBtn, ...(activeReport === r.key ? s.navBtnActive : {}) }}
                onClick={() => setActiveReport(r.key)}>
                {r.label}
              </button>
            ))
          )}
        </nav>

        {/* Content */}
        <main style={s.content}>
          {section === "tables" ? (
            <>
              <h2 style={s.pageTitle}>{activeTable.label}</h2>
              <TableView key={activeKey} tableDef={activeTable} />
            </>
          ) : (
            <>
              <h2 style={s.pageTitle}>{activeRep.label}</h2>
              <ReportView key={activeReport} report={activeRep} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const styles = {
  page:           { minHeight: "100vh", background: "#f5f4ef", fontFamily: "'Georgia', serif" },
  header:         { background: "#1a1a1a", borderBottom: "4px solid #c8590a" },
  headerInner:    { maxWidth: 1200, margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  eyebrow:        { color: "#c8590a", fontSize: 11, fontFamily: "monospace", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 },
  title:          { color: "#fff", fontSize: 28, margin: 0, fontWeight: 400 },
  sectionTabs:    { display: "flex", gap: 8 },
  sectionTab:     { background: "transparent", border: "1px solid #555", color: "#aaa", borderRadius: 8, padding: "8px 20px", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" },
  sectionTabActive:{ background: "#c8590a", color: "#fff", border: "1px solid #c8590a" },
  layout:         { display: "flex", maxWidth: 1200, margin: "0 auto", padding: "32px 24px", gap: 24 },
  sidebar:        { display: "flex", flexDirection: "column", gap: 6, width: 160, flexShrink: 0 },
  navBtn:         { background: "#fff", border: "1px solid #e5e2d9", borderRadius: 8, padding: "10px 14px", textAlign: "left", fontSize: 14, cursor: "pointer", fontFamily: "Georgia, serif", color: "#555" },
  navBtnActive:   { background: "#1a1a1a", color: "#fff", border: "1px solid #1a1a1a" },
  content:        { flex: 1, minWidth: 0 },
  pageTitle:      { fontSize: 22, fontWeight: 400, color: "#1a1a1a", margin: "0 0 20px" },
  errorBanner:    { background: "#fdecea", border: "1px solid #f5c6cb", color: "#c0392b", padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  addRow:         { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  input:          { padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif", color: "#1a1a1a", minWidth: 80, flex: 1, background: "#fff" },
  tableWrap:      { background: "#fff", border: "1px solid #e5e2d9", borderRadius: 12, overflow: "auto" },
  table:          { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  th:             { background: "#1a1a1a", color: "#fff", padding: "10px 14px", fontSize: 11, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", fontWeight: 500, textAlign: "left", whiteSpace: "nowrap" },
  tr:             { borderBottom: "1px solid #eee" },
  td:             { padding: "11px 14px", fontSize: 13, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  inlineInput:    { padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, width: "100%", boxSizing: "border-box", fontFamily: "Georgia, serif" },
  center:         { padding: 40, textAlign: "center", color: "#888", fontSize: 14 },
  btnPrimary:     { background: "#c8590a", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  btnEdit:        { background: "#f0f0ea", color: "#333", border: "1px solid #ddd", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", marginRight: 6, fontFamily: "Georgia, serif" },
  btnDel:         { background: "#fdecea", color: "#c0392b", border: "1px solid #f5c6cb", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" },
  btnSave:        { background: "#1a1a1a", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", marginRight: 6, fontFamily: "Georgia, serif" },
  btnCancel:      { background: "#fff", color: "#333", border: "1px solid #ccc", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" },
  overlay:        { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:          { background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  modalTitle:     { margin: "0 0 12px", fontSize: 20, fontWeight: 400 },
  modalFooter:    { display: "flex", gap: 10, justifyContent: "flex-end" },
};
