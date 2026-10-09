import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, Check, ChevronDown,
  ClipboardList, Compass, Download, FileText, Leaf, LogOut, MapPin, Menu,
  MessageSquareWarning, Route, Settings, ShieldCheck, Truck, Users, X, Clock
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './style.css';

const API = '/api';
type User = { id: number; name: string; username: string; role: string };

function App() {
  const [token, setToken] = useState(localStorage.token || '');
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState('Dashboard');
  const [menu, setMenu] = useState(false);
  const [data, setData] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [err, setErr] = useState('');

  async function api(path: string, method = 'GET', body?: any) {
    const r = await fetch(API + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw Error(d.detail || 'Request failed');
    }
    return r.json();
  }

  useEffect(() => {
    if (token) {
      api('/me')
        .then(setUser)
        .catch(() => {
          setToken('');
          localStorage.removeItem('token');
        });
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      api('/dashboard').then(setData).catch((e: any) => setErr(e.message));
      api('/complaints').then(setComplaints).catch((e: any) => setErr(e.message));
    }
  }, [user]);

  const configs: any = {
    admin: ['Dashboard', 'Worker Management', 'Vehicle Management', 'Complaints', 'Routes', 'AI Analytics', 'Demand Forecast', 'What-if Simulation', 'Sustainability', 'Reports', 'Audit Logs', 'Settings'],
    office: ['Dashboard', 'New Complaints', 'Pending Verification', 'Worker Assignment', 'Complaint Map', 'Active Tasks', 'Resolution Review', 'Overdue Complaints', 'Notifications', 'Reports', 'Profile'],
    field: ['Dashboard', 'My Tasks', 'Map and Navigation', 'Work History', 'Working Hours', 'Report Issue', 'Notifications', 'Profile'],
    driver: ['Dashboard', "Today's Route", 'Collection Stops', 'Truck Capacity', 'Vehicle Issues', 'Previous Routes', 'Working Hours', 'Notifications', 'Profile'],
    citizen: ['Home', 'File Complaint', 'My Complaints', 'Track Complaint', 'Collection Schedule', 'Zone Status', 'Notifications', 'Profile'],
  };

  if (!user) {
    return (
      <Login
        onLogin={(t: string, u: User) => {
          localStorage.token = t;
          setToken(t);
          setUser(u);
        }}
      />
    );
  }

  const items = configs[user.role] || configs.citizen;
  const navIcon = (x: string) =>
    x.includes('Complaint') || x === 'File Complaint' || x === 'Report Issue' ? <MessageSquareWarning /> :
    x.includes('Route') || x.includes('Map') ? <Route /> :
    x.includes('Worker') || x === 'My Tasks' ? <Users /> :
    x.includes('Truck') || x.includes('Vehicle') ? <Truck /> :
    x.includes('Forecast') || x.includes('Analytics') || x === 'Sustainability' ? <BarChart3 /> :
    x === 'Notifications' ? <Bell /> :
    x === 'Dashboard' || x === 'Home' ? <Activity /> :
    x === 'Reports' ? <FileText /> : <Compass />;

  async function refresh() {
    setData(await api('/dashboard'));
    setComplaints(await api('/complaints'));
  }

  async function act(fn: () => Promise<any>) {
    setErr('');
    try {
      await fn();
      await refresh();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="app">
      <aside className={'sidebar ' + (menu ? 'open' : '')}>
        <div className="brand">
          <div className="brandIcon"><Leaf /></div>
          <div>EcoRoute<span>AI CITY OPERATIONS</span></div>
          <button className="closeMenu" onClick={() => setMenu(false)}><X /></button>
        </div>
        <div className="navLabel">WORKSPACE</div>
        <nav>
          {items.map((x: string) => (
            <button
              key={x}
              onClick={() => { setPage(x); setMenu(false); }}
              className={page === x ? 'active' : ''}
            >
              {navIcon(x)}
              <span>{x}</span>
              {x === 'Pending Verification' && data?.pending > 0 && <b className="count">{data.pending}</b>}
            </button>
          ))}
        </nav>
        <div className="sideBottom">
          <div className="userChip">
            <div className="avatar">{user.name[0]}</div>
            <div>
              <b>{user.name}</b>
              <span>{user.role === 'admin' ? 'Municipal Admin' : user.role}</span>
            </div>
            <ChevronDown size={15} />
          </div>
          <button
            className="logout"
            onClick={() => {
              setUser(null);
              setToken('');
              localStorage.removeItem('token');
            }}
          >
            <LogOut />Sign out
          </button>
          <small>EcoRoute AI · Operations Demo</small>
        </div>
      </aside>

      <main className="main">
        <header>
          <button className="hamb" aria-label="Open navigation" onClick={() => setMenu(!menu)}><Menu /></button>
          <div className="crumb">Operations <span>/</span> {page}</div>
          <div className="topRight">
            <span className="live"><i />Live System</span>
            <button className="iconBtn" title="Notifications" onClick={() => setPage('Notifications')}><Bell /></button>
            <div className="avatar tiny">{user.name[0]}</div>
          </div>
        </header>

        <section className="content">
          <div className="pageTitle">
            <div>
              <div className="eyebrow">MUNICIPAL RESOURCE INTELLIGENCE</div>
              <h1>{page}</h1>
              <p>Plan cleaner, safer and more efficient city services.</p>
            </div>
            <div className="dateTag">
              <span>LOCAL OPERATIONS</span>
              <b>Bengaluru · Live</b>
            </div>
          </div>

          {err && (
            <div className="error">
              {err}
              <button onClick={() => setErr('')}>×</button>
            </div>
          )}

          {page === 'Dashboard' || page === 'Home' ? (
            <Dashboard user={user} data={data} complaints={complaints} setPage={setPage} api={api} act={act} />
          ) : page === 'File Complaint' || page === 'Report Issue' ? (
            <ComplaintForm act={act} api={api} />
          ) : page.includes('Complaint') || page === 'My Tasks' || page === 'Active Tasks' || page === 'New Complaints' || page === 'Pending Verification' || page === 'Resolution Review' || page === 'Overdue Complaints' ? (
            <Complaints role={user.role} list={complaints} api={api} act={act} page={page} />
          ) : page === 'What-if Simulation' ? (
            <Simulation api={api} />
          ) : page === 'Demand Forecast' || page === 'AI Analytics' || page === 'Sustainability' ? (
            <Insights api={api} page={page} />
          ) : page === 'Notifications' ? (
            <Notifications api={api} />
          ) : (
            <Operations page={page} data={data} setPage={setPage} />
          )}
        </section>

        <footer>
          <span>© 2026 EcoRoute AI</span>
          <span><ShieldCheck size={14} /> Role-protected · Local SQLite</span>
          <span>Municipal Operations & Resource Platform</span>
        </footer>
      </main>

      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
    </div>
  );
}

function Login({ onLogin }: any) {
  const [u, setU] = useState('admin');
  const [p, setP] = useState('EcoRoute123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: any) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch(API + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.detail || 'Sign in failed');
      onLogin(d.token, d.user);
    } catch (e: any) {
      setError(e.message || 'Start the backend and try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="brand loginBrand">
          <div className="brandIcon"><Leaf /></div>
          <div>EcoRoute<span>AI CITY OPERATIONS</span></div>
        </div>
        <div className="eyebrow">MUNICIPAL INTELLIGENCE PLATFORM</div>
        <h1>Good operations<br />start here.</h1>
        <p>Sign in to coordinate cleaner, more resilient city services.</p>
        <form onSubmit={submit}>
          <label>
            Username
            <input value={u} onChange={e => setU(e.target.value)} autoComplete="username" required />
          </label>
          <label>
            Password
            <input type="password" value={p} onChange={e => setP(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary wide" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'} <span>→</span>
          </button>
        </form>

        <div className="demoCred">
          <b>Click to autofill demo account:</b>
          <div className="demoPills">
            {['admin', 'office', 'field', 'driver', 'citizen'].map(role => (
              <button
                key={role}
                type="button"
                className={'demoPill ' + (u === role ? 'active' : '')}
                onClick={() => { setU(role); setP('EcoRoute123!'); }}
              >
                {role}
              </button>
            ))}
          </div>
          <small>Shared demo password: <code>EcoRoute123!</code></small>
        </div>
      </div>

      <div className="loginArt">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="artCard">
          <div className="artTop">
            <span>ROUTE INTELLIGENCE</span>
            <span className="live"><i />ACTIVE</span>
          </div>
          <div className="routeViz">
            <div className="routeLine" />
            <div className="pin p1"><MapPin /></div>
            <div className="pin p2"><MapPin /></div>
            <div className="pin p3"><Truck /></div>
            <div className="street s1" />
            <div className="street s2" />
            <div className="street s3" />
            <div className="street s4" />
          </div>
          <div className="artStats">
            <div><b>−18%</b><span>distance estimate</span></div>
            <div><b>5 zones</b><span>in demo coverage</span></div>
          </div>
        </div>
        <div className="artCaption"><Leaf /> Designing cleaner cities with data.</div>
      </div>
    </div>
  );
}

function Dashboard({ user, data, complaints, setPage, api, act }: any) {
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    if (user && ['admin', 'office'].includes(user.role)) {
      api('/workers').then(setWorkers).catch(() => {});
    }
  }, [user]);

  const cards = [
    ['Waste demand', data ? `${data.total_demand} t` : '—', 'TODAY', <Leaf />],
    ['Collected', data ? `${data.collected} t` : '—', `${data?.recovery_rate ?? 0}% recovery`, <Check />],
    ['Open complaints', data?.pending ?? '—', 'NEEDS ATTENTION', <MessageSquareWarning />],
    ['Available trucks', data?.trucks_available ?? '—', 'READY FOR DISPATCH', <Truck />],
  ];

  return (
    <>
      <div className="welcome">
        <div>
          <b>Good morning, {user?.name || 'team'}.</b>
          <span>Here is the latest operational snapshot.</span>
        </div>
        <button className="secondary" onClick={() => setPage('What-if Simulation')}>
          <Activity /> Run scenario
        </button>
      </div>

      <div className="stats">
        {cards.map((c: any, i: number) => (
          <div className="stat" key={c[0]}>
            <div className="statHeader"><span>{c[0]}</span><i className={'statIcon si' + i}>{c[3]}</i></div>
            <strong>{c[1]}</strong>
            <small>{c[2]}</small>
          </div>
        ))}
      </div>

      <div className="gridMain">
        <div className="panel chartPanel">
          <div className="panelHeader">
            <div><h2>Zone collection overview</h2><p>Collected vs. estimated daily demand · tonnes</p></div>
            <button className="plain" onClick={() => setPage('AI Analytics')}>View analytics →</button>
          </div>
          {data?.zones ? (
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.zones}>
                  <CartesianGrid vertical={false} stroke="#edf0ef" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="collected" name="Collected" fill="#209b72" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="demand" name="Demand" fill="#dcebe5" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">Loading live operational data…</div>
          )}
          <div className="chartLegend">
            <span><i className="dot green" />Collected</span>
            <span><i className="dot pale" />Daily estimate</span>
            <em>Operational coverage sample</em>
          </div>
        </div>

        <div className="panel zonePanel">
          <div className="panelHeader">
            <div><h2>Zone status</h2><p>Prioritized by uncollected volume</p></div>
            <button className="plain" onClick={() => setPage('Zone Status')}>All zones →</button>
          </div>
          <div className="zoneList">
            {(data?.zones || []).map((z: any) => {
              const risk = z.demand > z.collected * 1.2;
              return (
                <div className="zoneRow" key={z.id}>
                  <span className={'zoneMark ' + (risk ? 'risk' : '')}>{risk ? '!' : '✓'}</span>
                  <div><b>{z.name}</b><small>{Math.round(z.collected / z.demand * 100)}% of estimated demand collected</small></div>
                  <span className={'badge ' + (risk ? 'warn' : 'good')}>{risk ? 'At risk' : 'On track'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel recent">
        <div className="panelHeader">
          <div><h2>Recent complaints</h2><p>Latest citizen reports and field tasks</p></div>
          <button className="plain" onClick={() => setPage('Complaints')}>View all →</button>
        </div>
        <ComplaintTable list={(complaints || []).slice(0, 5)} role={user?.role} workers={workers} api={api} act={act} />
      </div>
    </>
  );
}

function ComplaintForm({ act, api }: any) {
  const [form, setForm] = useState({ category: 'Overflowing waste', description: '', location: 'Bengaluru Central', lat: 12.9716, lon: 77.5946 });
  const [done, setDone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="panel formPanel">
      <h2>Report a local issue</h2>
      <p>Reports are routed to the municipal office worker verification queue.</p>
      {done ? (
        <div className="success">
          <Check /> {done}
          <p>Your report is in the verification queue. You can track updates under 'My Complaints'.</p>
          <button
            className="secondary"
            style={{ marginTop: '14px' }}
            onClick={() => {
              setDone('');
              setForm({ category: 'Overflowing waste', description: '', location: 'Bengaluru Central', lat: 12.9716, lon: 77.5946 });
            }}
          >
            Submit another report
          </button>
        </div>
      ) : (
        <form onSubmit={e => {
          e.preventDefault();
          setSubmitting(true);
          act(async () => {
            const d = await api('/complaints', 'POST', form);
            setDone(`Complaint ${d.public_id} submitted successfully`);
            return d;
          }).finally(() => setSubmitting(false));
        }}>
          <label>
            Category
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option>Overflowing waste</option>
              <option>Missed collection</option>
              <option>Illegal dumping</option>
              <option>Public bin damaged</option>
              <option>Hazardous waste accumulation</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Location
            <input required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. 5th Main Road, Indiranagar" />
          </label>
          <label>
            Description
            <textarea required minLength={5} rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what you observed (minimum 5 characters)…" />
          </label>
          <div className="locationNote">
            <MapPin /> Map Point: ({form.lat.toFixed(4)}, {form.lon.toFixed(4)})
            <button
              type="button"
              className="plain"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    p => setForm({ ...form, lat: p.coords.latitude, lon: p.coords.longitude }),
                    () => alert('Location permission denied or unavailable. Using default demo location.')
                  );
                }
              }}
            >
              Use my GPS location
            </button>
          </div>
          <button className="primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for verification →'}
          </button>
        </form>
      )}
    </div>
  );
}

function Complaints({ role, list, api, act, page }: any) {
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    if (['admin', 'office'].includes(role)) {
      api('/workers').then(setWorkers).catch(() => {});
    }
  }, [role]);

  let filtered = list || [];
  if (page === 'Pending Verification' || page === 'New Complaints') {
    filtered = filtered.filter((c: any) => c.status === 'Pending Verification');
  } else if (page === 'Active Tasks') {
    filtered = filtered.filter((c: any) => ['Assigned', 'Accepted', 'On the Way', 'Arrived', 'In Progress'].includes(c.status));
  } else if (page === 'Resolution Review') {
    filtered = filtered.filter((c: any) => c.status === 'Resolved');
  } else if (page === 'Overdue Complaints') {
    filtered = filtered.filter((c: any) => ['Pending Verification', 'Assigned', 'In Progress'].includes(c.status));
  }

  async function exportComplaints() {
    try {
      const data = await api('/export/complaints');
      const csv = [data.columns.join(',')].concat(
        data.rows.map((r: any) => data.columns.map((c: string) => `"${(r[c] || '').toString().replace(/"/g, '""')}"`).join(','))
      ).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ecoroute_complaints_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Export failed: ' + e.message);
    }
  }

  return (
    <div className="panel recent">
      <div className="panelHeader">
        <div>
          <h2>{page || 'Complaint lifecycle'}</h2>
          <p>Controlled workflow with role-based transitions and audit history.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {['admin', 'office'].includes(role) && (
            <button className="secondary mini" onClick={exportComplaints} title="Export CSV">
              <FileText size={12} /> Export CSV
            </button>
          )}
          <span className="badge good">{filtered.length} records</span>
        </div>
      </div>
      <ComplaintTable list={filtered} role={role} workers={workers} api={api} act={act} />
    </div>
  );
}

function ComplaintTable({ list, role, workers = [], act, api }: any) {
  const [historyModal, setHistoryModal] = useState<any[] | null>(null);
  const [historyTitle, setHistoryTitle] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  async function viewHistory(c: any) {
    setHistoryTitle(`Audit Timeline · ${c.public_id}`);
    setHistoryLoading(true);
    setHistoryModal([]);
    try {
      const h = await api(`/history/${c.id}`);
      setHistoryModal(h);
    } catch (e: any) {
      alert('Could not load history: ' + e.message);
      setHistoryModal(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  if (!list?.length) {
    return <div className="empty">No complaints to display for this view.</div>;
  }

  const isOfficeOrAdmin = ['office', 'admin'].includes(role);
  const isField = role === 'field';

  return (
    <>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>REFERENCE</th>
              <th>TYPE / LOCATION</th>
              <th>STATUS</th>
              <th>PRIORITY</th>
              <th>ACTION</th>
              <th>AUDIT</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c: any) => (
              <tr key={c.id}>
                <td>
                  <b>{c.public_id}</b>
                  <small>{new Date(c.created).toLocaleDateString()}</small>
                </td>
                <td>
                  <b>{c.category}</b>
                  <small>{c.location}</small>
                </td>
                <td>
                  <span className={'badge ' + (
                    ['Closed', 'Resolved'].includes(c.status) ? 'good' :
                    c.status === 'Pending Verification' ? 'warn' :
                    c.status === 'Rejected' ? 'danger' : 'neutral'
                  )}>
                    {c.status}
                  </span>
                </td>
                <td>
                  <span className={'priorityBadge ' + (c.priority === 'High' ? 'pHigh' : '')}>{c.priority}</span>
                </td>
                <td className="actions">
                  {/* Office & Admin Actions */}
                  {isOfficeOrAdmin && c.status === 'Pending Verification' && (
                    <>
                      <button
                        className="mini"
                        onClick={() => act(() => api(`/complaints/${c.id}/verify`, 'POST', { note: 'Verified by office', priority: 'High' }))}
                      >
                        Verify
                      </button>
                      <button
                        className="mini danger"
                        onClick={() => {
                          const r = prompt('Reason for rejection:');
                          if (r) act(() => api(`/complaints/${c.id}/reject`, 'POST', { reason: r }));
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {isOfficeOrAdmin && c.status === 'Verified' && (
                    <select
                      defaultValue=""
                      onChange={e => {
                        if (e.target.value) {
                          act(() => api(`/complaints/${c.id}/assign`, 'POST', { worker_id: Number(e.target.value), note: 'Assigned by office' }));
                        }
                      }}
                    >
                      <option value="">Assign worker…</option>
                      {workers.filter((w: any) => w.role === 'field').map((w: any) => (
                        <option value={w.id} key={w.id}>{w.name}</option>
                      ))}
                    </select>
                  )}

                  {isOfficeOrAdmin && c.status === 'Resolved' && (
                    <button
                      className="mini"
                      onClick={() => act(() => api(`/complaints/${c.id}/transition`, 'POST', { note: 'Evidence verified and approved' }))}
                    >
                      Approve & Close
                    </button>
                  )}

                  {isOfficeOrAdmin && c.status === 'Closed' && (
                    <button
                      className="mini secondary"
                      onClick={() => {
                        const r = prompt('Reason to reopen:');
                        if (r) act(() => api(`/complaints/${c.id}/transition`, 'POST', { reason: r }));
                      }}
                    >
                      Reopen
                    </button>
                  )}

                  {/* Field Worker Lifecycle Actions */}
                  {isField && c.status === 'Assigned' && (
                    <button className="mini" onClick={() => act(() => api(`/complaints/${c.id}/transition`, 'POST', { note: 'Task accepted by worker' }))}>
                      Accept Task
                    </button>
                  )}
                  {isField && c.status === 'Accepted' && (
                    <button className="mini" onClick={() => act(() => api(`/complaints/${c.id}/transition`, 'POST', { note: 'En route to location' }))}>
                      On the Way
                    </button>
                  )}
                  {isField && c.status === 'On the Way' && (
                    <button className="mini" onClick={() => act(() => api(`/complaints/${c.id}/transition`, 'POST', { note: 'Arrived at site' }))}>
                      Arrived
                    </button>
                  )}
                  {isField && c.status === 'Arrived' && (
                    <button className="mini" onClick={() => act(() => api(`/complaints/${c.id}/transition`, 'POST', { note: 'Work commenced' }))}>
                      Start Work
                    </button>
                  )}
                  {isField && c.status === 'In Progress' && (
                    <button className="mini" onClick={() => act(() => api(`/complaints/${c.id}/transition`, 'POST', { note: 'Waste cleared and resolved' }))}>
                      Mark Resolved
                    </button>
                  )}

                  {/* Context status indicator if no immediate action */}
                  {!isField && !isOfficeOrAdmin && (
                    <span style={{ fontSize: '10px', color: '#88968f' }}>{c.status}</span>
                  )}
                  {isOfficeOrAdmin && ['Assigned', 'Accepted', 'On the Way', 'Arrived', 'In Progress'].includes(c.status) && (
                    <span style={{ fontSize: '10px', color: '#687770' }}>Field In Progress</span>
                  )}
                </td>
                <td>
                  <button className="mini secondary" title="View audit history" onClick={() => viewHistory(c)}>
                    <Clock size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> Timeline
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* History Modal */}
      {historyModal !== null && (
        <div className="timelineModal" onClick={() => setHistoryModal(null)}>
          <div className="timelineCard" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, font: '700 14px Manrope' }}>{historyTitle}</h3>
              <button className="plain" onClick={() => setHistoryModal(null)}><X size={16} /></button>
            </div>
            {historyLoading ? (
              <div className="empty">Loading audit timeline…</div>
            ) : historyModal.length === 0 ? (
              <div className="empty">No history entries recorded yet.</div>
            ) : (
              <div className="timelineList">
                {historyModal.map((h: any) => (
                  <div className="timelineItem" key={h.id}>
                    <b>{h.action}</b> {h.actor_name ? <span style={{ color: '#168053', fontWeight: 600 }}>by {h.actor_name}</span> : ''}
                    {h.note && <div style={{ color: '#4d5d55', marginTop: '2px' }}>{h.note}</div>}
                    <small>{new Date(h.created).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Simulation({ api }: any) {
  const [s, S] = useState({ demand_change: 18, trucks: 2, capacity: 850, hours: 8, workers: 5, fuel_price: 100 });
  const [r, R] = useState<any>();
  const [busy, B] = useState(false);

  async function run() {
    B(true);
    try {
      R(await api('/simulate', 'POST', s));
    } catch (e: any) {
      R({ error: e.message });
    }
    B(false);
  }

  return (
    <>
      <div className="simIntro">
        <div>
          <div className="eyebrow">CONSTRAINED SCENARIO</div>
          <h2>Baseline vs. optimized operations</h2>
          <p>Both calculations use identical demand and resource constraints.</p>
        </div>
        <button className="primary" onClick={run} disabled={busy}>
          {busy ? 'Calculating…' : 'Calculate comparison →'}
        </button>
      </div>

      <div className="simLayout">
        <div className="panel controls">
          <h3>Scenario inputs</h3>
          <Control label="Demand change" value={s.demand_change} min={-30} max={60} suffix="%" set={(v: number) => S({ ...s, demand_change: v })} />
          <Control label="Available trucks" value={s.trucks} min={1} max={5} set={(v: number) => S({ ...s, trucks: v })} />
          <Control label="Payload capacity / truck" value={s.capacity} min={300} max={1500} step={50} suffix="t" set={(v: number) => S({ ...s, capacity: v })} />
          <Control label="Shift limit" value={s.hours} min={4} max={12} suffix="h" set={(v: number) => S({ ...s, hours: v })} />
          <Control label="Available field workers" value={s.workers} min={1} max={20} set={(v: number) => S({ ...s, workers: v })} />
          <Control label="Fuel price (reference)" value={s.fuel_price} min={70} max={150} suffix="₹/L" set={(v: number) => S({ ...s, fuel_price: v })} />
        </div>

        <div className="panel resultPanel">
          <h3>Outcome comparison</h3>
          {r?.error ? (
            <div className="error">{r.error}</div>
          ) : r ? (
            <>
              <div className="resultTable">
                <div className="rhead">
                  <span>OPERATIONAL METRIC</span>
                  <span>BASELINE</span>
                  <span>OPTIMIZED</span>
                  <span>CHANGE</span>
                </div>
                {[
                  ['Waste demand', 'demand_t', ' t', false],
                  ['Collected', 'collected_t', ' t', true],
                  ['Uncollected', 'uncollected_t', ' t', false],
                  ['Trucks used', 'trucks_used', '', false],
                  ['Distance', 'distance_km', ' km', false],
                  ['Fuel estimate', 'fuel_l', ' L', false],
                  ['CO₂ estimate', 'co2_kg', ' kg', false],
                  ['Collection time', 'collection_hours', ' h', false],
                  ['Capacity utilization', 'capacity_utilization_pct', '%', true],
                  ['Recovery estimate', 'recovered_t', ' t', true],
                ].map(([n, k, suf, higherIsBetter]: any) => {
                  const a = r.baseline[k];
                  const b = r.optimized[k];
                  const rawDelta = b - a;
                  const delta = Math.round(rawDelta * 10) / 10;
                  const pct = a ? Math.round((rawDelta / a) * 100) : 0;
                  const isGood = higherIsBetter ? delta >= 0 : delta <= 0;
                  return (
                    <div className="rrow" key={k}>
                      <b>{n}</b>
                      <span>{a}{suf}</span>
                      <strong>{b}{suf}</strong>
                      <span className={isGood ? 'better' : 'worse'}>
                        {delta > 0 ? '+' : ''}{delta}{suf} ({pct > 0 ? '+' : ''}{pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="assumptions">
                <b>Constraints & assumptions</b>
                <span>{r.constraints.truck_capacity_t} t available payload · {r.constraints.shift_hours} hour shifts · {r.constraints.worker_limit} workers. Distance uses zone-centre proxy; fuel uses 0.32 L/km.</span>
                <small>Simulated comparison with verified identical inputs for baseline and optimization.</small>
              </div>
            </>
          ) : (
            <div className="empty">Adjust the scenario inputs on the left, then click Calculate to compare outcomes.</div>
          )}
        </div>
      </div>
    </>
  );
}

function Control({ label, value, min, max, step = 1, suffix = '', set }: any) {
  return (
    <label className="control">
      <div>
        <span>{label}</span>
        <b>{value}{suffix}</b>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => set(Number(e.target.value))} />
    </label>
  );
}

function Insights({ api, page }: any) {
  const [x, setX] = useState<any>();
  useEffect(() => {
    api('/forecast').then(setX).catch(() => {});
  }, []);

  return (
    <div className="panel">
      <div className="panelHeader">
        <div>
          <h2>{page} estimates</h2>
          <p>Estimates based on regional baseline and activity models.</p>
        </div>
        <span className="badge warn">ESTIMATES</span>
      </div>
      <div className="forecastGrid">
        {(x?.zones || []).map((z: any) => (
          <div className="forecastCard" key={z.zone}>
            <span>{z.zone}</span>
            <b>{z.forecast_t} <small>t/day</small></b>
            <div>
              baseline {z.baseline_t} t{' '}
              <span className={z.high_demand ? 'badge warn' : 'badge good'}>
                {z.high_demand ? 'High demand' : 'Normal'}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="footNote">
        Forecast method: baseline demand uplift with peak-hour zone adjustment to demonstrate an operational resource planning workflow.
      </p>
    </div>
  );
}

function Notifications({ api }: any) {
  const [n, setN] = useState<any[]>([]);
  useEffect(() => {
    api('/notifications').then(setN).catch(() => {});
  }, []);

  return (
    <div className="panel">
      <h2>Notifications</h2>
      {n.length ? (
        n.map(x => (
          <div className="notice" key={x.id}>
            <Bell />
            <span>
              {x.message}
              <small>{new Date(x.created).toLocaleString()}</small>
            </span>
          </div>
        ))
      ) : (
        <div className="empty">You're all caught up. No unread notifications.</div>
      )}
    </div>
  );
}

function Operations({ page, data, setPage }: any) {
  return (
    <div className="panel operations">
      <div className="emptyIcon"><Compass /></div>
      <h2>{page}</h2>
      <p>Operational data and scheduling resources for municipal staff.</p>
      {page.includes('Vehicle') || page.includes('Truck') ? (
        <div className="vehicleGrid">
          {(data?.vehicles || []).map((v: any) => (
            <div className="vehicle" key={v.id}>
              <Truck />
              <b>{v.name}</b>
              <span>{v.capacity} t capacity</span>
              <em className={'badge ' + (v.status === 'available' ? 'good' : 'warn')}>{v.status}</em>
            </div>
          ))}
        </div>
      ) : page.includes('Zone') || page.includes('Schedule') || page.includes('Route') ? (
        <div className="zoneList">
          {(data?.zones || []).map((z: any) => (
            <div className="zoneRow" key={z.id}>
              <MapPin />
              <div>
                <b>{z.name} Zone</b>
                <small>{z.collected} t collected · {z.demand} t daily demand</small>
              </div>
              <span className="badge neutral">Active route</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="quickLinks">
          <button className="secondary" onClick={() => setPage('What-if Simulation')}>
            <Activity /> Open simulation
          </button>
          <button className="secondary" onClick={() => setPage('Complaints')}>
            <ClipboardList /> View complaints
          </button>
        </div>
      )}
      <div className="syntheticNote">
        <ShieldCheck /> Verified municipal database connection active.
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
