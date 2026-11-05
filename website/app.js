'use strict';

/* ------------------------------------------------------------------ *
 * Questions, authors, sources
 * ------------------------------------------------------------------ */

const questions = [
  ['Active meters per 1,000 affordable units', 'How does borough-level active meter availability compare with affordable housing units?'],
  ['Housing near an active meter by borough and year', 'What share of housing records are near an active meter, by borough and completion year?'],
  ['New construction and preservation', 'How does nearby active-meter availability differ by construction type?'],
  ['Three-bedroom-plus share', 'Is bedroom composition associated with nearby active-meter counts?'],
  ['Income-band composition', 'How does affordable-housing income composition relate to nearby meter counts?'],
  ['New affordable units by community board', 'Which boards have more new affordable units, and how does meter availability compare?'],
  ['Geographic overlap', 'How do affordable housing records and active meter locations overlap geographically?'],
  ['Meter status near new housing', 'Are inactive meters more or less common near new affordable housing?'],
  ['Housing record size', 'Are larger affordable housing records associated with more nearby active meters?'],
  ['Meter time-limit groups', 'How do meter time limits differ near and farther from affordable housing?'],
  ['Affordable-unit share', 'Is affordable-unit share associated with nearby active-meter counts?'],
  ['Project duration', 'Does project duration differ between records near an active meter and those without one?']
];

const authors = [
  'Ahmed Sayed', 'Ahmed Sayed',
  'Mohannad Hany', 'Mohannad Hany',
  'Abdelrahman Mohamed', 'Abdelrahman Mohamed',
  'Mohamed Wael', 'Mohamed Wael',
  'Kareem Ahmad Aly Mursy Ahmad Alguineedy', 'Kareem Ahmad Aly Mursy Ahmad Alguineedy',
  'Deema Sameh Mahmoud Abdelwahed Seada', 'Deema Sameh Mahmoud Abdelwahed Seada'
];

const files = ['borough_summary', 'community_board_summary', 'year_summary', 'buildings_integrated', 'meters_integrated'];

const BOROUGHS = ['BRONX', 'BROOKLYN', 'MANHATTAN', 'QUEENS', 'STATEN ISLAND'];
const MAP_POINT_BUDGET = 3500;
const SCATTER_POINT_CAP = 400;
const TABLE_POINT_CAP = 200;

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const $ = s => document.querySelector(s);
const N = x => (x === '' || x == null || !Number.isFinite(Number(x)) ? null : Number(x));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => {
  const a = Math.abs(n), d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return n.toLocaleString(undefined, { maximumFractionDigits: d });
};
const pct = n => (n == null ? '–' : (n * 100).toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%');

/* Axis top that lands on round tick values: 80.8 becomes 100, 9 becomes 12. */
function niceMax(values) {
  const raw = Math.max(...values, 0);
  if (!(raw > 0)) return 1;
  const steps = 4;
  if (values.every(v => Number.isInteger(v)) && raw < 20) {
    return Math.max(1, Math.ceil(raw / steps)) * steps;
  }
  const rough = raw / steps;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return mult * mag * steps;
}

let D = {};
let applied = { borough: 'ALL', year: 'ALL', construction: 'ALL', status: 'ALL', term: '' };
let tables = [];

/* ------------------------------------------------------------------ *
 * CSV in and out
 * ------------------------------------------------------------------ */

function csv(text) {
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (c === '"') quoted = false;
      else value += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(value); value = ''; }
    else if (c === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = ''; }
    else value += c;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((k, i) => [k, r[i]])));
}

function toCsv(rows) {
  if (!rows.length) return '';
  const head = Object.keys(rows[0]);
  const cell = v => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [head.join(','), ...rows.map(r => head.map(k => cell(r[k])).join(','))].join('\r\n');
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ *
 * Filtering
 * ------------------------------------------------------------------ */

function matchesText(row, fields) {
  return !applied.term || fields.some(k => String(row[k] || '').toLowerCase().includes(applied.term));
}

function houses() {
  return D.buildings.filter(r =>
    (applied.borough === 'ALL' || r.borough === applied.borough) &&
    (applied.year === 'ALL' || String(r.completion_year) === applied.year) &&
    (applied.construction === 'ALL' || r.reporting_construction_type === applied.construction) &&
    matchesText(r, ['project_name', 'borough', 'community_board', 'reporting_construction_type'])
  );
}

function meters() {
  return D.meters.filter(r =>
    (applied.borough === 'ALL' || r.borough === applied.borough) &&
    (applied.status === 'ALL' || (applied.status === 'UNKNOWN' ? !r.status : String(r.status).toUpperCase() === applied.status)) &&
    matchesText(r, ['borough', 'on_street', 'from_street', 'to_street', 'status', 'facility'])
  );
}

/* ------------------------------------------------------------------ *
 * SVG primitives
 * ------------------------------------------------------------------ */

function axes(title, xlabel, ylabel, cls = '') {
  return `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 820 350" role="img" aria-label="${esc(title)}">` +
    `<text class="axis-label" x="420" y="346" text-anchor="middle">${esc(xlabel)}</text>` +
    `<text class="axis-label" transform="translate(15 180) rotate(-90)" text-anchor="middle">${esc(ylabel)}</text>`;
}

function empty() {
  return '<div class="empty">No usable records match these filters.</div>';
}

function bars(labels, values, title, xlabel, ylabel, percent = false) {
  if (!labels.length) return empty();
  const mx = niceMax(values);
  const w = Math.min(66, 650 / labels.length);
  const gap = Math.max(4, (710 - w * labels.length) / labels.length);
  const budget = Math.max(5, Math.floor((w + gap) / 8.4));
  const alt = labels.map((l, i) => `${l}: ${values[i].toLocaleString(undefined, { maximumFractionDigits: 2 })}${percent ? '%' : ''}`).join('; ');
  let s = axes(title + (alt ? ' — ' + alt : ''), xlabel, ylabel);
  for (let j = 0; j < 5; j++) {
    const y = 303 - j * 65;
    s += `<line class="gridline" x1="58" y1="${y}" x2="798" y2="${y}"/>` +
      `<text class="tick" x="52" y="${y + 4}" text-anchor="end">${fmt(mx * j / 4)}</text>`;
  }
  labels.forEach((l, i) => {
    const x = 67 + i * (w + gap);
    const h = values[i] / mx * 260;
    const cut = v => (v.length > budget ? v.slice(0, budget - 1) + '…' : v);
    const dense = labels.length > 5;
    const lines = dense && String(l).includes(' · ') ? String(l).split(' · ') : [String(l)];
    s += `<g class="bar-col" style="--i:${i}">` +
      `<rect class="bar" x="${x}" y="${303 - h}" width="${w}" height="${h}" rx="3">` +
      `<title>${esc(l)}: ${values[i].toLocaleString(undefined, { maximumFractionDigits: 2 })}${percent ? '%' : ''}</title></rect>` +
      lines.map((v, j) => `<text class="tick" x="${x + w / 2}" y="${lines.length > 1 ? 313 + j * 14 : 319}" text-anchor="middle">${esc(cut(v))}</text>`).join('') +
      `</g>`;
  });
  return s + '</svg>';
}

/* Horizontal bars for long category lists: the label sits in a left gutter
   instead of under a narrow bar, so nothing truncates or collides. */
function barsH(labels, values, title, xlabel, percent = false) {
  if (!labels.length) return empty();
  const mx = niceMax(values);
  const rowH = 28, rowGap = 9, top = 44, left = 190, right = 770, foot = 34;
  const barMax = right - left;
  const height = top + labels.length * (rowH + rowGap) - rowGap + foot;
  const alt = labels.map((l, i) => `${l}: ${values[i].toLocaleString(undefined, { maximumFractionDigits: 2 })}${percent ? '%' : ''}`).join('; ');
  let s = `<svg class="bars-h" viewBox="0 0 820 ${height}" role="img" aria-label="${esc(title + (alt ? ' — ' + alt : ''))}">`;
  for (let j = 0; j <= 4; j++) {
    const x = left + barMax * j / 4;
    s += `<line class="gridline" x1="${x}" y1="${top - 10}" x2="${x}" y2="${height - foot + 4}"/>` +
      `<text class="tick" x="${x}" y="${top - 18}" text-anchor="middle">${fmt(mx * j / 4)}</text>`;
  }
  labels.forEach((l, i) => {
    const y = top + i * (rowH + rowGap);
    const w = values[i] / mx * barMax;
    const val = values[i].toLocaleString(undefined, { maximumFractionDigits: 2 }) + (percent ? '%' : '');
    s += `<g class="bar-row" style="--i:${i}">` +
      `<text class="tick" x="${left - 12}" y="${y + rowH / 2 + 5}" text-anchor="end">${esc(l)}</text>` +
      `<rect class="bar" x="${left}" y="${y}" width="${Math.max(w, 1).toFixed(1)}" height="${rowH}" rx="2">` +
      `<title>${esc(l + ': ' + val)}</title></rect>` +
      `<text class="tick" x="${(left + w + 8).toFixed(1)}" y="${y + rowH / 2 + 5}">${esc(val)}</text>` +
      `</g>`;
  });
  s += `<text class="axis-label" x="${(left + right) / 2}" y="${height - 8}" text-anchor="middle">${esc(xlabel)}</text>`;
  return s + '</svg>';
}

function scatter(rows, xk, yk, title, xlabel, ylabel, labelKey) {
  let pts = rows.map(r => [N(r[xk]), N(r[yk]), labelKey ? r[labelKey] : null]).filter(p => p[0] !== null && p[1] !== null);
  const total = pts.length;
  if (pts.length > SCATTER_POINT_CAP) {
    const step = Math.ceil(pts.length / SCATTER_POINT_CAP);
    pts = pts.filter((_, i) => i % step === 0);
  }
  if (!pts.length) return { svg: empty(), note: '', sampled: 0, total: 0 };

  let xmin = Math.min(...pts.map(p => p[0])), xmax = Math.max(...pts.map(p => p[0]));
  let ymin = Math.min(...pts.map(p => p[1])), ymax = Math.max(...pts.map(p => p[1]));
  if (xmax === xmin) xmax++;
  if (ymax === ymin) ymax++;
  const X = x => 60 + (x - xmin) / (xmax - xmin) * 730;
  const Y = y => 302 - (y - ymin) / (ymax - ymin) * 250;
  const desc = `${pts.length.toLocaleString()} points plotted; ${xlabel} ${fmt(xmin)} to ${fmt(xmax)}; ${ylabel} ${fmt(ymin)} to ${fmt(ymax)}`;
  let s = axes(title + ' — ' + desc, xlabel, ylabel, 'scatter');
  for (let i = 0; i < 5; i++) {
    const y = 45 + i * 64;
    s += `<line class="gridline" x1="60" y1="${y}" x2="796" y2="${y}"/>` +
      `<text class="tick" x="54" y="${y + 4}" text-anchor="end">${fmt(ymax - (ymax - ymin) * i / 4)}</text>`;
  }
  s += '<line class="axis" x1="60" y1="302" x2="796" y2="302"/>';
  for (let i = 0; i < 5; i++) {
    const x = 60 + i * 182.5;
    s += `<text class="tick" x="${x}" y="317" text-anchor="middle">${fmt(xmin + (xmax - xmin) * i / 4)}</text>`;
  }
  pts.forEach((p, i) => {
    s += `<circle class="dot" cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="3" style="--i:${i}">` +
      `<title>${esc((p[2] ? p[2] + ': ' : '') + Number(p[0].toFixed(2)) + ', ' + Number(p[1].toFixed(2)))}</title></circle>`;
  });
  return { svg: s + '</svg>', sampled: pts.length, total, points: pts };
}

/* ------------------------------------------------------------------ *
 * Map
 * ------------------------------------------------------------------ */

/* Matches scripts/build_boroughs.py exactly: equirectangular, cos(lat)
   corrected, fitted to a 760 × 760 plot box inside an 820 × 820 viewBox. */
const MAP = { x0: 34.285, y0: 30, s: 1652.1739, kx: 0.758021, lonMin: -74.28, latMax: 40.94 };
const mapX = lon => MAP.x0 + (lon - MAP.lonMin) * MAP.kx * MAP.s;
const mapY = lat => MAP.y0 + (MAP.latMax - lat) * MAP.s;

function mapSvg(h, m, meterLabel) {
  const pts = [
    ...m.map(r => [N(r.lon), N(r.lat), true, r.borough]),
    ...h.map(r => [N(r.lon), N(r.lat), false, r.borough])
  ].filter(p => p[0] !== null && p[1] !== null);

  if (!pts.length) return { svg: empty(), step: 1, drawn: 0, total: 0, counts: [] };

  const step = Math.max(1, Math.ceil(pts.length / MAP_POINT_BUDGET));
  const drawn = pts.filter((_, i) => i % step === 0);

  const label = `Housing records are circles, ${meterLabel.toLowerCase()} are squares, drawn over simplified borough boundaries. ` +
    `${drawn.length.toLocaleString()} of ${pts.length.toLocaleString()} records are shown (every ${step === 1 ? 'record' : step + 'th record'}).`;

  let s = `<svg viewBox="0 0 820 820" role="img" aria-label="${esc(label)}">`;
  s += '<rect class="map-ground" x="0" y="0" width="820" height="820" rx="2"/>';

  if (typeof NYC_BOROUGHS !== 'undefined') {
    s += '<g>' + NYC_BOROUGHS.map(b => `<path class="borough" d="${b.d}"/>`).join('') + '</g>';
  }

  s += '<g class="map-points">' + drawn.filter(p => p[2]).map(p => {
    const cx = mapX(p[0]), cy = mapY(p[1]);
    return `<rect class="dot secondary" x="${(cx - 1.5).toFixed(1)}" y="${(cy - 1.5).toFixed(1)}" width="3" height="3"/>`;
  }).join('') + '</g>';

  s += '<g class="map-points">' + drawn.filter(p => !p[2]).map(p => {
    return `<circle class="dot" cx="${mapX(p[0]).toFixed(1)}" cy="${mapY(p[1]).toFixed(1)}" r="2.4"/>`;
  }).join('') + '</g>';

  if (typeof NYC_BOROUGHS !== 'undefined') {
    s += '<g>' + NYC_BOROUGHS.map(b =>
      `<text class="borough-label" x="${b.label[0]}" y="${b.label[1]}">${esc(b.name)}</text>`
    ).join('') + '</g>';
  }

  s += '</svg>';

  const counts = BOROUGHS.map(b => {
    const hs = drawn.filter(p => !p[2] && p[3] === b).length;
    const ms = drawn.filter(p => p[2] && p[3] === b).length;
    return [b, hs, ms];
  });

  return { svg: s, step, drawn: drawn.length, total: pts.length, counts, label };
}

/* ------------------------------------------------------------------ *
 * Heatmap
 * ------------------------------------------------------------------ */

const HEAT = { left: 100, top: 44, cw: 38, ch: 40, gapx: 2, gapy: 3 };
const HEAT_MIN_SAMPLE = 10;
const heatBucket = share => (share < 0.5 ? 1 : share < 0.6 ? 2 : share < 0.7 ? 3 : share < 0.8 ? 4 : 5);

function heatmap(h) {
  const years = [...new Set(h.map(r => r.completion_year).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  if (!years.length) return null;

  const cell = new Map();
  h.forEach(r => {
    const y = r.completion_year, b = r.borough;
    if (!y || !b) return;
    const key = b + '|' + y;
    const c = cell.get(key) || { total: 0, valid: 0, near: 0 };
    c.total++;
    const v = N(r.near_meter);
    if (v !== null) { c.valid++; if (v > 0) c.near++; }
    cell.set(key, c);
  });

  const { left, top, cw, ch, gapx, gapy } = HEAT;
  const width = 640;
  const rowsPresent = BOROUGHS.filter(b => h.some(r => r.borough === b));
  const height = top + rowsPresent.length * (ch + gapy) + 6;

  let s = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Share of housing records near an active meter, by borough and completion year. Every cell is labelled with its percentage, and a data table follows the chart.">`;

  years.forEach((y, i) => {
    s += `<text class="heat-head" x="${(left + i * (cw + gapx) + cw / 2).toFixed(1)}" y="${top - 14}">${esc(y)}</text>`;
  });

  rowsPresent.forEach((b, j) => {
    const y = top + j * (ch + gapy);
    s += `<text class="heat-row" x="${left - 8}" y="${y + ch / 2 + 4}" text-anchor="end">${esc(b)}</text>`;
    years.forEach((yr, i) => {
      const x = left + i * (cw + gapx);
      const c = cell.get(b + '|' + yr);
      const usable = c && c.valid >= HEAT_MIN_SAMPLE;
      const share = usable ? c.near / c.valid : null;
      const bucket = share === null ? 0 : heatBucket(share);
      const fill = bucket ? `var(--heat-${bucket})` : 'var(--heat-empty)';
      const ink = bucket ? `var(--heat-${bucket}-ink)` : 'var(--note)';
      const tip = c
        ? `${b} ${yr}: ${usable ? pct(share) + ' of ' + c.valid + ' usable records' : 'fewer than ' + HEAT_MIN_SAMPLE + ' usable records (' + c.valid + ')'}`
        : `${b} ${yr}: no housing records`;
      s += `<rect class="heat-cell" x="${x}" y="${y}" width="${cw}" height="${ch}" rx="2" style="fill:${fill};--i:${i}">` +
        `<title>${esc(tip)}</title></rect>` +
        `<text class="heat-label" x="${(x + cw / 2).toFixed(1)}" y="${y + ch / 2 + 4}" style="fill:${ink};--i:${i}">${share === null ? '–' : Math.round(share * 100) + '%'}</text>`;
    });
  });

  s += '</svg>';
  return { svg: s, years, cell, rowsPresent };
}

/* ------------------------------------------------------------------ *
 * Data table specs
 * ------------------------------------------------------------------ */

/* Numbers arrive as formatted strings ("9,551", "75.7%", "BK-05"), so sorting
   strips the formatting first and falls back to a numeric-aware text compare. */
function sortValue(v) {
  const s = String(v).replace(/[,\s%]/g, '');
  const n = Number(s);
  return s !== '' && Number.isFinite(n) ? n : null;
}

function tableHtml(spec, sort) {
  const rows = spec.rows.slice();
  let allNumeric = false;

  if (sort) {
    const col = sort.col;
    allNumeric = rows.every(r => sortValue(r[col]) !== null);
    rows.sort((a, b) => {
      const av = allNumeric ? sortValue(a[col]) : String(a[col]);
      const bv = allNumeric ? sortValue(b[col]) : String(b[col]);
      let cmp;
      if (av === null || bv === null) cmp = av === null ? 1 : -1;
      else if (allNumeric) cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === 'desc' ? -cmp : cmp;
    });
  }

  const head = spec.head.map((h, i) => {
    const active = sort && sort.col === i;
    const mark = active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕';
    return `<th scope="col" aria-sort="${active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}">` +
      `<button type="button" class="sort-btn${active ? ' is-sorted' : ''}" data-col="${i}">` +
      `${esc(h)}<span class="sort-mark" aria-hidden="true">${mark}</span></button></th>`;
  }).join('');
  const body = rows.map(r => '<tr>' + r.map(c => `<td>${esc(c)}</td>`).join('') + '</tr>').join('');
  return `<div class="table-wrap"><table><caption>${esc(spec.caption)}</caption>` +
    `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function sampleNote(sampled, total) {
  return sampled < total ? ` The table lists the first ${sampled.toLocaleString()} of ${total.toLocaleString()} plotted points.` : '';
}

/* ------------------------------------------------------------------ *
 * The twelve charts
 * ------------------------------------------------------------------ */

function q01(h, m) {
  const labels = applied.borough === 'ALL' ? BOROUGHS : [applied.borough];
  const boroOk = r => applied.borough === 'ALL' || r.borough === applied.borough;
  const base = D.buildings.filter(boroOk);
  const activeMeters = D.meters.filter(r => boroOk(r) && String(r.status).toUpperCase() === 'ACTIVE');

  const rows = labels.map(b => {
    const units = base.filter(r => r.borough === b).reduce((a, r) => a + (N(r.all_counted_units) || 0), 0);
    const active = activeMeters.filter(r => r.borough === b).length;
    return [b, active, units, units ? active / units * 1000 : 0];
  });

  return {
    svg: bars(rows.map(r => r[0]), rows.map(r => r[3]), 'Active meters per 1,000 affordable units', 'Borough', 'Meters per 1,000 units'),
    note: 'Active meters divided by all counted affordable units in each borough. Only the borough filter applies: meters are a current snapshot with no completion year, so filtering by year, construction type or meter status would make this stock ratio meaningless.',
    table: {
      caption: 'Active meters, counted affordable units and the resulting ratio per borough.',
      head: ['Borough', 'Active meters', 'Affordable units', 'Meters per 1,000'],
      rows: rows.map(r => [r[0], r[1].toLocaleString(), Math.round(r[2]).toLocaleString(), r[3].toFixed(1)])
    }
  };
}

function q02(h) {
  const heat = heatmap(h);
  if (!heat) return { svg: empty(), note: '' };

  const rows = [];
  heat.rowsPresent.forEach(b => heat.years.forEach(y => {
    const c = heat.cell.get(b + '|' + y);
    if (!c || c.valid < HEAT_MIN_SAMPLE) return;
    rows.push([b, y, pct(c.near / c.valid), c.valid.toLocaleString()]);
  }));

  const legend = '<ul class="map-legend heat-legend">' +
    [['< 50%', 1], ['50–60%', 2], ['60–70%', 3], ['70–80%', 4], ['80%+', 5]]
      .map(([label, n]) => `<li><span class="swatch heat-swatch" style="background:var(--heat-${n})"></span>${label}</li>`).join('') +
    '<li><span class="swatch heat-swatch" style="background:var(--heat-empty)"></span>under 10 records</li>' +
    '</ul>';

  return {
    svg: heat.svg,
    legend,
    note: 'Each cell is the share of housing records in that borough and completion year with at least one active meter in the 7 × 7 window. Cells are labelled, so the pattern does not depend on colour alone. A dash means fewer than 10 usable records — one record would move that share by tens of points — which mostly affects Staten Island and the earliest years; those records still appear in every other view.',
    table: {
      caption: 'Share of housing records near an active meter, by borough and completion year. Cells under 10 usable records are omitted.',
      head: ['Borough', 'Year', 'Near an active meter', 'Usable records'],
      rows
    }
  };
}

function q03(h) {
  const types = ['New Construction', 'Preservation'];
  const groups = types.map(t => h.filter(r => r.reporting_construction_type === t));
  const labels = ['New construction', 'Preservation'];
  const medians = groups.map(a => {
    const v = a.map(r => N(r.meters_nearby)).filter(x => x !== null).sort((x, y) => x - y);
    return v.length ? v[Math.floor(v.length / 2)] : 0;
  });
  return {
    svg: bars(labels, medians, 'Median nearby active-meter counts', 'Construction type', 'Median meter count'),
    note: 'For each construction type, bar height is the median nearby active-meter count.',
    table: {
      caption: 'Records and median nearby active meters by construction type.',
      head: ['Construction type', 'Records', 'Median nearby meters'],
      rows: types.map((t, i) => [t, groups[i].length.toLocaleString(), fmt(medians[i])])
    }
  };
}

function q04(h) {
  const r = scatter(h, 'share_3br_plus', 'meters_nearby', 'Bedroom composition and nearby active meters', 'Share of counted units with 3+ bedrooms', 'Nearby active meters');
  return {
    svg: r.svg,
    note: 'Only records with a known three-bedroom share and a proximity count appear.' + sampleNote(r.sampled, r.total),
    table: r.points ? {
      caption: 'Plotted points: three-bedroom share and nearby active meters.',
      head: ['3+ bedroom share', 'Nearby active meters'],
      rows: r.points.slice(0, TABLE_POINT_CAP).map(p => [(p[0] * 100).toFixed(1) + '%', p[1].toLocaleString()])
    } : null
  };
}

function q05(h) {
  const cols = ['share_eli', 'share_vli', 'share_low', 'share_moderate', 'share_middle', 'share_other_income'];
  const labels = ['Extremely low', 'Very low', 'Low', 'Moderate', 'Middle', 'Other'];
  const counts = [];
  const vals = cols.map((c, i) => {
    const a = h.filter(r => N(r[c]) !== null && N(r[c]) > 0);
    counts[i] = a.length;
    const v = a.map(r => N(r.meters_nearby)).filter(x => x !== null);
    return v.length ? v.reduce((u, x) => u + x, 0) / v.length : 0;
  });
  return {
    svg: bars(labels, vals, 'Mean nearby active meters for records reporting each income band', 'Income category', 'Mean nearby active meters'),
    note: 'Compares proximity counts among records with a positive reported share in each category; “other” is separate.',
    table: {
      caption: 'Records reporting each income band and their mean nearby active meters.',
      head: ['Income band', 'Records', 'Mean nearby meters'],
      rows: labels.map((l, i) => [l, counts[i].toLocaleString(), vals[i].toFixed(2)])
    }
  };
}

function q06(h) {
  const grouped = group(h, 'cb_id');
  const rows = Object.entries(grouped).map(([cb, a]) => {
    const withProx = a.filter(r => N(r.meters_nearby) !== null);
    return {
      cb_id: cb,
      borough: a[0].borough,
      new_units: a.reduce((v, r) => v + (N(r.reporting_construction_type === 'New Construction' ? r.all_counted_units : 0) || 0), 0),
      avg: withProx.length ? withProx.map(r => N(r.meters_nearby)).reduce((x, y) => x + y, 0) / withProx.length : 0
    };
  }).sort((a, b) => b.new_units - a.new_units);

  const r = scatter(rows, 'new_units', 'avg', 'New affordable units and nearby meters by community board', 'New construction counted units', 'Average nearby active meters', 'cb_id');
  return {
    svg: r.svg,
    note: 'One point per community board. Boards with more new units do not consistently sit closer to meters.',
    table: {
      caption: 'Community boards ranked by new construction units.',
      head: ['Community board', 'Borough', 'New units', 'Average nearby meters'],
      rows: rows.map(b => [b.cb_id, b.borough, Math.round(b.new_units).toLocaleString(), b.avg.toFixed(1)])
    }
  };
}

function q07(h, m) {
  const selected = applied.status === 'ALL' ? m.filter(r => String(r.status).toUpperCase() === 'ACTIVE') : m;
  const meterLabel = applied.status === 'ALL' ? 'Active meters' : `${applied.status} meters`;
  const map = mapSvg(h, selected, meterLabel);

  if (!map.counts) {
    return { svg: map.svg, wide: true, side: '', table: null };
  }

  const side =
    '<div><h4>Legend</h4><ul class="map-legend">' +
    '<li><span class="swatch"></span>Housing record</li>' +
    `<li><span class="swatch meter"></span>${esc(meterLabel)}</li></ul></div>` +
    `<div><h4>Sampling</h4><p class="chart-note">${map.step === 1
      ? `All ${map.total.toLocaleString()} records with usable coordinates are drawn.`
      : `Every ${map.step}${map.step === 2 ? 'nd' : map.step === 3 ? 'rd' : 'th'} record is drawn, ${map.drawn.toLocaleString()} of ${map.total.toLocaleString()}, so the page stays responsive. Clustering is representative, not an exact count.`}</p></div>` +
    '<div><h4>Reading it</h4><p class="chart-note">Borough boundaries are simplified outlines, not survey geometry. Overlapping points are expected: several records can share an address.</p></div>';

  return {
    svg: map.svg,
    wide: true,
    side,
    table: {
      caption: 'Records drawn on the map, by borough.',
      head: ['Borough', 'Housing drawn', 'Meters drawn'],
      rows: map.counts.map(c => [c[0], c[1].toLocaleString(), c[2].toLocaleString()])
    }
  };
}

function q08(h, m) {
  const statuses = ['ACTIVE', 'INACTIVE', 'UNKNOWN'];
  const groups = ['Far', 'Near'];
  const labels = [], values = [], rows = [];
  groups.forEach((g, j) => {
    const a = m.filter(r => N(r.near_new_housing) !== null && (N(r.near_new_housing) > 0) === Boolean(j));
    statuses.forEach(st => {
      const count = a.filter(r => (r.status || '').toUpperCase() === st || (st === 'UNKNOWN' && !r.status)).length;
      labels.push(`${g} · ${st.toLowerCase()}`);
      values.push(a.length ? 100 * count / a.length : 0);
      rows.push([g === 'Far' ? 'No new housing nearby' : 'New housing nearby', st, count.toLocaleString(), a.length ? (100 * count / a.length).toFixed(1) + '%' : '–']);
    });
  });
  return {
    svg: bars(labels, values, 'Meter status mix by new-housing proximity', 'Proximity · status', 'Share of meter records (%)', true),
    note: 'Within-group status percentages; unknown statuses are kept as a category.' +
      (applied.status === 'ALL' ? '' : ' Only ' + applied.status + ' meter records are counted because of the meter-status filter.'),
    table: {
      caption: 'Meter status counts and shares, near and far from new affordable housing.',
      head: ['Proximity', 'Status', 'Meters', 'Share'],
      rows
    }
  };
}

function q09(h) {
  const r = scatter(h, 'total_units', 'meters_nearby', 'Housing record size and nearby active meters', 'Total units in record', 'Nearby active meters');
  return {
    svg: r.svg,
    note: 'Record size explains very little of the variation in nearby meters.' + sampleNote(r.sampled, r.total),
    table: r.points ? {
      caption: 'Plotted points: total units and nearby active meters.',
      head: ['Total units', 'Nearby active meters'],
      rows: r.points.slice(0, TABLE_POINT_CAP).map(p => [p[0].toLocaleString(), p[1].toLocaleString()])
    } : null
  };
}

function q10(h, m) {
  const grouped = {};
  let skipped = 0;
  m.forEach(r => {
    if (!r.time_limit_group) { skipped++; return; }
    const k = `${r.time_limit_group.replace(/\s*\(all day\)/, '')} · ${N(r.near_housing) > 0 ? 'near' : 'far'}`;
    grouped[k] = (grouped[k] || 0) + 1;
  });
  const keys = Object.keys(grouped).sort((a, b) => grouped[b] - grouped[a]).slice(0, 15);
  return {
    svg: barsH(keys, keys.map(k => grouped[k]), 'Meter time-limit groups by housing proximity', 'Meter records'),
    note: 'All-day meters are folded into the 7+ hr group.' + (skipped ? ' ' + skipped.toLocaleString() + ' meter records with no time-limit value are omitted.' : ''),
    table: {
      caption: 'Meter records by time-limit group and housing proximity.',
      head: ['Time limit · proximity', 'Meters'],
      rows: keys.map(k => [k, grouped[k].toLocaleString()])
    }
  };
}

function q11(h) {
  const r = scatter(h, 'affordable_share', 'meters_nearby', 'Affordable-unit share and nearby active meters', 'Affordable units / total units', 'Nearby active meters');
  return {
    svg: r.svg,
    note: 'A weak negative association: records with a higher affordable share sit slightly farther from active meters.' + sampleNote(r.sampled, r.total),
    table: r.points ? {
      caption: 'Plotted points: affordable-unit share and nearby active meters.',
      head: ['Affordable share', 'Nearby active meters'],
      rows: r.points.slice(0, TABLE_POINT_CAP).map(p => [(p[0] * 100).toFixed(1) + '%', p[1].toLocaleString()])
    } : null
  };
}

function q12(h) {
  const a = h.filter(r => N(r.duration_days) !== null && N(r.near_meter) !== null);
  const labels = ['No active meter nearby', 'Active meter nearby'];
  const groups = [0, 1].map(j => {
    const x = a.filter(r => (N(r.near_meter) > 0) === Boolean(j)).map(r => N(r.duration_days)).sort((u, v) => u - v);
    return { n: x.length, median: x.length ? x[Math.floor(x.length / 2)] : 0 };
  });
  return {
    svg: bars(labels, groups.map(g => g.median), 'Median project duration by active-meter proximity', 'Proximity group', 'Median duration (days)'),
    note: 'Median duration among records with both dates and a known proximity value. Records without coordinates have no proximity classification and are excluded rather than treated as unmetered.',
    table: {
      caption: 'Records and median project duration by active-meter proximity.',
      head: ['Proximity group', 'Records', 'Median duration (days)'],
      rows: labels.map((l, i) => [l, groups[i].n.toLocaleString(), fmt(groups[i].median)])
    }
  };
}

const builders = [q01, q02, q03, q04, q05, q06, q07, q08, q09, q10, q11, q12];

/* ------------------------------------------------------------------ *
 * Card assembly
 * ------------------------------------------------------------------ */

function group(rows, key) {
  const out = {};
  rows.forEach(r => {
    const k = r[key] || 'Unknown';
    (out[k] = out[k] || []).push(r);
  });
  return out;
}

function makeChart(i, h, m) {
  const built = builders[i](h, m) || {};
  const id = 'q' + String(i + 1).padStart(2, '0');
  const wide = built.wide ? ' chart-panel--wide' : '';

  tables[i] = built.table || null;

  const dataBlock = built.table
    ? `<details class="chart-data" data-idx="${i}"><summary>View data — ${built.table.rows.length.toLocaleString()} rows</summary></details>`
    : '';

  const head =
    `<div class="chart-heading"><span class="q-tab">Q${String(i + 1).padStart(2, '0')}</span>` +
    `<div class="chart-heading-text"><h3>${esc(questions[i][0])}</h3>` +
    `<p class="chart-byline">${esc(authors[i])}</p></div></div>` +
    `<p class="chart-description">${esc(questions[i][1])}</p>`;

  const body = built.wide
    ? `<div class="wide-body"><div class="chart">${built.svg}</div><div class="wide-side">${built.side || ''}${dataBlock}</div></div>`
    : `<div class="chart">${built.svg}</div>${built.legend || ''}<p class="chart-note">${esc(built.note || '')}</p>${dataBlock}`;

  return `<article class="panel chart-panel${wide}" id="${id}">${head}${body}</article>`;
}

/* ------------------------------------------------------------------ *
 * Borough comparison
 *
 * A reference view, not a thirteenth question: it reads the totals in
 * borough_summary.csv and ignores the filter panel, so a ratio always
 * has one population on both sides.
 * ------------------------------------------------------------------ */

const COMPARE_DEFAULT = { a: 'QUEENS', b: 'BRONX' };

let compareA = COMPARE_DEFAULT.a;
let compareB = COMPARE_DEFAULT.b;

const compareMetrics = [
  ['affordable_units', 'Affordable units', v => v.toLocaleString(undefined, { maximumFractionDigits: 0 })],
  ['buildings', 'Housing records', v => v.toLocaleString(undefined, { maximumFractionDigits: 0 })],
  ['meters_active', 'Active meters', v => v.toLocaleString(undefined, { maximumFractionDigits: 0 })],
  ['meters_per_1000_units', 'Active meters per 1,000 units', v => v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })],
  ['share_near_meter', 'Records near an active meter', pct],
  ['avg_meters_nearby', 'Active meters within the window, average', v => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })]
];

const COMPARE_KEY_METRIC = 3;

function boroughRow(name) {
  return (D.borough || []).find(r => r.borough === name) || null;
}

function compareRatio(va, vb, nameA, nameB) {
  if (va == null || vb == null || !(va > 0) || !(vb > 0)) return null;
  return va >= vb ? { name: nameA, value: va / vb } : { name: nameB, value: vb / va };
}

function ratioText(v) {
  return v >= 100 ? v.toFixed(0) : v.toFixed(1);
}

function compareBodyHtml(a, b) {
  const ra = boroughRow(a);
  const rb = boroughRow(b);
  const val = (row, key) => (row ? N(row[key]) : null);

  const keyMetric = compareMetrics[COMPARE_KEY_METRIC];
  const ka = val(ra, keyMetric[0]);
  const kb = val(rb, keyMetric[0]);
  const keyRatio = compareRatio(ka, kb, a, b);

  /* The number is always the larger over the smaller, so the sentence has to
     name the leader or a swap leaves it pointing at nothing. */
  const lead = keyRatio ? keyRatio.name : null;
  const trail = keyRatio ? (lead === a ? b : a) : null;
  const even = keyRatio && ratioText(keyRatio.value) === '1.0';

  const signLabel = !keyRatio
    ? 'active meters per 1,000 affordable units'
    : even
      ? `as many active meters per 1,000 affordable units in ${esc(lead)} as in ${esc(trail)}`
      : `more active meters per 1,000 affordable units in ${esc(lead)} than in ${esc(trail)}`;

  const sign =
    `<div class="cmp-sign" aria-live="polite">` +
      `<p class="sign-num">${keyRatio ? ratioText(keyRatio.value) + '×' : '–'}</p>` +
      `<p class="sign-label">${signLabel}</p>` +
      `<p class="cmp-pair"><span>${esc(a)} ${ka == null ? '–' : keyMetric[2](ka)}</span>` +
      `<span>${esc(b)} ${kb == null ? '–' : keyMetric[2](kb)}</span></p>` +
    `</div>`;

  const rows = compareMetrics.map(([key, label, format], i) => {
    const va = val(ra, key);
    const vb = val(rb, key);
    const max = Math.max(va || 0, vb || 0) || 1;
    const ratio = compareRatio(va, vb, a, b);

    const line = (name, v, cls) => {
      const share = v == null ? 0 : Math.min(1, v / max);
      return `<div class="cmp-line">` +
        `<span class="cmp-name">${esc(name)}</span>` +
        `<span class="cmp-track"><span class="cmp-fill cmp-fill--${cls}" style="--v:${share.toFixed(4)};--i:${i}"></span></span>` +
        `<span class="cmp-val">${v == null ? '–' : format(v)}</span>` +
      `</div>`;
    };

    return `<div class="cmp-row">` +
      `<div class="cmp-row-head"><h3 class="cmp-label">${esc(label)}</h3>` +
      (ratio
        ? `<span class="cmp-ratio">${esc(ratio.name)} ${ratioText(ratio.value)}×<span class="sr-only"> the other borough</span></span>`
        : '') +
      `</div>` +
      line(a, va, 'a') + line(b, vb, 'b') +
    `</div>`;
  }).join('');

  const table =
    `<details class="chart-data cmp-data"><summary>View data — 6 rows</summary>` +
      `<div class="table-wrap"><table class="cmp-table">` +
        `<caption>Borough totals behind the comparison.</caption>` +
        `<thead><tr><th scope="col">Metric</th><th scope="col">${esc(a)}</th><th scope="col">${esc(b)}</th></tr></thead>` +
        `<tbody>${compareMetrics.map(([key, label, format]) => {
          const va = val(ra, key);
          const vb = val(rb, key);
          return `<tr><td>${esc(label)}</td><td>${va == null ? '–' : format(va)}</td><td>${vb == null ? '–' : format(vb)}</td></tr>`;
        }).join('')}</tbody>` +
      `</table></div>` +
    `</details>`;

  return sign + `<div class="cmp-rows">${rows}</div>` + table;
}

function renderCompare() {
  if (!D.borough || !D.borough.length) return;

  const a = $('#cmp-a');
  const b = $('#cmp-b');

  if (!a.options.length) {
    const options = D.borough
      .map(r => `<option value="${esc(r.borough)}">${esc(r.borough)}</option>`)
      .join('');
    a.innerHTML = options;
    b.innerHTML = options;
  }

  a.value = compareA;
  b.value = compareB;

  /* A and B can never be the same borough, so the other select disables it. */
  [...a.options].forEach(o => { o.disabled = o.value === compareB; });
  [...b.options].forEach(o => { o.disabled = o.value === compareA; });

  $('#compare-body').innerHTML = compareBodyHtml(compareA, compareB);
  writeUrl();
}

$('#cmp-a').addEventListener('change', e => {
  compareA = e.target.value;
  renderCompare();
});

$('#cmp-b').addEventListener('change', e => {
  compareB = e.target.value;
  renderCompare();
});

$('#cmp-swap').addEventListener('click', () => {
  const held = compareA;
  compareA = compareB;
  compareB = held;

  const button = $('#cmp-swap');
  button.classList.add('is-flipping');
  setTimeout(() => button.classList.remove('is-flipping'), 240);

  renderCompare();
});

/* ------------------------------------------------------------------ *
 * Chart index
 * ------------------------------------------------------------------ */

function buildIndex() {
  $('#chart-index').innerHTML = questions.map((q, i) => {
    const n = String(i + 1).padStart(2, '0');
    return `<a href="#q${n}" title="${esc(q[0])}">Q${n}</a>`;
  }).join('');
}

let panelObserver;

function watchPanels() {
  const links = [...document.querySelectorAll('#chart-index a')];
  if (!links.length) return;

  if (!panelObserver) {
    panelObserver = new IntersectionObserver(() => {
      let best = null, bestTop = Infinity;
      document.querySelectorAll('.chart-panel').forEach(p => {
        const r = p.getBoundingClientRect();
        if (r.bottom > 80 && r.top < bestTop) { bestTop = r.top; best = p; }
      });
      if (!best) return;
      links.forEach(a => {
        if (a.hash === '#' + best.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }, { threshold: 0 });
  }

  panelObserver.disconnect();
  document.querySelectorAll('.chart-panel').forEach(p => panelObserver.observe(p));
}

/* ------------------------------------------------------------------ *
 * Scrollable chart containers
 * ------------------------------------------------------------------ */

function syncScrollers() {
  document.querySelectorAll('.chart').forEach(el => {
    const over = el.scrollWidth > el.clientWidth + 2;
    const name = el.closest('article')?.querySelector('h3')?.textContent || 'Chart';
    if (over) {
      el.tabIndex = 0;
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', name + ' — scroll sideways to see the full chart');
    } else {
      el.removeAttribute('tabindex');
      el.removeAttribute('role');
      el.removeAttribute('aria-label');
    }
  });
}

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */

function summaryHtml(h, m) {
  const parts = [
    `<em class="sr-only">Twelve charts updated. </em><strong>Report generated</strong>`,
    `<span>${h.length.toLocaleString()} housing records</span>`,
    `<span>${m.length.toLocaleString()} meter records</span>`,
    `<span>${applied.borough === 'ALL' ? 'All boroughs' : esc(applied.borough)}</span>`
  ];
  if (applied.year !== 'ALL') parts.push(`<span>${esc(applied.year)}</span>`);
  if (applied.construction !== 'ALL') parts.push(`<span>${esc(applied.construction)}</span>`);
  if (applied.status !== 'ALL') parts.push(`<span>${esc(applied.status)}</span>`);
  if (applied.term) parts.push(`<span>“${esc(applied.term)}”</span>`);
  if (!h.length && !m.length) parts.push('<span class="summary-warn">Nothing matches these filters — reset to see the city again.</span>');
  return parts.join('');
}

function render() {
  if (!D.buildings) return;

  const grid = $('#charts-grid');
  const h = houses();
  const m = meters();

  grid.classList.add('is-swapping');
  tables = [];
  grid.innerHTML = questions.map((_, i) => makeChart(i, h, m)).join('');
  grid.setAttribute('aria-busy', 'false');

  $('#report-summary').innerHTML = summaryHtml(h, m);
  $('#load-status').textContent = 'Report generated from the integrated CSV exports.';

  /* Commit the dimmed state, then release it so the base transition carries the
     new charts up to full opacity. Without this reflow the browser never paints
     the .55 state, and the fade is cancelled before it starts. */
  void grid.offsetWidth;
  grid.classList.remove('is-swapping');

  syncScrollers();
  watchPanels();
  writeUrl();
  setDirty(false);
}

/* ------------------------------------------------------------------ *
 * URL state
 * ------------------------------------------------------------------ */

function writeUrl() {
  const p = new URLSearchParams();
  if (applied.borough !== 'ALL') p.set('borough', applied.borough);
  if (applied.year !== 'ALL') p.set('year', applied.year);
  if (applied.construction !== 'ALL') p.set('construction', applied.construction);
  if (applied.status !== 'ALL') p.set('status', applied.status);
  if (applied.term) p.set('q', applied.term);
  if (compareA !== COMPARE_DEFAULT.a) p.set('a', compareA);
  if (compareB !== COMPARE_DEFAULT.b) p.set('b', compareB);
  const qs = p.toString();
  try {
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  } catch (e) { /* file:// or blocked history */ }
}

function readUrl() {
  const p = new URLSearchParams(location.search);
  const pick = (key, el) => {
    const v = p.get(key);
    if (v && [...el.options].some(o => o.value === v)) el.value = v;
  };
  pick('borough', $('#borough'));
  pick('year', $('#year'));
  pick('construction', $('#construction'));
  pick('status', $('#status'));

  /* The comparison pair only accepts boroughs in the data, and never the same one twice. */
  const names = (D.borough || []).map(r => r.borough);
  const qa = names.includes(p.get('a')) ? p.get('a') : null;
  const qb = names.includes(p.get('b')) ? p.get('b') : null;
  if (qa && qb && qa !== qb) { compareA = qa; compareB = qb; }
  else if (qa && qa !== compareB) { compareA = qa; }
  else if (qb && qb !== compareA) { compareB = qb; }

  const q = p.get('q');
  if (q) $('#search').value = q;
}

/* ------------------------------------------------------------------ *
 * Search parsing
 * ------------------------------------------------------------------ */

function parseSearch() {
  let raw = $('#search').value.trim().toLowerCase();
  let rest = raw;
  applied = {
    borough: $('#borough').value,
    year: $('#year').value,
    construction: $('#construction').value,
    status: $('#status').value,
    term: ''
  };

  for (const b of ['STATEN ISLAND', 'MANHATTAN', 'BROOKLYN', 'BRONX', 'QUEENS']) {
    const variants = b === 'STATEN ISLAND' ? ['staten island', 'staten'] : [b.toLowerCase()];
    for (const v of variants) {
      if (rest.includes(v)) { applied.borough = b; rest = rest.replace(v, ' '); break; }
    }
  }

  const ym = rest.match(/\b(19|20)\d{2}\b/);
  if (ym && [...$('#year').options].some(o => o.value === ym[0])) {
    applied.year = ym[0];
    rest = rest.replace(ym[0], ' ');
  }

  if (/new construction|new buildings|new build/.test(rest)) {
    applied.construction = 'New Construction';
    rest = rest.replace(/new construction|new buildings|new build/g, ' ');
  } else if (/preservation/.test(rest)) {
    applied.construction = 'Preservation';
    rest = rest.replace('preservation', ' ');
  }

  if (/inactive/.test(rest)) { applied.status = 'INACTIVE'; rest = rest.replace('inactive', ' '); }
  else if (/active/.test(rest)) { applied.status = 'ACTIVE'; rest = rest.replace('active', ' '); }

  applied.term = rest
    .replace(/\b(building|buildings|housing|meters|meter|near|and|in|the|a|for)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  $('#borough').value = applied.borough;
  $('#year').value = applied.year;
  $('#construction').value = applied.construction;
  $('#status').value = applied.status;
}

/* ------------------------------------------------------------------ *
 * Filters changed but not applied
 * ------------------------------------------------------------------ */

function setDirty(on) {
  $('#stale-note').hidden = !on;
}

['#borough', '#year', '#construction', '#status'].forEach(sel => {
  $(sel).addEventListener('change', () => setDirty(true));
});
$('#search').addEventListener('input', () => setDirty(true));

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

function exportStatus(message) {
  $('#export-status').textContent = message;
  setTimeout(() => {
    if ($('#export-status').textContent === message) $('#export-status').textContent = '';
  }, 4000);
}

$('#download-housing').addEventListener('click', () => {
  if (!D.buildings) return;
  const rows = houses();
  if (!rows.length) { exportStatus('No housing records match these filters.'); return; }
  download('nyc-housing-filtered.csv', toCsv(rows));
  exportStatus(`${rows.length.toLocaleString()} housing records exported.`);
});

$('#download-meters').addEventListener('click', () => {
  if (!D.meters) return;
  const rows = meters();
  if (!rows.length) { exportStatus('No meter records match these filters.'); return; }
  download('nyc-meters-filtered.csv', toCsv(rows));
  exportStatus(`${rows.length.toLocaleString()} meter records exported.`);
});

$('#copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    exportStatus('Link copied — it reopens with these filters.');
  } catch (e) {
    exportStatus('Copy failed. The filters are already in the address bar.');
  }
});

/* ------------------------------------------------------------------ *
 * Controls
 * ------------------------------------------------------------------ */

$('#generate').addEventListener('click', () => { parseSearch(); render(); });

$('#search').addEventListener('keydown', e => {
  if (e.key === 'Enter') { parseSearch(); render(); }
});

$('#reset').addEventListener('click', () => {
  ['#borough', '#year', '#construction', '#status'].forEach(s => { $(s).value = 'ALL'; });
  $('#search').value = '';
  parseSearch();
  render();
});

document.querySelectorAll('.search-examples .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    $('#search').value = chip.dataset.query;
    parseSearch();
    render();
  });
});

$('#print-report').addEventListener('click', () => window.print());

/* "/" jumps to search from anywhere; Escape leaves the field. */
addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    $('#search').focus();
    $('#search').select();
  } else if (e.key === 'Escape' && e.target === $('#search')) {
    $('#search').blur();
  }
});

/* ------------------------------------------------------------------ *
 * Sortable data tables
 * ------------------------------------------------------------------ */

$('#charts-grid').addEventListener('click', e => {
  const button = e.target.closest('.sort-btn');
  if (!button) return;
  const details = button.closest('details.chart-data');
  const spec = details && tables[Number(details.dataset.idx)];
  if (!spec) return;

  const col = Number(button.dataset.col);
  const prev = details._sort;
  const dir = prev && prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc';
  details._sort = { col, dir };

  const wrap = details.querySelector('.table-wrap');
  if (wrap) wrap.outerHTML = tableHtml(spec, details._sort);
});

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */

const root = document.documentElement;
const themeToggle = $('#theme-toggle');

function syncThemeControls() {
  const dark = root.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  themeToggle.querySelector('span').textContent = dark ? 'Light' : 'Dark';
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    m.setAttribute('content', dark ? '#0f1416' : '#f2f4f3');
  });
}

function storeTheme(theme) {
  try { localStorage.setItem('nyc-theme', theme); } catch (e) { /* blocked */ }
}

themeToggle.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  const commit = () => { root.dataset.theme = next; storeTheme(next); syncThemeControls(); };

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) { commit(); return; }

  const r = themeToggle.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  root.style.setProperty('--tx', x + 'px');
  root.style.setProperty('--ty', y + 'px');
  root.style.setProperty('--tr', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
  document.startViewTransition(commit);
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  let stored = null;
  try { stored = localStorage.getItem('nyc-theme'); } catch (err) { /* blocked */ }
  if (stored) return;
  root.dataset.theme = e.matches ? 'dark' : 'light';
  syncThemeControls();
});

syncThemeControls();

/* ------------------------------------------------------------------ *
 * Data tables, lazily filled on first open
 * ------------------------------------------------------------------ */

$('#charts-grid').addEventListener('toggle', e => {
  const details = e.target.closest('details.chart-data');
  if (!details || !details.open || details.dataset.filled) return;
  const spec = tables[Number(details.dataset.idx)];
  if (!spec) return;
  details.insertAdjacentHTML('beforeend', tableHtml(spec));
  details.dataset.filled = '1';
}, true);

/* ------------------------------------------------------------------ *
 * Hero count-up
 * ------------------------------------------------------------------ */

let countRun = 0;

function countTarget(el) {
  return Number(el.dataset.count);
}

function countText(el, v) {
  const decimals = Number(el.dataset.decimals || 0);
  return v.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function settleCounts() {
  countRun++;
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = countTarget(el);
    if (Number.isFinite(target)) el.textContent = countText(el, target);
  });
}

function countUp() {
  const run = ++countRun;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = countTarget(el);
    if (reduce || !Number.isFinite(target)) { el.textContent = countText(el, target); return; }

    const duration = 900;
    const start = performance.now();
    const tick = now => {
      if (run !== countRun) return;
      const t = Math.min(1, (now - start) / duration);
      el.textContent = countText(el, target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/* Printing mid-animation would put a half-counted figure on paper. */
addEventListener('beforeprint', settleCounts);

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

buildIndex();
countUp();

Promise.all(files.map(async f => [f, csv(await (await fetch(`../Data/${f}.csv`)).text())]))
  .then(entries => {
    const loaded = Object.fromEntries(entries);
    D = {
      borough: loaded.borough_summary,
      cb: loaded.community_board_summary,
      year: loaded.year_summary,
      buildings: loaded.buildings_integrated,
      meters: loaded.meters_integrated
    };

    const years = [...new Set(D.buildings.map(r => r.completion_year).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b));
    years.forEach(y => $('#year').insertAdjacentHTML('beforeend', `<option value="${esc(y)}">${esc(y)}</option>`));

    readUrl();
    $('#load-status').textContent = 'Data ready · select filters or search, then generate a report';
    parseSearch();
    render();
    renderCompare();
  })
  .catch(e => {
    $('#load-status').textContent = 'Unable to load CSVs. Start the server from the project root as described in README.';
    $('#charts-grid').innerHTML = '<div class="panel empty">The dashboard needs access to the CSV files in the Data folder.</div>';
    $('#charts-grid').setAttribute('aria-busy', 'false');
    $('#compare-body').innerHTML = '<p class="empty">The comparison needs the CSV files in the Data folder.</p>';
    console.error(e);
  });

let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(syncScrollers, 150);
});
