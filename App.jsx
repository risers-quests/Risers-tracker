import { useState, useEffect } from "react";

// ── Design tokens ──────────────────────────────────────────────────────────
const T = {
  forest:    "#1B2E24",
  parchment: "#F5EDD6",
  amber:     "#D4841A",
  moss:      "#4A7C59",
  sky:       "#6BA3BE",
  danger:    "#C0392B",
  mist:      "#E8DFC8",
  ink:       "#2C3E35",
  ghost:     "#A09880",
};

const LEVEL_META = {
  "":           { label: "—",        color: "#D5CDB8", rank: 0 },
  "Emerging":   { label: "Emerging",   color: "#C0392B", rank: 1 },
  "Developing": { label: "Developing", color: "#D4841A", rank: 2 },
  "Secure":     { label: "Secure",     color: "#6BA3BE", rank: 3 },
  "Exceeding":  { label: "Exceeding",  color: "#4A7C59", rank: 4 },
};

const SECTIONS = [
  "Deep Dive",
  "Brain Dump",
  "Blueprint",
  "Experiment / Data Analysis",
  "What If",
  "Leave a Door Open",
];

const SECTION_SHORT = ["DD", "BD", "BP", "EX", "WI", "LD"];

const DEFAULT_KIDS = [
  "Riser 1","Riser 2","Riser 3","Riser 4","Riser 5","Riser 6",
  "Riser 7","Riser 8","Riser 9","Riser 10","Riser 11","Riser 12",
];

const emptyEntry = () => ({
  questName: "",
  week: "",
  day1Done: false, day2Done: false, day3Done: false,
  sections: Object.fromEntries(SECTIONS.map(s => [s, ""])),
  processEvidence: "",
  understanding: "",
  completionLevel: "",
  notes: "",
});

// ── Storage helpers ────────────────────────────────────────────────────────
const STORE_KEY = "risers-tracker-v2";
async function loadData() {
  try {
    const r = await window.storage.get(STORE_KEY);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}
async function saveData(data) {
  try { await window.storage.set(STORE_KEY, JSON.stringify(data)); } catch {}
}

// ── Bloom SVG (6-petal flower for 6 sections) ─────────────────────────────
function Bloom({ sections, size = 48 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.18, offset = size * 0.22;
  const angles = [270, 330, 30, 90, 150, 210];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {SECTIONS.map((s, i) => {
        const a = (angles[i] * Math.PI) / 180;
        const px = cx + offset * Math.cos(a);
        const py = cy + offset * Math.sin(a);
        const lv = sections[s] || "";
        const fill = LEVEL_META[lv].color;
        return (
          <ellipse
            key={s}
            cx={px} cy={py}
            rx={r} ry={r * 0.68}
            fill={fill}
            opacity={lv ? 0.92 : 0.3}
            transform={`rotate(${angles[i] + 90}, ${px}, ${py})`}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={size * 0.1} fill={T.forest} opacity={0.7} />
    </svg>
  );
}

// ── Level pill ─────────────────────────────────────────────────────────────
function LevelPill({ value, onChange, small }) {
  const levels = ["", "Emerging", "Developing", "Secure", "Exceeding"];
  return (
    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
      {levels.filter(l => l !== "").map(l => (
        <button
          key={l}
          onClick={() => onChange(value === l ? "" : l)}
          style={{
            padding: small ? "2px 8px" : "4px 10px",
            borderRadius: 20,
            border: `2px solid ${LEVEL_META[l].color}`,
            background: value === l ? LEVEL_META[l].color : "transparent",
            color: value === l ? "#fff" : LEVEL_META[l].color,
            fontSize: small ? 11 : 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            transition: "all 0.15s",
          }}
        >{l}</button>
      ))}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function RisersTracker() {
  const [tab, setTab] = useState("dashboard");
  const [kids, setKids] = useState(DEFAULT_KIDS);
  const [records, setRecords] = useState({}); // { kidName: [entry, ...] }
  const [editingKids, setEditingKids] = useState(false);
  const [tempKids, setTempKids] = useState([...DEFAULT_KIDS]);
  const [selectedKid, setSelectedKid] = useState(null);
  const [entryForm, setEntryForm] = useState(emptyEntry());
  const [editingEntry, setEditingEntry] = useState(null); // { kid, idx }
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dashFilter, setDashFilter] = useState("all"); // quest name or "all"

  // Load
  useEffect(() => {
    loadData().then(d => {
      if (d) {
        setKids(d.kids || DEFAULT_KIDS);
        setTempKids(d.kids || DEFAULT_KIDS);
        setRecords(d.records || {});
      }
      setLoaded(true);
    });
  }, []);

  // Save on change
  useEffect(() => {
    if (!loaded) return;
    saveData({ kids, records });
  }, [kids, records, loaded]);

  // All quest names for filter
  const allQuests = [...new Set(
    Object.values(records).flat().map(e => e.questName).filter(Boolean)
  )].sort();

  function flashSaved() { setSaved(true); setTimeout(() => setSaved(false), 1500); }

  function handleSaveEntry() {
    const kid = selectedKid;
    if (!kid) return;
    setRecords(prev => {
      const arr = [...(prev[kid] || [])];
      if (editingEntry && editingEntry.kid === kid) {
        arr[editingEntry.idx] = { ...entryForm };
      } else {
        arr.unshift({ ...entryForm });
      }
      return { ...prev, [kid]: arr };
    });
    setEntryForm(emptyEntry());
    setEditingEntry(null);
    flashSaved();
  }

  function handleEditEntry(kid, idx) {
    setSelectedKid(kid);
    setEntryForm({ ...records[kid][idx] });
    setEditingEntry({ kid, idx });
    setTab("entry");
    window.scrollTo(0, 0);
  }

  function handleDeleteEntry(kid, idx) {
    setRecords(prev => {
      const arr = [...(prev[kid] || [])];
      arr.splice(idx, 1);
      return { ...prev, [kid]: arr };
    });
  }

  function daysComplete(entry) {
    return [entry.day1Done, entry.day2Done, entry.day3Done].filter(Boolean).length;
  }

  function bloomScore(entry) {
    return SECTIONS.reduce((acc, s) => acc + (LEVEL_META[entry.sections[s] || ""].rank), 0);
  }

  function groupByQuest(kidRecords) {
    const g = {};
    (kidRecords || []).forEach(e => {
      const k = e.questName || "(unnamed quest)";
      if (!g[k]) g[k] = [];
      g[k].push(e);
    });
    return g;
  }

  // ── Styles ──────────────────────────────────────────────────────────────
  const st = {
    app: {
      minHeight: "100vh",
      background: T.parchment,
      fontFamily: "Inter, system-ui, sans-serif",
      color: T.ink,
    },
    header: {
      background: T.forest,
      padding: "16px 24px 0",
      position: "sticky", top: 0, zIndex: 100,
    },
    logo: {
      fontFamily: "'Fraunces', Georgia, serif",
      color: T.parchment,
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      margin: 0,
    },
    logoSub: {
      color: T.amber,
      fontFamily: "Inter, sans-serif",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
    },
    tabs: {
      display: "flex", gap: 0, marginTop: 12,
    },
    tab: (active) => ({
      padding: "8px 20px",
      background: active ? T.parchment : "transparent",
      color: active ? T.forest : T.mist,
      border: "none",
      borderRadius: "8px 8px 0 0",
      fontFamily: "Inter, sans-serif",
      fontWeight: active ? 700 : 500,
      fontSize: 13,
      cursor: "pointer",
      letterSpacing: "0.02em",
    }),
    body: { padding: "24px 20px", maxWidth: 960, margin: "0 auto" },
    card: {
      background: "#fff",
      borderRadius: 12,
      padding: "20px 24px",
      marginBottom: 16,
      boxShadow: "0 1px 4px rgba(27,46,36,0.08)",
    },
    sectionTitle: {
      fontFamily: "'Fraunces', Georgia, serif",
      fontSize: 18,
      fontWeight: 700,
      color: T.forest,
      marginBottom: 16,
    },
    label: {
      display: "block",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: T.ghost,
      marginBottom: 4,
    },
    input: {
      width: "100%",
      padding: "8px 12px",
      borderRadius: 8,
      border: `1.5px solid ${T.mist}`,
      fontFamily: "Inter, sans-serif",
      fontSize: 14,
      color: T.ink,
      background: T.parchment,
      boxSizing: "border-box",
      outline: "none",
    },
    textarea: {
      width: "100%",
      padding: "8px 12px",
      borderRadius: 8,
      border: `1.5px solid ${T.mist}`,
      fontFamily: "Inter, sans-serif",
      fontSize: 13,
      color: T.ink,
      background: T.parchment,
      boxSizing: "border-box",
      outline: "none",
      resize: "vertical",
      minHeight: 72,
    },
    btn: (variant = "primary") => ({
      padding: "9px 20px",
      borderRadius: 8,
      border: "none",
      fontFamily: "Inter, sans-serif",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
      background: variant === "primary" ? T.forest : variant === "danger" ? T.danger : T.mist,
      color: variant === "ghost" ? T.ink : "#fff",
    }),
    dayBadge: (done) => ({
      width: 32, height: 32,
      borderRadius: "50%",
      border: `2px solid ${done ? T.moss : T.mist}`,
      background: done ? T.moss : "transparent",
      color: done ? "#fff" : T.ghost,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, cursor: "pointer",
    }),
  };

  // ── DASHBOARD ──────────────────────────────────────────────────────────
  const DashboardTab = () => {
    const filteredRecords = (kid) => {
      const all = records[kid] || [];
      return dashFilter === "all" ? all : all.filter(e => e.questName === dashFilter);
    };

    const totalEntries = Object.values(records).flat().length;
    const totalCompleted = Object.values(records).flat().filter(e => e.day1Done && e.day2Done && e.day3Done).length;

    // Section averages across all kids & filtered quest
    const sectionAvgs = SECTIONS.map(s => {
      const vals = Object.keys(records).flatMap(kid => filteredRecords(kid).map(e => LEVEL_META[e.sections[s] || ""].rank)).filter(r => r > 0);
      const avg = vals.length ? vals.reduce((a,b) => a+b,0)/vals.length : 0;
      return { section: s, avg };
    });

    return (
      <div>
        {/* Summary strip */}
        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          {[
            { label:"Risers", value: kids.length },
            { label:"Quest Entries", value: totalEntries },
            { label:"Fully Complete", value: totalCompleted },
            { label:"Quest Filter", value:
              <select
                value={dashFilter}
                onChange={e => setDashFilter(e.target.value)}
                style={{ ...st.input, width:"auto", padding:"4px 8px", fontSize:12 }}
              >
                <option value="all">All quests</option>
                {allQuests.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            }
          ].map(({ label, value }) => (
            <div key={label} style={{ ...st.card, padding:"14px 20px", marginBottom:0, flex:1, minWidth:120 }}>
              <div style={{ ...st.label, marginBottom:4 }}>{label}</div>
              <div style={{ fontSize: typeof value === "number" ? 28 : 14, fontWeight:700, fontFamily:"'Fraunces',serif", color:T.forest }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Section averages bar */}
        <div style={{ ...st.card, marginBottom:20 }}>
          <div style={st.sectionTitle}>Section Performance — Group Average</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {sectionAvgs.map(({ section, avg }) => (
              <div key={section} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:180, fontSize:12, fontWeight:600, color:T.ink, flexShrink:0 }}>{section}</div>
                <div style={{ flex:1, height:14, background:T.mist, borderRadius:7, overflow:"hidden" }}>
                  <div style={{
                    height:"100%", borderRadius:7,
                    width: `${(avg/4)*100}%`,
                    background: avg >= 3.5 ? T.moss : avg >= 2.5 ? T.sky : avg >= 1.5 ? T.amber : T.danger,
                    transition: "width 0.4s ease",
                  }} />
                </div>
                <div style={{ width:60, fontSize:11, color:T.ghost, fontWeight:600 }}>
                  {avg ? ["","Emerging","Developing","Secure","Exceeding"][Math.round(avg)] : "No data"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kid grid */}
        <div style={{ ...st.sectionTitle }}>All Risers</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:14 }}>
          {kids.map(kid => {
            const entries = filteredRecords(kid);
            const latest = entries[0];
            return (
              <div key={kid} style={{ ...st.card, marginBottom:0, cursor:"pointer", transition:"box-shadow 0.15s" }}
                onClick={() => { setSelectedKid(kid); setTab("kid"); }}
                onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 16px rgba(27,46,36,0.14)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(27,46,36,0.08)"}
              >
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:700, color:T.forest }}>{kid}</div>
                    <div style={{ fontSize:11, color:T.ghost, marginTop:2 }}>{entries.length} quest{entries.length !== 1 ? "s" : ""} logged</div>
                    {latest && <div style={{ fontSize:11, color:T.amber, marginTop:2, fontWeight:600 }}>Latest: {latest.questName || "(unnamed)"}</div>}
                  </div>
                  {latest
                    ? <Bloom sections={latest.sections} size={52} />
                    : <div style={{ width:52, height:52, borderRadius:"50%", background:T.mist, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🌱</div>
                  }
                </div>
                {latest && (
                  <div style={{ display:"flex", gap:6, marginTop:10 }}>
                    {[1,2,3].map(d => (
                      <div key={d} style={st.dayBadge(latest[`day${d}Done`])}>D{d}</div>
                    ))}
                    <div style={{ marginLeft:"auto", fontSize:11, color:T.ghost, alignSelf:"center" }}>
                      {latest.completionLevel}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── ENTRY TAB ──────────────────────────────────────────────────────────
  const EntryTab = () => {
    const f = entryForm;
    const set = (k, v) => setEntryForm(prev => ({ ...prev, [k]: v }));
    const setSection = (s, v) => setEntryForm(prev => ({ ...prev, sections: { ...prev.sections, [s]: v } }));

    return (
      <div>
        <div style={st.card}>
          <div style={st.sectionTitle}>{editingEntry ? "Edit Quest Entry" : "Log a Quest Entry"}</div>

          {/* Kid selector */}
          <div style={{ marginBottom:16 }}>
            <label style={st.label}>Riser</label>
            <select
              value={selectedKid || ""}
              onChange={e => { setSelectedKid(e.target.value); setEditingEntry(null); }}
              style={st.input}
            >
              <option value="">— Select a Riser —</option>
              {kids.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <label style={st.label}>Quest Name</label>
              <input style={st.input} value={f.questName} onChange={e => set("questName", e.target.value)} placeholder="e.g. Water Cycle Quest" />
            </div>
            <div>
              <label style={st.label}>Week</label>
              <input style={st.input} value={f.week} onChange={e => set("week", e.target.value)} placeholder="e.g. Week 3" />
            </div>
          </div>

          {/* Day completion */}
          <div style={{ marginBottom:20 }}>
            <label style={st.label}>Days Completed</label>
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              {[1,2,3].map(d => (
                <div key={d}
                  style={st.dayBadge(f[`day${d}Done`])}
                  onClick={() => set(`day${d}Done`, !f[`day${d}Done`])}
                >D{d}</div>
              ))}
              <span style={{ alignSelf:"center", fontSize:12, color:T.ghost, marginLeft:8 }}>
                {[f.day1Done,f.day2Done,f.day3Done].filter(Boolean).length}/3 days done
              </span>
            </div>
          </div>

          {/* Sections */}
          <div style={{ marginBottom:20 }}>
            <label style={{ ...st.label, marginBottom:12 }}>Section Levels</label>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {SECTIONS.map((s, i) => (
                <div key={s}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:5 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:T.amber, marginRight:6, letterSpacing:"0.08em" }}>{SECTION_SHORT[i]}</span>
                    {s}
                  </div>
                  <LevelPill value={f.sections[s] || ""} onChange={v => setSection(s, v)} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <label style={st.label}>Process Evidence</label>
              <textarea style={st.textarea} value={f.processEvidence} onChange={e => set("processEvidence", e.target.value)} placeholder="Notes on evidence of process..." />
            </div>
            <div>
              <label style={st.label}>Understanding Evaluation</label>
              <textarea style={st.textarea} value={f.understanding} onChange={e => set("understanding", e.target.value)} placeholder="Notes on depth of understanding..." />
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={st.label}>Overall Completion Level</label>
            <LevelPill value={f.completionLevel} onChange={v => set("completionLevel", v)} />
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={st.label}>Additional Notes</label>
            <textarea style={st.textarea} value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Any other observations..." />
          </div>

          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <button style={st.btn("primary")} onClick={handleSaveEntry} disabled={!selectedKid}>
              {editingEntry ? "Save Changes" : "Log Entry"}
            </button>
            {editingEntry && (
              <button style={st.btn("ghost")} onClick={() => { setEditingEntry(null); setEntryForm(emptyEntry()); }}>
                Cancel
              </button>
            )}
            {saved && <span style={{ fontSize:12, color:T.moss, fontWeight:700 }}>✓ Saved</span>}
          </div>
        </div>
      </div>
    );
  };

  // ── KID DETAIL ─────────────────────────────────────────────────────────
  const KidTab = () => {
    const kid = selectedKid;
    if (!kid) return (
      <div style={st.card}>
        <div style={{ textAlign:"center", color:T.ghost, padding:32 }}>
          Select a Riser from the dashboard to view their record.
        </div>
      </div>
    );

    const kidRecords = records[kid] || [];
    const questGroups = groupByQuest(kidRecords);

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
          <button style={{ ...st.btn("ghost"), padding:"6px 14px" }} onClick={() => setTab("dashboard")}>← Back</button>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:700, color:T.forest }}>{kid}</div>
          <button style={{ ...st.btn("primary"), marginLeft:"auto", padding:"7px 16px" }}
            onClick={() => { setEntryForm(emptyEntry()); setEditingEntry(null); setTab("entry"); }}>
            + New Entry
          </button>
        </div>

        {kidRecords.length === 0 ? (
          <div style={{ ...st.card, textAlign:"center", color:T.ghost, padding:40 }}>
            No entries yet for {kid}.<br />
            <span style={{ fontSize:13 }}>Log their first quest to see the bloom.</span>
          </div>
        ) : (
          Object.entries(questGroups).map(([questName, entries]) => (
            <div key={questName} style={{ marginBottom:24 }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:700, color:T.amber, marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:18 }}>🗺</span> {questName}
              </div>
              {entries.map((entry, rawIdx) => {
                const idx = kidRecords.indexOf(entry);
                return (
                  <div key={idx} style={{ ...st.card, marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:T.ghost }}>{entry.week || "Week —"}</span>
                          {[1,2,3].map(d => (
                            <div key={d} style={{ ...st.dayBadge(entry[`day${d}Done`]), width:24, height:24, fontSize:10 }}>D{d}</div>
                          ))}
                          {entry.completionLevel && (
                            <span style={{
                              padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                              background: LEVEL_META[entry.completionLevel]?.color || T.mist,
                              color:"#fff",
                            }}>{entry.completionLevel}</span>
                          )}
                        </div>

                        {/* Section pills */}
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                          {SECTIONS.map((s, i) => {
                            const lv = entry.sections[s] || "";
                            return lv ? (
                              <span key={s} style={{
                                padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700,
                                background: LEVEL_META[lv].color + "22",
                                color: LEVEL_META[lv].color,
                                border: `1.5px solid ${LEVEL_META[lv].color}`,
                              }}>{SECTION_SHORT[i]}: {lv}</span>
                            ) : null;
                          })}
                        </div>

                        {entry.processEvidence && (
                          <div style={{ marginBottom:6 }}>
                            <span style={{ fontSize:10, fontWeight:700, color:T.ghost, textTransform:"uppercase", letterSpacing:"0.08em" }}>Evidence: </span>
                            <span style={{ fontSize:12, color:T.ink }}>{entry.processEvidence}</span>
                          </div>
                        )}
                        {entry.understanding && (
                          <div style={{ marginBottom:6 }}>
                            <span style={{ fontSize:10, fontWeight:700, color:T.ghost, textTransform:"uppercase", letterSpacing:"0.08em" }}>Understanding: </span>
                            <span style={{ fontSize:12, color:T.ink }}>{entry.understanding}</span>
                          </div>
                        )}
                        {entry.notes && (
                          <div style={{ fontSize:12, color:T.ghost, fontStyle:"italic" }}>{entry.notes}</div>
                        )}
                      </div>

                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                        <Bloom sections={entry.sections} size={56} />
                        <div style={{ display:"flex", gap:6 }}>
                          <button style={{ ...st.btn("ghost"), padding:"4px 10px", fontSize:11 }} onClick={() => handleEditEntry(kid, idx)}>Edit</button>
                          <button style={{ ...st.btn("danger"), padding:"4px 10px", fontSize:11 }} onClick={() => handleDeleteEntry(kid, idx)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    );
  };

  // ── KIDS SETTINGS ──────────────────────────────────────────────────────
  const KidsSettingsTab = () => (
    <div style={st.card}>
      <div style={st.sectionTitle}>Manage Riser Names</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10, marginBottom:16 }}>
        {tempKids.map((k, i) => (
          <input
            key={i}
            style={st.input}
            value={k}
            onChange={e => {
              const next = [...tempKids];
              next[i] = e.target.value;
              setTempKids(next);
            }}
          />
        ))}
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button style={st.btn("primary")} onClick={() => {
          setKids([...tempKids]);
          flashSaved();
        }}>Save Names</button>
        {saved && <span style={{ fontSize:12, color:T.moss, fontWeight:700, alignSelf:"center" }}>✓ Saved</span>}
      </div>
      <p style={{ fontSize:12, color:T.ghost, marginTop:12 }}>
        Edit any of the 12 Riser names above. Existing records linked to old names are kept as-is.
      </p>
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────
  if (!loaded) return <div style={{ ...st.app, display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
    <div style={{ fontFamily:"'Fraunces',serif", color:T.forest, fontSize:20 }}>Loading Risers…</div>
  </div>;

  return (
    <div style={st.app}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={st.header}>
        <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
          <h1 style={st.logo}>Risers</h1>
          <span style={st.logoSub}>Quest Tracker · Children-Quests</span>
        </div>
        <div style={st.tabs}>
          {[
            { id:"dashboard", label:"Dashboard" },
            { id:"entry",     label:"Log Entry" },
            { id:"kid",       label: selectedKid ? `${selectedKid.split(" ")[0]}…` : "Kid Detail" },
            { id:"settings",  label:"Risers" },
          ].map(({ id, label }) => (
            <button key={id} style={st.tab(tab === id)} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={st.body}>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "entry"     && <EntryTab />}
        {tab === "kid"       && <KidTab />}
        {tab === "settings"  && <KidsSettingsTab />}
      </div>
    </div>
  );
}
