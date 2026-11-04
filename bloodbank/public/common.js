/* Shared helpers + app shell for Sowmya Blood Bank Management System */

const APP_NAME = 'Sowmya Blood Bank Management System';

const ICONS = {
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  trash:'<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
  drop:'<path d="M12 3c3 4.2 6 7.2 6 11a6 6 0 01-12 0c0-3.8 3-6.8 6-11z"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14.5c2.2.6 3.5 2.4 3.5 5.5"/>',
  stock:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  request:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M12 11v6M9 14h6"/>',
  heart:'<path d="M12 20s-8-4.9-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6.1-8 11-8 11z"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  refresh:'<path d="M21 12a9 9 0 11-3-6.7"/><path d="M21 3v6h-6"/>',
  alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
};
function icon(name){ return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name]||'') + '</svg>'; }

(function(){const l=document.createElement('link');l.rel='icon';
l.href="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#c81e1e"/><path d="M16 6c4 5.2 7.5 8.8 7.5 13a7.5 7.5 0 01-15 0c0-4.2 3.5-7.8 7.5-13z" fill="#fff"/></svg>');
document.head.appendChild(l);})();

const TODAY = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'});
const TODAY_ISO = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })();

/* ---------- Data model (mirrors the three MySQL tables) ---------- */
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const LOW_STOCK = 10, OK_STOCK = 25;
const REQUEST_STATUS = ['Pending','Approved','Issued','Rejected'];

function stockLevel(u){ u = Number(u) || 0; return u < LOW_STOCK ? 'Low' : u < OK_STOCK ? 'Moderate' : 'Good'; }
function initials(n){ return String(n||'?').trim().split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase(); }
function fmtDate(s){
  if (!s) return '—';
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return escapeHtml(s);
  return new Date(Date.UTC(+m[1], +m[2]-1, +m[3])).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', timeZone:'UTC' });
}
function bgChip(g){ return '<span class="bg-chip">' + escapeHtml(g) + '</span>'; }

const ENTITIES = {
  donors: {
    key:'donors', path:'/donors', pk:'donor_id', S:'Donor', P:'Donors', icon:'users', img:'',
    fields:[
      { k:'donor_id', label:'Donor ID', type:'number', min:1, placeholder:'e.g. 101' },
      { k:'name', label:'Full name', type:'text', maxlength:100, placeholder:'e.g. Ravi Kumar', full:true },
      { k:'age', label:'Age', type:'number', min:18, max:65, placeholder:'18 – 65' },
      { k:'gender', label:'Gender', type:'select', options:['Male','Female','Other'] },
      { k:'blood_group', label:'Blood group', type:'select', options:BLOOD_GROUPS },
      { k:'phone', label:'Phone', type:'tel', maxlength:15, pattern:'[0-9+\\-\\s]{7,15}', placeholder:'e.g. 9876543210' }
    ],
    cols:[
      { k:'donor_id', label:'ID', id:true },
      { k:'name', label:'Name', render:r => '<span class="donor-cell"><span class="mini-av">' + escapeHtml(initials(r.name)) + '</span>' + escapeHtml(r.name) + '</span>' },
      { k:'age', label:'Age', num:true },
      { k:'gender', label:'Gender' },
      { k:'blood_group', label:'Blood group', render:r => bgChip(r.blood_group) },
      { k:'phone', label:'Phone' }
    ],
    filter:{ k:'blood_group', all:'All blood groups', options:BLOOD_GROUPS },
    searchHint:'Search by name, group or phone…',
    label:r => '#' + r.donor_id + ' · ' + r.name + ' · ' + r.blood_group
  },
  stock: {
    key:'stock', path:'/blood_stock', pk:'stock_id', S:'Stock record', P:'Blood Stock', icon:'stock',
    fields:[
      { k:'stock_id', label:'Stock ID', type:'number', min:1, placeholder:'e.g. 1' },
      { k:'blood_group', label:'Blood group', type:'select', options:BLOOD_GROUPS },
      { k:'units_available', label:'Units available', type:'number', min:0, placeholder:'e.g. 25', full:true,
        help:'The "last updated" date is filled in automatically when you save.' }
    ],
    cols:[
      { k:'stock_id', label:'ID', id:true },
      { k:'blood_group', label:'Blood group', render:r => bgChip(r.blood_group) },
      { k:'units_available', label:'Units', num:true },
      { k:'_level', label:'Level', sortKey:'units_available', render:r => levelBadge(r.units_available) },
      { k:'last_updated', label:'Last updated', render:r => fmtDate(r.last_updated) }
    ],
    filter:{ k:'blood_group', all:'All blood groups', options:BLOOD_GROUPS },
    searchHint:'Search by blood group…',
    label:r => '#' + r.stock_id + ' · ' + r.blood_group + ' · ' + r.units_available + ' units',
    extraDetail:[['Last updated', r => fmtDate(r.last_updated)], ['Level', r => levelBadge(r.units_available)]]
  },
  requests: {
    key:'requests', path:'/blood_requests', pk:'request_id', S:'Blood request', P:'Blood Requests', icon:'request',
    fields:[
      { k:'request_id', label:'Request ID', type:'number', min:1, placeholder:'e.g. 501' },
      { k:'request_date', label:'Request date', type:'date', default:TODAY_ISO },
      { k:'hospital_name', label:'Hospital name', type:'text', maxlength:150, placeholder:'e.g. City General Hospital', full:true },
      { k:'blood_group', label:'Blood group', type:'select', options:BLOOD_GROUPS },
      { k:'units_required', label:'Units required', type:'number', min:1, placeholder:'e.g. 3' },
      { k:'status', label:'Status', type:'select', options:REQUEST_STATUS, insertOptions:['Pending','Approved','Rejected'], default:'Pending', full:true,
        help:'Set the status to Issued in Update Request to deduct the units from blood stock.' }
    ],
    cols:[
      { k:'request_id', label:'ID', id:true },
      { k:'hospital_name', label:'Hospital' },
      { k:'blood_group', label:'Group', render:r => bgChip(r.blood_group) },
      { k:'units_required', label:'Units', num:true },
      { k:'request_date', label:'Requested on', render:r => fmtDate(r.request_date) },
      { k:'status', label:'Status', render:r => statusBadge(r.status) }
    ],
    filter:{ k:'status', all:'All statuses', options:REQUEST_STATUS },
    searchHint:'Search by hospital, group or status…',
    label:r => '#' + r.request_id + ' · ' + r.hospital_name + ' · ' + r.blood_group
  }
};
const ENTITY_KEYS = Object.keys(ENTITIES);
const ENTITY_KEY = (() => { const t = new URLSearchParams(location.search).get('t'); return ENTITIES[t] ? t : 'donors'; })();
const ENT = ENTITIES[ENTITY_KEY];

/* Nav: entity-aware pages keep the selected table in ?t= */
const NAV = [
  { label:'Overview' },
  { file:'index.html',   text:'Dashboard',        icon:'home' },
  { label:'Records' },
  { file:'list.html',    text:'All Records',      icon:'list',   ent:true },
  { file:'listOne.html', text:'Find Record',      icon:'search', ent:true },
  { label:'Manage' },
  { file:'insert.html',  text:'Add Record',       icon:'plus',   ent:true },
  { file:'update.html',  text:'Update Record',    icon:'edit',   ent:true },
  { file:'delete.html',  text:'Delete Record',    icon:'trash',  ent:true },
  { label:'Operations' },
  { file:'donate.html',  text:'Record Donation',  icon:'heart' }
];

/* ---------- App shell ---------- */
(function buildShell(){
  const page = document.getElementById('page-content');
  if (!page) return;
  const file = document.body.dataset.page || 'index.html';
  const title = tpl(document.body.dataset.title || 'Dashboard');

  const links = NAV.map(n => n.label
    ? '<div class="nav-label">' + n.label + '</div>'
    : '<a href="' + n.file + (n.ent ? '?t=' + ENTITY_KEY : '') + '"' + (n.file === file ? ' class="active" aria-current="page"' : '') + '>' + icon(n.icon) + n.text + '</a>'
  ).join('');

  const shell = document.createElement('div');
  shell.innerHTML =
    '<aside class="sidebar" id="sidebar">' +
      '<div class="side-brand"><div class="logo">' + icon('drop') + '</div>' +
      '<div><b>' + APP_NAME + '</b><small>Donors · Stock · Requests</small></div></div>' +
      '<nav class="side-nav" aria-label="Main navigation">' + links + '</nav>' +
      '<div class="side-foot"><span class="dot" id="dbDot"></span><span id="dbText">Checking server…</span></div>' +
    '</aside><div class="scrim" id="scrim"></div>' +
    '<div class="main">' +
      '<header class="topbar">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<button class="menu-btn" id="menuBtn" aria-label="Open menu">' + icon('menu') + '</button>' +
          '<div class="crumbs">Sowmya <span>/</span> <b>' + title + '</b></div></div>' +
        '<div class="top-right"><span class="who">' + TODAY + '</span><span class="sep"></span><span class="who role">Blood Bank Officer</span><div class="avatar">SB</div></div>' +
      '</header>' +
      '<main class="content" id="slot"></main>' +
      '<footer><span>© ' + new Date().getFullYear() + ' ' + APP_NAME + '</span><span>Every donation saves lives</span></footer>' +
    '</div><div class="toasts" id="toasts" aria-live="polite"></div>' +
    '<div class="modal-back" id="modalBack"><div class="modal" role="dialog" aria-modal="true">' +
      '<div class="m-ic">' + icon('alert') + '</div><h3 id="mTitle"></h3><p id="mText"></p>' +
      '<div class="form-actions"><button class="btn secondary" id="mCancel">Cancel</button>' +
      '<button class="btn danger" id="mOk">Delete</button></div></div></div>';

  document.title = title + ' | ' + APP_NAME;
  const slot = shell.querySelector('#slot');
  slot.appendChild(page);
  page.removeAttribute('id');
  document.body.append(...shell.childNodes);

  const body = document.body;
  document.getElementById('menuBtn').onclick = () => body.classList.toggle('nav-open');
  document.getElementById('scrim').onclick = () => body.classList.remove('nav-open');

  // Fill {S}/{P} placeholders and entity tabs
  document.querySelectorAll('[data-tpl]').forEach(el => { el.textContent = tpl(el.dataset.tpl); });
  const tabs = document.getElementById('entityTabs');
  if (tabs) {
    tabs.className = 'tabs';
    tabs.setAttribute('role', 'navigation'); tabs.setAttribute('aria-label', 'Choose table');
    tabs.innerHTML = ENTITY_KEYS.map(k =>
      '<a href="' + file + '?t=' + k + '"' + (k === ENTITY_KEY ? ' class="on" aria-current="page"' : '') + '>' + icon(ENTITIES[k].icon) + ENTITIES[k].P + '</a>').join('');
  }

  // Server health indicator
  fetch('/donors').then(r => {
    if (!r.ok) throw 0;
    document.getElementById('dbDot').className = 'dot on';
    document.getElementById('dbText').textContent = 'Database connected';
  }).catch(() => {
    document.getElementById('dbDot').className = 'dot off';
    document.getElementById('dbText').textContent = 'Server unreachable';
  });
})();

function tpl(s){
  return String(s).replace(/\{S\}/g, ENT.S).replace(/\{s\}/g, ENT.S.toLowerCase())
                  .replace(/\{P\}/g, ENT.P).replace(/\{p\}/g, ENT.P.toLowerCase());
}

/* ---------- API ---------- */
async function getRows(key = ENTITY_KEY) {
  const r = await fetch(ENTITIES[key].path);
  if (!r.ok) throw new Error(await r.text() || 'Could not load data.');
  return r.json();
}

/* ---------- UI helpers ---------- */
function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function toast(message, isError = false) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' error' : '');
  t.innerHTML = '<div><b>' + (isError ? 'Something went wrong' : 'Success') + '</b><span>' + escapeHtml(message) + '</span></div>';
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3800);
}

function confirmDialog(title, text, okLabel = 'Delete') {
  return new Promise(resolve => {
    const back = document.getElementById('modalBack');
    document.getElementById('mTitle').textContent = title;
    document.getElementById('mText').textContent = text;
    const ok = document.getElementById('mOk'), cancel = document.getElementById('mCancel');
    ok.textContent = okLabel;
    const close = v => { back.classList.remove('open'); ok.onclick = cancel.onclick = back.onclick = null; resolve(v); };
    ok.onclick = () => close(true);
    cancel.onclick = () => close(false);
    back.onclick = e => { if (e.target === back) close(false); };
    back.classList.add('open'); cancel.focus();
  });
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  const known = ['pending','approved','issued','rejected'].includes(s);
  return '<span class="badge ' + (known ? 'badge-' + s : 'badge-default') + '">' + escapeHtml(status) + '</span>';
}
function levelBadge(units) {
  const l = stockLevel(units);
  return '<span class="badge badge-' + l.toLowerCase() + '">' + l + '</span>';
}

/* ---------- Generic forms ---------- */
function fieldHtml(f, mode) {
  const id = f.k, req = mode === 'update' ? '' : ' <span class="req">*</span>';
  const dis = mode === 'update' ? ' disabled' : '';
  let ctl;
  if (f.type === 'select') {
    const opts = (mode === 'insert' && f.insertOptions) ? f.insertOptions : f.options;
    ctl = '<select id="' + id + '" required' + dis + '>' +
      '<option value="">Select…</option>' + opts.map(o => '<option value="' + escapeHtml(o) + '"' + (mode === 'insert' && f.default === o ? ' selected' : '') + '>' + escapeHtml(o) + '</option>').join('') + '</select>';
  } else {
    ctl = '<input id="' + id + '" type="' + f.type + '" required' + dis +
      (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') +
      (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + (f.pattern ? ' pattern="' + f.pattern + '" title="Digits, spaces, + or - (7–15 characters)"' : '') +
      (mode === 'insert' && f.default ? ' value="' + escapeHtml(f.default) + '"' : '') +
      ' placeholder="' + (mode === 'update' ? 'Select a record first' : escapeHtml(f.placeholder || '')) + '">';
  }
  return '<div class="field' + (f.full ? ' full' : '') + '"><label for="' + id + '">' + f.label + req + '</label>' + ctl +
    (f.help ? '<span class="help">' + escapeHtml(f.help) + '</span>' : '') + '</div>';
}
function buildFields(containerId, mode) {
  const fs = mode === 'update' ? ENT.fields.filter(f => f.k !== ENT.pk) : ENT.fields;
  document.getElementById(containerId).innerHTML = fs.map(f => fieldHtml(f, mode)).join('');
}
function readFields(mode) {
  const out = {};
  (mode === 'update' ? ENT.fields.filter(f => f.k !== ENT.pk) : ENT.fields)
    .forEach(f => { out[f.k] = document.getElementById(f.k).value.trim(); });
  return out;
}

async function fillSelect(id, placeholder) {
  const el = document.getElementById(id);
  if (!el) return [];
  el.innerHTML = '<option value="">Loading…</option>';
  try {
    const rows = await getRows();
    el.innerHTML = rows.length
      ? '<option value="">' + (placeholder || 'Select ' + ENT.S.toLowerCase() + '…') + '</option>' +
        rows.map(r => '<option value="' + escapeHtml(r[ENT.pk]) + '">' + escapeHtml(ENT.label(r)) + '</option>').join('')
      : '<option value="">No records available</option>';
    return rows;
  } catch (e) {
    el.innerHTML = '<option value="">Could not load records</option>';
    toast(e.message, true);
    return [];
  }
}

/* ---------- Generic table (search / filter / sort / paginate) ---------- */
const tableState = {};
function renderTable(key, rows, id = 'dataTable', opts = {}) {
  const table = document.getElementById(id);
  if (!table) return;
  const ent = ENTITIES[key];
  // one persistent state object per table, so the search/filter handlers always edit the live state
  const st = tableState[id] = tableState[id] || { q:'', filter:'', sort:ent.pk, dir:1, page:1 };
  st.rows = rows;
  const PAGE = opts.pageSize || 8;
  const cols = opts.cols || ent.cols;

  const q = st.q.trim().toLowerCase();
  let list = rows.filter(r =>
    (!st.filter || String(r[ent.filter.k]).toLowerCase() === st.filter.toLowerCase()) &&
    (!q || Object.values(r).join(' ').toLowerCase().includes(q)));
  const sc = cols.find(c => c.k === st.sort);
  const sk = sc && sc.sortKey ? sc.sortKey : st.sort;
  list.sort((a, b) => {
    const x = a[sk], y = b[sk];
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric:true })) * st.dir;
  });

  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  if (st.page > pages) st.page = pages;
  const total = list.length;
  if (opts.paginate !== false) list = list.slice((st.page - 1) * PAGE, st.page * PAGE);

  table.innerHTML =
    '<thead><tr>' + cols.map(c =>
      '<th class="sortable ' + (c.num ? 'num' : '') + '" data-k="' + c.k + '">' + c.label +
      '<span class="arr">' + (st.sort === c.k ? (st.dir > 0 ? '▲' : '▼') : '↕') + '</span></th>').join('') + '</tr></thead><tbody>' +
    (list.length ? list.map(r => '<tr>' + cols.map(c =>
        '<td class="' + [c.id ? 'id' : '', c.num ? 'num' : ''].join(' ').trim() + '">' +
        (c.id ? '#' + escapeHtml(r[c.k]) : c.render ? c.render(r) : escapeHtml(r[c.k])) + '</td>').join('') + '</tr>').join('')
      : '<tr><td class="empty" colspan="' + cols.length + '">' + (rows.length ? 'No records match your filters.' : 'No records found.') + '</td></tr>') + '</tbody>';

  table.querySelectorAll('th.sortable').forEach(th => th.onclick = () => {
    st.dir = st.sort === th.dataset.k ? -st.dir : 1; st.sort = th.dataset.k; st.page = 1; renderTable(key, rows, id, opts);
  });

  const count = document.getElementById(id + 'Count');
  if (count) count.textContent = total ? 'Showing ' + ((st.page-1)*PAGE + 1) + '–' + ((st.page-1)*PAGE + list.length) + ' of ' + total + ' record' + (total === 1 ? '' : 's') : 'No records';
  const pager = document.getElementById(id + 'Pager');
  if (pager) {
    pager.innerHTML = pages > 1 ? '<button class="btn secondary sm" data-p="prev"' + (st.page<=1?' disabled':'') + '>Previous</button><span>Page ' + st.page + ' of ' + pages + '</span><button class="btn secondary sm" data-p="next"' + (st.page>=pages?' disabled':'') + '>Next</button>' : '';
    pager.querySelectorAll('button').forEach(b => b.onclick = () => { st.page += b.dataset.p === 'next' ? 1 : -1; renderTable(key, rows, id, opts); });
  }

  const host = document.getElementById(id + 'Toolbar');
  if (host && !document.getElementById(id + 'Q') && opts.tools !== false) {
    host.innerHTML =
      '<div class="search">' + icon('search') + '<input type="search" id="' + id + 'Q" placeholder="' + ent.searchHint + '" aria-label="Search records"></div>' +
      '<select id="' + id + 'F" aria-label="Filter"><option value="">' + ent.filter.all + '</option>' +
      ent.filter.options.map(o => '<option>' + o + '</option>').join('') + '</select>';
    document.getElementById(id + 'Q').oninput = e => { st.q = e.target.value; st.page = 1; renderTable(key, st.rows, id, opts); };
    document.getElementById(id + 'F').onchange = e => { st.filter = e.target.value; st.page = 1; renderTable(key, st.rows, id, opts); };
  }
}

function skeletonRows(id = 'dataTable', n = 5, cols = 6) {
  const t = document.getElementById(id);
  if (!t) return;
  t.innerHTML = '<tbody>' + Array.from({ length:n }, () =>
    '<tr>' + Array.from({ length:cols }, () => '<td><span class="skeleton">loading</span></td>').join('') + '</tr>').join('') + '</tbody>';
}

async function loadTable(key = ENTITY_KEY, id = 'dataTable', opts = {}) {
  skeletonRows(id, 5, (opts.cols || ENTITIES[key].cols).length);
  try { renderTable(key, await getRows(key), id, opts); }
  catch (e) {
    const t = document.getElementById(id);
    if (t) t.innerHTML = '<tbody><tr><td class="empty" colspan="6">Unable to load records. Check that the server and database are running.</td></tr></tbody>';
    toast(e.message, true);
  }
}
