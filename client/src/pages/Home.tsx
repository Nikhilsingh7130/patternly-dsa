import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Circle,
  Code2,
  Filter,
  Flame,
  LayoutDashboard,
  ListFilter,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
  LogIn,
  LogOut,
  Moon,
  Sun,
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const statusOptions = ["all", "Not started", "In progress", "Solved"] as const;
const difficultyOptions = ["all", "Easy", "Medium", "Hard"] as const;
type Status = (typeof statusOptions)[number];
type Difficulty = (typeof difficultyOptions)[number];

type AddForm = {
  title: string;
  leetcodeNumber: string;
  section: string;
  pattern: string;
  difficulty: "Easy" | "Medium" | "Hard";
  url: string;
  notes: string;
};

const emptyForm: AddForm = {
  title: "",
  leetcodeNumber: "",
  section: "My additions",
  pattern: "Custom practice",
  difficulty: "Medium",
  url: "",
  notes: "",
};

function statusMeta(status: string) {
  if (status === "Solved") return { label: "Solved", className: "status-solved", icon: Check };
  if (status === "In progress") return { label: "In progress", className: "status-progress", icon: Flame };
  return { label: "Not started", className: "status-idle", icon: Circle };
}

function difficultyMeta(difficulty: string) {
  if (difficulty === "Easy") return "difficulty-easy";
  if (difficulty === "Hard") return "difficulty-hard";
  return "difficulty-medium";
}

export default function Home() {
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("patternly-theme") === "dark");
  const [search, setSearch] = useState("");
  const [sheetFilter, setSheetFilter] = useState<string | null>(null);
  const [section, setSection] = useState("all");
  const [pattern, setPattern] = useState("all");
  const [status, setStatus] = useState<Status>("all");
  const [difficulty, setDifficulty] = useState<Difficulty>("all");
  const [visibleLimit, setVisibleLimit] = useState(24);
  const [hasMore, setHasMore] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadPending, setUploadPending] = useState(false);
  const [customSheets, setCustomSheets] = useState<Array<{ id: number; name: string; questionCount: number }>>([]);
  const [form, setForm] = useState<AddForm>(emptyForm);
  const [questions, setQuestions] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, solved: 0, inProgress: 0, notStarted: 0, easy: 0, medium: 0, hard: 0, sections: 0 });
  const [filters, setFilters] = useState({ sections: [] as string[], patterns: [] as string[] });
  const [loading, setLoading] = useState(true);
  const [mutationPending, setMutationPending] = useState(false);
  const [addError, setAddError] = useState(false);
  const [notesOpenId, setNotesOpenId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  useEffect(() => { document.body.classList.toggle("dark-theme", darkMode); localStorage.setItem("patternly-theme", darkMode ? "dark" : "light"); }, [darkMode]);
  const loadCatalog = async (page = 1, append = false, showLoading = true) => {
    if (showLoading) setLoading(true);
    try { const params = new URLSearchParams({ page: String(page), limit: "24", search, section, pattern, difficulty, status }); if (sheetFilter) params.set("sheet", sheetFilter); const response = await fetch(`/api/bootstrap?${params.toString()}`, { credentials: "include" }); if (response.status === 401) { setQuestions([]); setStats({ total: 0, solved: 0, inProgress: 0, notStarted: 0, easy: 0, medium: 0, hard: 0, sections: 0 }); return; } if (!response.ok) throw new Error("Catalog request failed"); const data = await response.json(); setUser(data.user); setQuestions((current) => append ? [...current, ...(data.questions ?? [])] : (data.questions ?? [])); setCustomSheets(data.customSheets ?? []); setStats(data.stats ?? stats); setFilters(data.filters ?? filters); setHasMore(Boolean(data.hasMore)); } finally { if (showLoading) setLoading(false); }
  };
  useEffect(() => { void fetch("/api/auth/me", { credentials: "include" }).then((r) => r.json()).then((data) => { setUser(data.user ?? null); if (data.user) void loadCatalog(); else setLoading(false); }); }, []);
  const activeQuestions = questions;
  const activeStats = stats;
  const activeFilters = filters;
  const filteredQuestions = questions;
  const visibleQuestions = questions;
  const completion = activeStats.total ? Math.round((activeStats.solved / activeStats.total) * 100) : 0;
  const activeFilterCount = [section !== "all", pattern !== "all", difficulty !== "all", status !== "all"].filter(Boolean).length;
  const activeSheetName = sheetFilter ?? "Thita patterns sheet";
  const selectSheet = (name: string | null) => { setSheetFilter(name); setSearch(""); setSection("all"); setPattern("all"); setDifficulty("all"); setStatus("all"); setVisibleLimit(24); };
  useEffect(() => { if (user) void loadCatalog(1, false); }, [user?.id, sheetFilter, search, section, pattern, difficulty, status]);
  const handleStatusChange = async (id: number, next: string) => { if (!user) { setAuthOpen(true); return; } const previous = questions.find((question) => question.id === id)?.status; if (!previous || previous === next) return; setQuestions((current) => current.map((question) => question.id === id ? { ...question, status: next } : question)); setStats((current) => ({ ...current, solved: current.solved + (next === "Solved" ? 1 : 0) - (previous === "Solved" ? 1 : 0), inProgress: current.inProgress + (next === "In progress" ? 1 : 0) - (previous === "In progress" ? 1 : 0), notStarted: current.notStarted + (next === "Not started" ? 1 : 0) - (previous === "Not started" ? 1 : 0) })); setMutationPending(true); try { const response = await fetch(`/api/questions/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) }); if (!response.ok) throw new Error("Could not update status"); void loadCatalog(1, false, false); } catch { setQuestions((current) => current.map((question) => question.id === id ? { ...question, status: previous } : question)); void loadCatalog(1, false, false); } finally { setMutationPending(false); } };
  const handleAdd = async (event: React.FormEvent) => { event.preventDefault(); if (!user) { setAuthOpen(true); return; } setMutationPending(true); setAddError(false); try { const response = await fetch("/api/questions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, leetcodeNumber: form.leetcodeNumber ? Number(form.leetcodeNumber) : undefined }) }); if (!response.ok) throw new Error("Could not add question"); setForm(emptyForm); setIsAddOpen(false); setVisibleLimit(24); await loadCatalog(); } catch { setAddError(true); } finally { setMutationPending(false); } };
  const handleRemove = async (id: number) => { setMutationPending(true); try { await fetch(`/api/questions/${id}`, { method: "DELETE", credentials: "include" }); await loadCatalog(); } finally { setMutationPending(false); } };
  const openNotes = (question: any) => { if (!user) { setAuthOpen(true); return; } setNotesOpenId(notesOpenId === question.id ? null : question.id); setNotesDraft(question.notes ?? ""); };
  const saveNotes = async (id: number) => { setNotesSaving(true); try { await fetch(`/api/questions/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: notesDraft }) }); await loadCatalog(); } finally { setNotesSaving(false); } };
  const handleAuth = async (event: React.FormEvent) => { event.preventDefault(); setAuthError(""); const response = await fetch(`/api/auth/${authMode}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(authForm) }); const data = await response.json(); if (!response.ok) { setAuthError(data.error || "Authentication failed"); return; } setUser(data.user); setAuthOpen(false); setAuthForm({ name: "", email: "", password: "" }); await loadCatalog(); };
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); setUser(null); setQuestions([]); setStats({ total: 0, solved: 0, inProgress: 0, notStarted: 0, easy: 0, medium: 0, hard: 0, sections: 0 }); };
  const updateForm = (key: keyof AddForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const handleUpload = async (event: React.FormEvent) => { event.preventDefault(); if (!uploadFile || !uploadName.trim()) { setUploadError("Choose a CSV file and give it a name."); return; } setUploadPending(true); setUploadError(""); try { const csv = await uploadFile.text(); const response = await fetch("/api/sheets/import", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: uploadName, csv }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Import failed"); setUploadOpen(false); setUploadName(""); setUploadFile(null); await loadCatalog(); } catch (error) { setUploadError(error instanceof Error ? error.message : "Could not import this sheet."); } finally { setUploadPending(false); } };
  const renameSheet = async (sheet: { id: number; name: string }) => { const name = window.prompt("New sheet name", sheet.name)?.trim(); if (!name || name === sheet.name) return; await fetch(`/api/sheets/${sheet.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); if (sheetFilter === sheet.name) setSheetFilter(name); await loadCatalog(); };
  const deleteSheet = async (sheet: { id: number; name: string }) => { if (!window.confirm(`Delete “${sheet.name}” and all its questions? This cannot be undone.`)) return; await fetch(`/api/sheets/${sheet.id}`, { method: "DELETE", credentials: "include" }); if (sheetFilter === sheet.name) selectSheet(null); else await loadCatalog(); };
  return (
    <div className="app-shell min-h-screen">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark"><Code2 size={19} strokeWidth={2.6} /></div>
          <div>
            <p className="brand-name">pattern<span>ly</span></p>
            <p className="brand-caption">DSA practice studio</p>
          </div>
        </div>

        <div className="side-section-label">Workspace</div>
        <nav className="side-nav" aria-label="Primary">
          <a className="side-nav-item active" href="#overview"><LayoutDashboard size={17} /><span>Overview</span></a>
          <a className="side-nav-item" href="#question-bank"><BookOpen size={17} /><span>Question bank</span><span className="nav-count">{activeStats.total || "—"}</span></a>
          <a className="side-nav-item" href="#focus"><Target size={17} /><span>Focus patterns</span></a>
        </nav>

        <div className="side-section-label">Source</div>
        <button className={`source-card ${!sheetFilter ? "active" : ""}`} onClick={() => selectSheet(null)}>
          <div className="source-icon"><Sparkles size={16} /></div>
          <div><p>Thita patterns sheet</p><span>{user ? "Shared starter catalog" : "Sign in to save progress"}</span></div>
          <a href="https://docs.google.com/spreadsheets/d/1EEYzyD_483B-7CmWxsJB_zycdv4Y5dxnzcoEQtaIfuk/edit?gid=329533698#gid=329533698" target="_blank" rel="noreferrer" aria-label="Open source sheet"><ArrowUpRight size={15} /></a>
        </button>
        {customSheets.map((sheet) => <div className={`custom-sheet-card-row ${sheetFilter === sheet.name ? "active" : ""}`} key={sheet.id}><button className="custom-sheet-card" onClick={() => selectSheet(sheet.name)}><FileSpreadsheet size={15} /><span><strong>{sheet.name}</strong><small>{sheet.questionCount} questions · private</small></span></button><div className="sheet-actions"><button onClick={() => void renameSheet(sheet)} aria-label={`Rename ${sheet.name}`} title="Rename sheet"><Pencil size={12} /></button><a href={`/api/sheets/${sheet.id}/export`} aria-label={`Export ${sheet.name}`} title="Export CSV"><Download size={12} /></a><button onClick={() => void deleteSheet(sheet)} aria-label={`Delete ${sheet.name}`} title="Delete sheet"><Trash2 size={12} /></button></div></div>)}
        <button className="upload-sheet-button" onClick={() => user ? setUploadOpen(true) : setAuthOpen(true)}><Upload size={14} /> Upload custom CSV</button>

        <div className="sidebar-spacer" />
        <div className="tip-card">
          <p className="tip-label">Small steps compound</p>
          <p className="tip-copy">Move one question forward today. Your future self will thank you.</p>
          <div className="tip-line"><span style={{ width: `${Math.max(8, completion)}%` }} /></div>
        </div>
        <div className="profile-row">
          <div className="avatar">G</div>
          <div className="profile-copy"><strong>Guest learner</strong><span>Cloudflare workspace</span></div>
          
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark"><Code2 size={18} /></div><span>patternly</span></div>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-actions"><span className="sync-dot" /><span className="sync-label">{user ? `Signed in as ${user.name}` : "Private practice mode"}</span><button className="icon-button" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</button>{user ? <button className="account-button" onClick={() => void logout()}><LogOut size={14} /> Sign out</button> : <button className="account-button" onClick={() => setAuthOpen(true)}><LogIn size={14} /> Sign in</button>}</div>
        </header>

        <div className="page-wrap">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">SATURDAY, SEPTEMBER 12 <span>•</span> WEEK 04</p>
              <h1>Build your <em>pattern</em><br className="desktop-break" /> memory.</h1>
              <p className="hero-copy">A calm, focused space for turning DSA patterns into instinct.</p>
            </div>
            <Button className="add-question-button" onClick={() => user ? setIsAddOpen(true) : setAuthOpen(true)}><Plus size={17} /> Add question</Button>
          </section>

          <section className="stat-grid" aria-label="Progress overview">
            <div className="stat-card primary-stat"><div className="stat-card-top"><span className="stat-label">Total questions</span><div className="stat-icon mint"><BookOpen size={16} /></div></div><strong>{activeStats.total.toLocaleString()}</strong><span className="stat-foot">Across {activeStats.sections} learning sections</span></div>
            <div className="stat-card"><div className="stat-card-top"><span className="stat-label">Solved</span><div className="stat-icon peach"><Check size={16} /></div></div><strong>{activeStats.solved}</strong><span className="stat-foot"><b className="positive">{completion}%</b> of this sheet</span></div>
            <div className="stat-card"><div className="stat-card-top"><span className="stat-label">In progress</span><div className="stat-icon yellow"><Flame size={16} /></div></div><strong>{activeStats.inProgress}</strong><span className="stat-foot">Keep the momentum going</span></div>
            <div className="stat-card"><div className="stat-card-top"><span className="stat-label">Not started</span><div className="stat-icon lilac"><Target size={16} /></div></div><strong>{activeStats.notStarted}</strong><span className="stat-foot">Ready when you are</span></div>
          </section>

          <section className="insight-grid" id="focus">
            <div className="progress-panel panel-card">
              <div className="panel-heading"><div><p className="panel-kicker">Your momentum</p><h2>Completion arc</h2></div><span className="mini-period">All time <ChevronDown size={13} /></span></div>
              <div className="arc-layout"><div className="completion-ring" style={{ background: `conic-gradient(#ef7c5f ${completion * 3.6}deg, #e7ebe4 0deg)` }}><div><strong>{completion}%</strong><span>complete</span></div></div><div className="progress-breakdown"><div><span className="legend-dot solved-dot" /><span>Solved</span><strong>{activeStats.solved}</strong></div><div><span className="legend-dot progress-dot" /><span>In progress</span><strong>{activeStats.inProgress}</strong></div><div><span className="legend-dot idle-dot" /><span>Not started</span><strong>{activeStats.notStarted}</strong></div></div></div>
            </div>
            <div className="focus-panel panel-card">
              <div className="panel-heading"><div><p className="panel-kicker">Difficulty mix</p><h2>Know your terrain</h2></div><ListFilter size={17} className="muted-icon" /></div>
              <div className="difficulty-bars"><div className="bar-row"><div><span>Easy</span><strong>{activeStats.easy}</strong></div><div className="bar-track"><span className="bar-easy" style={{ width: `${activeStats.total ? (activeStats.easy / activeStats.total) * 100 : 0}%` }} /></div></div><div className="bar-row"><div><span>Medium</span><strong>{activeStats.medium}</strong></div><div className="bar-track"><span className="bar-medium" style={{ width: `${activeStats.total ? (activeStats.medium / activeStats.total) * 100 : 0}%` }} /></div></div><div className="bar-row"><div><span>Hard</span><strong>{activeStats.hard}</strong></div><div className="bar-track"><span className="bar-hard" style={{ width: `${activeStats.total ? (activeStats.hard / activeStats.total) * 100 : 0}%` }} /></div></div></div>
              <p className="focus-note"><Flame size={14} /> A little consistency beats a perfect plan.</p>
            </div>
          </section>

          <section className="question-section" id="question-bank">
            <div className="section-heading"><div><p className="panel-kicker">Active sheet</p><h2>{activeSheetName} <span>{loading ? "…" : filteredQuestions.length}</span></h2></div><div className="section-heading-note"><span className="green-dot" /> Only this sheet is shown</div></div>
            <div className="filter-toolbar">
              <div className="search-wrap"><Search size={16} /><Input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleLimit(24); }} placeholder="Search questions or patterns..." aria-label="Search questions" /></div>
              <Filter size={16} className="toolbar-filter-icon" />
              <select value={section} onChange={(event) => { setSection(event.target.value); setPattern("all"); setVisibleLimit(24); }} aria-label="Filter by section"><option value="all">All sections</option>{activeFilters.sections.map((item) => <option key={item} value={item}>{item.replace(/^\w+\.\s*/, "")}</option>)}</select>
              <select value={pattern} onChange={(event) => { setPattern(event.target.value); setVisibleLimit(24); }} aria-label="Filter by pattern"><option value="all">All patterns</option>{activeFilters.patterns.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select value={difficulty} onChange={(event) => { setDifficulty(event.target.value as Difficulty); setVisibleLimit(24); }} aria-label="Filter by difficulty">{difficultyOptions.map((item) => <option key={item} value={item}>{item === "all" ? "Any difficulty" : item}</option>)}</select>
              <select value={status} onChange={(event) => { setStatus(event.target.value as Status); setVisibleLimit(24); }} aria-label="Filter by status">{statusOptions.map((item) => <option key={item} value={item}>{item === "all" ? "Any status" : item}</option>)}</select>
              {activeFilterCount > 0 && <button className="clear-filter" onClick={() => { setSection("all"); setPattern("all"); setDifficulty("all"); setStatus("all"); }}>Clear {activeFilterCount}<X size={13} /></button>}
            </div>

            <div className="question-list">
              {loading && <div className="loading-state"><Loader2 className="spin" size={22} /><span>Loading your patterns...</span></div>}
              {!loading && visibleQuestions.length === 0 && <div className="empty-state"><div className="empty-icon"><Search size={20} /></div><h3>No questions match that view</h3><p>Try clearing a filter or add a custom question to your library.</p><Button variant="outline" onClick={() => setIsAddOpen(true)}><Plus size={15} /> Add question</Button></div>}
              {visibleQuestions.map((question, index) => {
                const meta = statusMeta(question.status);
                const StatusIcon = meta.icon;
                return <article className="question-row" key={question.id} style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}>
                  <div className="question-index">{String(question.leetcodeNumber ?? "—").padStart(3, "0")}</div>
                  <div className="question-main"><div className="question-title-line"><h3>{question.title}</h3>{question.url && <a href={question.url} target="_blank" rel="noreferrer" aria-label={`Open ${question.title} on LeetCode`}><ArrowUpRight size={14} /></a>}</div><div className="question-meta"><span>{question.section.replace(/^\w+\.\s*/, "")}</span><span className="meta-separator">/</span><span>{question.pattern.replace(/^Pattern \d+:\s*/, "")}</span>{question.source === "Manual" && <span className="manual-tag">Added by you</span>}</div></div>
                  <span className={`difficulty-pill ${difficultyMeta(question.difficulty)}`}>{question.difficulty}</span>
                  <label className={`status-select-wrap ${meta.className}`} title="Update question status"><StatusIcon size={14} /><select className="status-select" value={question.status} onChange={(event) => void handleStatusChange(question.id, event.target.value)} disabled={mutationPending} aria-label={`Status for ${question.title}`}><option value="Not started">Not started</option><option value="In progress">In progress</option><option value="Solved">Solved</option></select></label><button className={`note-button ${question.notes ? "has-note" : ""}`} onClick={() => openNotes(question)} aria-label={`Notes for ${question.title}`} title={question.notes ? "Edit notes" : "Add notes"}><FileText size={14} /></button>
                  {question.source === "Manual" && <button className="delete-button" onClick={() => void handleRemove(question.id)} disabled={mutationPending} aria-label={`Delete ${question.title}`}><Trash2 size={15} /></button>}
                  {notesOpenId === question.id && <div className="question-notes-editor"><textarea value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} placeholder="Add your approach, edge cases, or revision notes…" maxLength={5000} rows={3} /><div><span>{notesDraft.length}/5000</span><button onClick={() => void saveNotes(question.id)} disabled={notesSaving}>{notesSaving ? "Saving…" : "Save notes"}</button></div></div>}
                </article>;
              })}
            </div>
            {!loading && hasMore && <button className="load-more" onClick={() => void loadCatalog(Math.floor(questions.length / 24) + 1, true)}>Load 24 more questions <ChevronDown size={15} /></button>}
          </section>

          <footer className="page-footer"><span>Patternly · Built for deliberate practice</span><span><a href="https://thita.ai/dsa-patterns-sheet" target="_blank" rel="noreferrer">View original sheet <ArrowUpRight size={13} /></a></span></footer>
        </div>
      </main>

      {isAddOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAddOpen(false); }}><div className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-title"><div className="modal-header"><div><p className="panel-kicker">Expand your library</p><h2 id="add-title">Add a question</h2></div><button className="modal-close" onClick={() => setIsAddOpen(false)} aria-label="Close"><X size={18} /></button></div><form onSubmit={handleAdd}><div className="form-grid"><label>Question title<Input required value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="e.g. Longest Increasing Subsequence" /></label><label>LeetCode #<Input type="number" min="1" value={form.leetcodeNumber} onChange={(event) => updateForm("leetcodeNumber", event.target.value)} placeholder="Optional" /></label></div><div className="form-grid"><label>Section<Input required value={form.section} onChange={(event) => updateForm("section", event.target.value)} placeholder="e.g. Dynamic Programming" /></label><label>Pattern<Input required value={form.pattern} onChange={(event) => updateForm("pattern", event.target.value)} placeholder="e.g. 1D DP" /></label></div><div className="form-grid"><label>Difficulty<select value={form.difficulty} onChange={(event) => updateForm("difficulty", event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label>Problem URL<Input type="url" value={form.url} onChange={(event) => updateForm("url", event.target.value)} placeholder="https://leetcode.com/problems/..." /></label></div><label>Notes <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="What do you want to remember about this problem?" rows={3} /></label>{addError && <p className="form-error">Could not add this question. Please check the fields and try again.</p>}<div className="modal-actions"><Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button type="submit" className="add-question-button" disabled={mutationPending}>{mutationPending ? <Loader2 className="spin" size={15} /> : <Plus size={15} />} Add to library</Button></div></form></div></div>}
      {uploadOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setUploadOpen(false); }}><div className="auth-modal upload-modal" role="dialog" aria-modal="true"><div className="modal-header"><div><p className="panel-kicker">Make it yours</p><h2>Upload a question sheet</h2></div><button className="modal-close" onClick={() => setUploadOpen(false)} aria-label="Close"><X size={18} /></button></div><form onSubmit={handleUpload}><p className="upload-help">Upload a CSV with a <strong>Title</strong> or <strong>Question</strong> column. Optional columns: LeetCode, Section, Pattern, Difficulty, URL, and Notes.</p><label>Sheet name<Input required value={uploadName} onChange={(event) => setUploadName(event.target.value)} placeholder="My interview prep" /></label><label className="file-picker">CSV file<input required type="file" accept=".csv,text/csv" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} /><span>{uploadFile ? uploadFile.name : "Choose a CSV file"}</span></label>{uploadError && <p className="form-error">{uploadError}</p>}<div className="modal-actions"><Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button><Button type="submit" className="add-question-button" disabled={uploadPending}>{uploadPending ? <Loader2 className="spin" size={15} /> : <Upload size={15} />} Import sheet</Button></div></form></div></div>}
      {authOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}><div className="auth-modal" role="dialog" aria-modal="true"><div className="modal-header"><div><p className="panel-kicker">Your private workspace</p><h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2></div><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={18} /></button></div><form onSubmit={handleAuth}>{authMode === "register" && <label>Your name<Input required value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} placeholder="Alex Johnson" /></label>}<label>Email<Input required type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="you@example.com" /></label><label>Password<Input required minLength={8} type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="At least 8 characters" /></label>{authError && <p className="form-error">{authError}</p>}<div className="modal-actions"><Button type="button" variant="outline" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "Create account" : "I already have an account"}</Button><Button type="submit" className="add-question-button">{authMode === "login" ? "Sign in" : "Register"}</Button></div></form></div></div>}
    </div>
  );
}
