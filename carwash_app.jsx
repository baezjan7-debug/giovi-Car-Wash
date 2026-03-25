import { useState, useEffect, useCallback } from "react";

const WEEKS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const STORAGE_KEY = "carwash_data_v1";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { jobs: [] };
  } catch {
    return { jobs: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getWeekLabel(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) =>
    d.toLocaleDateString("es-US", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

function getWeekId(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  return monday.toISOString().slice(0, 10);
}

function getMonthId(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const CAR_TYPES = ["Sedan", "SUV", "Truck", "Van", "Otro"];

export default function App() {
  const [data, setData] = useState(loadData);
  const [view, setView] = useState("semana"); // semana | mes | historial
  const [weekOffset, setWeekOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ cliente: "", carro: "", tipo: "Sedan", precio: "", dia: "Lun", nota: "" });
  const [selectedMonth, setSelectedMonth] = useState(getMonthId());
  const [confirmDelete, setConfirmDelete] = useState(null);

  const persist = useCallback((next) => {
    setData(next);
    saveData(next);
  }, []);

  const weekId = getWeekId(weekOffset);
  const weekJobs = data.jobs.filter((j) => j.weekId === weekId);

  const monthJobs = data.jobs.filter((j) => {
    if (!j.date) return false;
    return getMonthId(new Date(j.date + "T12:00:00")) === selectedMonth;
  });

  const totalSemana = weekJobs.reduce((s, j) => s + Number(j.precio || 0), 0);
  const totalMes = monthJobs.reduce((s, j) => s + Number(j.precio || 0), 0);

  const openAdd = () => {
    setForm({ cliente: "", carro: "", tipo: "Sedan", precio: "", dia: "Lun", nota: "" });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (job) => {
    setForm({ cliente: job.cliente, carro: job.carro, tipo: job.tipo || "Sedan", precio: String(job.precio), dia: job.dia, nota: job.nota || "" });
    setEditingId(job.id);
    setShowForm(true);
  };

  const submitForm = () => {
    if (!form.cliente.trim() || !form.carro.trim() || !form.precio) return;
    // compute date from weekId + dia
    const diaIndex = WEEKS.indexOf(form.dia);
    const base = new Date(weekId + "T12:00:00");
    base.setDate(base.getDate() + diaIndex);
    const dateStr = base.toISOString().slice(0, 10);

    if (editingId) {
      persist({
        ...data,
        jobs: data.jobs.map((j) =>
          j.id === editingId ? { ...j, ...form, precio: Number(form.precio), weekId, date: dateStr } : j
        ),
      });
    } else {
      const job = { id: Date.now().toString(), ...form, precio: Number(form.precio), weekId, date: dateStr };
      persist({ ...data, jobs: [job, ...data.jobs] });
    }
    setShowForm(false);
  };

  const deleteJob = (id) => {
    persist({ ...data, jobs: data.jobs.filter((j) => j.id !== id) });
    setConfirmDelete(null);
  };

  // Group week jobs by day
  const byDay = WEEKS.reduce((acc, d) => {
    acc[d] = weekJobs.filter((j) => j.dia === d);
    return acc;
  }, {});

  // Available months for selector
  const allMonths = [...new Set(data.jobs.map((j) => j.date && getMonthId(new Date(j.date + "T12:00:00"))).filter(Boolean))].sort().reverse();
  if (!allMonths.includes(getMonthId())) allMonths.unshift(getMonthId());

  const cut20 = totalMes * 0.2;
  const cut40 = totalMes * 0.4;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", minHeight: "100vh", background: "#0a0f1e", color: "#e8eaf6" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #2d3561; border-radius: 2px; }
        input, select, textarea { font-family: inherit; }
        .btn { border: none; cursor: pointer; border-radius: 10px; font-family: inherit; font-weight: 600; transition: all 0.15s; }
        .btn:active { transform: scale(0.97); }
        .card { background: #12192e; border: 1px solid #1e2a45; border-radius: 16px; }
        .tag { display:inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .slide-in { animation: slideIn 0.25s ease; }
        @keyframes slideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        .nav-btn { background: transparent; border: none; cursor: pointer; padding: 8px 14px; border-radius: 8px; color: #8899bb; font-family: inherit; font-weight: 600; font-size: 13px; transition: all 0.15s; }
        .nav-btn.active { background: #1e2a45; color: #7ec8f0; }
        .form-input { width: 100%; background: #0d1526; border: 1.5px solid #1e2a45; border-radius: 10px; padding: 10px 12px; color: #e8eaf6; font-size: 14px; outline: none; transition: border 0.2s; }
        .form-input:focus { border-color: #7ec8f0; }
        .job-row { background: #0d1526; border: 1px solid #1a2440; border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; transition: border 0.15s; }
        .job-row:hover { border-color: #2d4070; }
        .day-section { margin-bottom: 16px; }
        .day-label { font-size: 11px; font-weight: 700; color: #4a6090; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-left: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#0d1526", borderBottom: "1px solid #1a2440", padding: "14px 20px", position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 22 }}>🚗</div>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, color: "#7ec8f0" }}>Car Wash Pro</div>
          <div style={{ fontSize: 11, color: "#4a6090" }}>Control de Rutas</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {["semana", "mes", "historial"].map((v) => (
            <button key={v} className={`nav-btn ${view === v ? "active" : ""}`} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px", maxWidth: 520, margin: "0 auto" }}>

        {/* ========== SEMANA VIEW ========== */}
        {view === "semana" && (
          <div className="slide-in">
            {/* Week nav */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <button className="btn" onClick={() => setWeekOffset(o => o - 1)} style={{ background: "#1a2440", color: "#7ec8f0", padding: "8px 12px", fontSize: 16 }}>‹</button>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#e8eaf6" }}>{weekOffset === 0 ? "Esta semana" : weekOffset === -1 ? "Semana pasada" : getWeekLabel(weekOffset)}</div>
                <div style={{ fontSize: 11, color: "#4a6090" }}>{getWeekLabel(weekOffset)}</div>
              </div>
              <button className="btn" onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0} style={{ background: weekOffset >= 0 ? "#0d1526" : "#1a2440", color: weekOffset >= 0 ? "#2d3a55" : "#7ec8f0", padding: "8px 12px", fontSize: 16 }}>›</button>
            </div>

            {/* Live summary card */}
            <div className="card" style={{ padding: 16, marginBottom: 16, background: "linear-gradient(135deg, #0f1f3d, #12192e)" }}>
              <div style={{ fontSize: 11, color: "#4a6090", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                <span className="pulse" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#4ade80", marginRight: 6 }}></span>
                Total en vivo esta semana
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "#4ade80" }}>${totalSemana.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: "#4a6090", marginTop: 4 }}>{weekJobs.length} servicio{weekJobs.length !== 1 ? "s" : ""}</div>
            </div>

            {/* Days */}
            {WEEKS.map((dia) => {
              const jobs = byDay[dia];
              if (jobs.length === 0 && weekOffset < 0) return null;
              return (
                <div key={dia} className="day-section">
                  <div className="day-label">{dia} {jobs.length > 0 && <span style={{ color: "#7ec8f0" }}>· {jobs.length}</span>}</div>
                  {jobs.length === 0 && (
                    <div style={{ fontSize: 12, color: "#2d3a55", padding: "8px 4px" }}>Sin servicios</div>
                  )}
                  {jobs.map((job) => (
                    <div key={job.id} className="job-row" style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 20 }}>
                        {job.tipo === "SUV" ? "🚙" : job.tipo === "Truck" ? "🛻" : job.tipo === "Van" ? "🚐" : "🚗"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#e8eaf6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.cliente}</div>
                        <div style={{ fontSize: 12, color: "#4a6090" }}>{job.carro} · <span className="tag" style={{ background: "#1a2f50", color: "#7ec8f0" }}>{job.tipo}</span></div>
                        {job.nota && <div style={{ fontSize: 11, color: "#4a6090", marginTop: 2, fontStyle: "italic" }}>{job.nota}</div>}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#4ade80", minWidth: 60, textAlign: "right" }}>${Number(job.precio).toFixed(2)}</div>
                      <button className="btn" onClick={() => openEdit(job)} style={{ background: "#1a2440", color: "#7ec8f0", padding: "6px 8px", fontSize: 12, marginLeft: 4 }}>✏️</button>
                      <button className="btn" onClick={() => setConfirmDelete(job.id)} style={{ background: "#2a1520", color: "#f87171", padding: "6px 8px", fontSize: 12 }}>🗑</button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ========== MES VIEW ========== */}
        {view === "mes" && (
          <div className="slide-in">
            <div style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
              <select className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ flex: 1 }}>
                {allMonths.map(m => (
                  <option key={m} value={m}>{new Date(m + "-15").toLocaleDateString("es-US", { month: "long", year: "numeric" })}</option>
                ))}
              </select>
            </div>

            {/* Big totals */}
            <div className="card" style={{ padding: 20, marginBottom: 14, background: "linear-gradient(135deg, #0f1f3d, #12192e)" }}>
              <div style={{ fontSize: 11, color: "#4a6090", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                <span className="pulse" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#4ade80", marginRight: 6 }}></span>
                Cuadre del mes en vivo
              </div>
              <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "#4ade80", marginBottom: 4 }}>${totalMes.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: "#4a6090" }}>{monthJobs.length} servicios</div>
            </div>

            {/* Distribution cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Car Wash", pct: 20, amount: cut20, color: "#7ec8f0", icon: "🏢" },
                { label: "Tú", pct: 40, amount: cut40, color: "#a78bfa", icon: "👤" },
                { label: "Ayudante", pct: 40, amount: cut40, color: "#fb923c", icon: "🤝" },
              ].map((item) => (
                <div key={item.label} className="card" style={{ padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 22 }}>{item.icon}</div>
                  <div style={{ fontSize: 10, color: "#4a6090", fontWeight: 700, margin: "4px 0 2px" }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: item.color, fontWeight: 700 }}>{item.pct}%</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: item.color, fontFamily: "'Space Grotesk', sans-serif" }}>${item.amount.toFixed(0)}</div>
                </div>
              ))}
            </div>

            {/* Bar visual */}
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#4a6090", fontWeight: 700, marginBottom: 10 }}>Distribución visual</div>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 20 }}>
                <div style={{ width: "20%", background: "#7ec8f0" }}></div>
                <div style={{ width: "40%", background: "#a78bfa" }}></div>
                <div style={{ width: "40%", background: "#fb923c" }}></div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "#8899bb" }}>
                <span style={{ color: "#7ec8f0" }}>■ Car Wash 20%</span>
                <span style={{ color: "#a78bfa" }}>■ Tú 40%</span>
                <span style={{ color: "#fb923c" }}>■ Ayudante 40%</span>
              </div>
            </div>

            {/* Jobs list */}
            <div style={{ fontSize: 11, color: "#4a6090", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Servicios del mes</div>
            {monthJobs.length === 0 && <div style={{ fontSize: 13, color: "#2d3a55", padding: "12px 0" }}>No hay servicios este mes.</div>}
            {monthJobs.map((job) => (
              <div key={job.id} className="job-row" style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 18 }}>{job.tipo === "SUV" ? "🚙" : job.tipo === "Truck" ? "🛻" : job.tipo === "Van" ? "🚐" : "🚗"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{job.cliente}</div>
                  <div style={{ fontSize: 11, color: "#4a6090" }}>{job.carro} · {job.date ? new Date(job.date + "T12:00:00").toLocaleDateString("es-US", { weekday: "short", month: "short", day: "numeric" }) : ""}</div>
                </div>
                <div style={{ fontWeight: 700, color: "#4ade80" }}>${Number(job.precio).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {/* ========== HISTORIAL VIEW ========== */}
        {view === "historial" && (
          <div className="slide-in">
            <div style={{ fontSize: 11, color: "#4a6090", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Todos los registros</div>
            {data.jobs.length === 0 && <div style={{ fontSize: 13, color: "#2d3a55" }}>No hay registros todavía.</div>}
            {data.jobs.map((job) => (
              <div key={job.id} className="job-row" style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 18 }}>{job.tipo === "SUV" ? "🚙" : job.tipo === "Truck" ? "🛻" : job.tipo === "Van" ? "🚐" : "🚗"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{job.cliente}</div>
                  <div style={{ fontSize: 11, color: "#4a6090" }}>{job.carro} · {job.date ? new Date(job.date + "T12:00:00").toLocaleDateString("es-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : ""}</div>
                </div>
                <div style={{ fontWeight: 700, color: "#4ade80", marginRight: 8 }}>${Number(job.precio).toFixed(2)}</div>
                <button className="btn" onClick={() => setConfirmDelete(job.id)} style={{ background: "#2a1520", color: "#f87171", padding: "5px 8px", fontSize: 12 }}>🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {view === "semana" && (
        <button
          className="btn"
          onClick={openAdd}
          style={{ position: "fixed", bottom: 24, right: 20, background: "linear-gradient(135deg, #7ec8f0, #5ba8d0)", color: "#0a0f1e", width: 56, height: 56, borderRadius: "50%", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(126,200,240,0.35)" }}
        >+</button>
      )}

      {/* ========== FORM MODAL ========== */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "#0d1526", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, margin: "0 auto", padding: 24, border: "1px solid #1e2a45" }} className="slide-in">
            <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>{editingId ? "Editar servicio" : "Nuevo servicio"}</div>
              <button className="btn" onClick={() => setShowForm(false)} style={{ background: "#1a2440", color: "#8899bb", padding: "6px 10px" }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#4a6090", fontWeight: 700, marginBottom: 5 }}>CLIENTE</div>
                <input className="form-input" placeholder="Nombre del cliente" value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#4a6090", fontWeight: 700, marginBottom: 5 }}>CARRO / PLACA</div>
                <input className="form-input" placeholder="Ej: Toyota Camry · ABC-123" value={form.carro} onChange={e => setForm(f => ({ ...f, carro: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#4a6090", fontWeight: 700, marginBottom: 5 }}>TIPO</div>
                  <select className="form-input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    {CAR_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#4a6090", fontWeight: 700, marginBottom: 5 }}>DÍA</div>
                  <select className="form-input" value={form.dia} onChange={e => setForm(f => ({ ...f, dia: e.target.value }))}>
                    {WEEKS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#4a6090", fontWeight: 700, marginBottom: 5 }}>PRECIO ($)</div>
                <input className="form-input" type="number" placeholder="0.00" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#4a6090", fontWeight: 700, marginBottom: 5 }}>NOTA (opcional)</div>
                <input className="form-input" placeholder="Ej: interior detailing, cliente VIP..." value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} />
              </div>
              <button
                className="btn"
                onClick={submitForm}
                disabled={!form.cliente.trim() || !form.carro.trim() || !form.precio}
                style={{ background: form.cliente && form.carro && form.precio ? "linear-gradient(135deg, #7ec8f0, #5ba8d0)" : "#1a2440", color: form.cliente && form.carro && form.precio ? "#0a0f1e" : "#2d3a55", padding: "14px", fontSize: 15, marginTop: 4 }}
              >
                {editingId ? "Guardar cambios" : "Agregar servicio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card" style={{ padding: 24, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>¿Eliminar servicio?</div>
            <div style={{ fontSize: 13, color: "#4a6090", marginBottom: 20 }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: "#1a2440", color: "#8899bb", padding: 12 }}>Cancelar</button>
              <button className="btn" onClick={() => deleteJob(confirmDelete)} style={{ flex: 1, background: "#7f1d1d", color: "#fca5a5", padding: 12 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
