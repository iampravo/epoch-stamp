'use strict';

const MS_UNIT_THRESHOLD = 1e11; // numbers above this (in seconds-scale) are almost certainly milliseconds

const epochInput = document.getElementById('epochInput');
const epochUnit = document.getElementById('epochUnit');
const toDateResults = document.getElementById('toDateResults');
const useAsBaseFromDate = document.getElementById('useAsBaseFromDate');

const dateInput = document.getElementById('dateInput');
const dateTz = document.getElementById('dateTz');
const toEpochResults = document.getElementById('toEpochResults');
const useAsBaseFromEpoch = document.getElementById('useAsBaseFromEpoch');

const shiftBase = document.getElementById('shiftBase');
const directionToggle = document.getElementById('directionToggle');
const offsetChips = document.getElementById('offsetChips');
const customAmount = document.getElementById('customAmount');
const customUnit = document.getElementById('customUnit');
const customChipToggle = document.getElementById('customChipToggle');
const shiftResults = document.getElementById('shiftResults');
const useNowAsBase = document.getElementById('useNowAsBase');

const nowResults = document.getElementById('nowResults');

const OFFSETS = [
  { key: '1d', label: '1 day', amount: 1, unit: 'days' },
  { key: '3d', label: '3 days', amount: 3, unit: 'days' },
  { key: '7d', label: '7 days', amount: 7, unit: 'days' },
  { key: '14d', label: '14 days', amount: 14, unit: 'days' },
  { key: '1mo', label: '1 month', amount: 1, unit: 'months' },
  { key: '3mo', label: '3 months', amount: 3, unit: 'months' },
  { key: '6mo', label: '6 months', amount: 6, unit: 'months' },
  { key: '1y', label: '1 year', amount: 1, unit: 'years' },
];

let direction = 'add';
let selectedOffsets = new Set(['7d', '14d', '1mo']);
let customActive = false;

function pad(n) {
  return String(n).padStart(2, '0');
}

function detectUnit(value) {
  return Math.abs(value) >= MS_UNIT_THRESHOLD ? 'ms' : 's';
}

function parseEpochToMs(raw, unitSetting) {
  const trimmed = String(raw).trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  const unit = unitSetting === 'auto' || unitSetting == null ? detectUnit(value) : unitSetting;
  return unit === 'ms' ? value : value * 1000;
}

function formatUTC(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

function formatLocal(ms) {
  const d = new Date(ms);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })} (${tz})`;
}

function formatISO(ms) {
  return new Date(ms).toISOString();
}

function formatRelative(ms) {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const seconds = Math.round(abs / 1000);
  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const months = Math.round(abs / (86400000 * 30.44));
  const years = Math.round(abs / (86400000 * 365.25));

  let text;
  if (seconds < 45) text = 'just now';
  else if (minutes < 60) text = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  else if (hours < 24) text = `${hours} hour${hours === 1 ? '' : 's'}`;
  else if (days < 30) text = `${days} day${days === 1 ? '' : 's'}`;
  else if (months < 12) text = `${months} month${months === 1 ? '' : 's'}`;
  else text = `${years} year${years === 1 ? '' : 's'}`;

  if (text === 'just now') return text;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

function shiftMs(ms, amount, unit, dir) {
  const signed = dir === 'sub' ? -amount : amount;
  const d = new Date(ms);
  switch (unit) {
    case 'minutes': d.setUTCMinutes(d.getUTCMinutes() + signed); break;
    case 'hours': d.setUTCHours(d.getUTCHours() + signed); break;
    case 'days': d.setUTCDate(d.getUTCDate() + signed); break;
    case 'weeks': d.setUTCDate(d.getUTCDate() + signed * 7); break;
    case 'months': d.setUTCMonth(d.getUTCMonth() + signed); break;
    case 'years': d.setUTCFullYear(d.getUTCFullYear() + signed); break;
  }
  return d.getTime();
}

async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = '✓';
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove('copied');
    }, 1200);
  } catch {
    // clipboard API unavailable (e.g. insecure context) - fail silently, nothing to recover
  }
}

function createResultRow({ code, name, value, copyValue }) {
  const row = document.createElement('div');
  row.className = 'result-row';
  row.innerHTML = `
    <div class="result-label">
      <span class="result-code">${code}</span>
      ${name ? `<span class="result-name">${name}</span>` : ''}
    </div>
    <div class="result-right">
      <span class="result-value">${value}</span>
      <button type="button" class="copy-btn" title="copy value" aria-label="copy ${value}">⧉</button>
    </div>
  `;
  row.querySelector('.copy-btn').addEventListener('click', (e) => {
    copyToClipboard(copyValue ?? value, e.currentTarget);
  });
  return row;
}

function renderEmpty(container, message) {
  container.innerHTML = `<p class="empty-state">${message}</p>`;
}

// ---------- right now ----------

function renderNow() {
  const now = Date.now();
  nowResults.innerHTML = '';
  nowResults.appendChild(createResultRow({
    code: 'unix (seconds)',
    value: Math.floor(now / 1000),
  }));
  nowResults.appendChild(createResultRow({
    code: 'unix (milliseconds)',
    value: now,
  }));
  nowResults.appendChild(createResultRow({
    code: 'local',
    value: formatLocal(now),
  }));
}

// ---------- timestamp -> date ----------

function renderToDate() {
  const ms = parseEpochToMs(epochInput.value, epochUnit.value);
  if (ms === null) {
    renderEmpty(toDateResults, 'paste a unix timestamp above 👆');
    return;
  }
  if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) {
    renderEmpty(toDateResults, 'that number is out of range');
    return;
  }
  toDateResults.innerHTML = '';
  toDateResults.appendChild(createResultRow({ code: 'local', value: formatLocal(ms) }));
  toDateResults.appendChild(createResultRow({ code: 'UTC', value: formatUTC(ms) }));
  toDateResults.appendChild(createResultRow({ code: 'ISO 8601', value: formatISO(ms) }));
  toDateResults.appendChild(createResultRow({ code: 'relative', value: formatRelative(ms) }));
}

// ---------- date -> timestamp ----------

function renderToEpoch() {
  const raw = dateInput.value;
  if (!raw) {
    renderEmpty(toEpochResults, 'pick a date &amp; time above 👆');
    return;
  }
  const iso = dateTz.value === 'utc' ? `${raw}Z` : raw;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    renderEmpty(toEpochResults, 'not a valid date');
    return;
  }
  const ms = d.getTime();
  toEpochResults.innerHTML = '';
  toEpochResults.appendChild(createResultRow({ code: 'unix (seconds)', value: Math.floor(ms / 1000) }));
  toEpochResults.appendChild(createResultRow({ code: 'unix (milliseconds)', value: ms }));
}

// ---------- shift time ----------

function renderOffsetChips() {
  offsetChips.innerHTML = '';
  OFFSETS.forEach(({ key, label }) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (selectedOffsets.has(key) ? ' selected' : '');
    chip.textContent = label;
    chip.addEventListener('click', () => {
      if (selectedOffsets.has(key)) selectedOffsets.delete(key);
      else selectedOffsets.add(key);
      renderOffsetChips();
      renderShift();
    });
    offsetChips.appendChild(chip);
  });
}

function renderShift() {
  const baseMs = parseEpochToMs(shiftBase.value, 'auto');
  if (baseMs === null) {
    renderEmpty(shiftResults, 'enter a base timestamp above 👆');
    return;
  }

  const entries = OFFSETS.filter((o) => selectedOffsets.has(o.key));
  if (customActive) {
    const amount = Number(customAmount.value);
    if (Number.isFinite(amount) && amount > 0) {
      entries.push({ key: 'custom', label: `${amount} ${customUnit.value}`, amount, unit: customUnit.value });
    }
  }

  if (entries.length === 0) {
    renderEmpty(shiftResults, 'tap an offset (or add a custom one) 👆');
    return;
  }

  shiftResults.innerHTML = '';
  entries.forEach(({ label, amount, unit }) => {
    const resultMs = shiftMs(baseMs, amount, unit, direction);
    const sign = direction === 'sub' ? '−' : '+';
    const row = createResultRow({
      code: `${sign} ${label}`,
      name: formatUTC(resultMs),
      value: Math.floor(resultMs / 1000),
    });
    shiftResults.appendChild(row);
  });
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function init() {
  const nowSeconds = Math.floor(Date.now() / 1000);

  epochInput.value = String(nowSeconds);
  shiftBase.value = String(nowSeconds);

  const local = new Date();
  local.setMilliseconds(0);
  dateInput.value = new Date(local.getTime() - local.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);

  renderNow();
  setInterval(renderNow, 1000);

  renderToDate();
  epochInput.addEventListener('input', debounce(renderToDate, 100));
  epochUnit.addEventListener('change', renderToDate);

  renderToEpoch();
  dateInput.addEventListener('input', renderToEpoch);
  dateTz.addEventListener('change', renderToEpoch);

  renderOffsetChips();
  renderShift();
  shiftBase.addEventListener('input', debounce(renderShift, 100));

  directionToggle.querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      direction = btn.dataset.dir;
      directionToggle.querySelectorAll('.toggle-btn').forEach((b) => b.classList.toggle('selected', b === btn));
      renderShift();
    });
  });

  customChipToggle.addEventListener('click', () => {
    customActive = !customActive;
    customChipToggle.classList.toggle('selected', customActive);
    renderShift();
  });
  customAmount.addEventListener('input', debounce(() => {
    if (customActive) renderShift();
  }, 100));
  customUnit.addEventListener('change', () => {
    if (customActive) renderShift();
  });

  useNowAsBase.addEventListener('click', () => {
    shiftBase.value = String(Math.floor(Date.now() / 1000));
    renderShift();
  });

  useAsBaseFromDate.addEventListener('click', () => {
    const ms = parseEpochToMs(epochInput.value, epochUnit.value);
    if (ms === null) return;
    shiftBase.value = String(Math.floor(ms / 1000));
    renderShift();
  });

  useAsBaseFromEpoch.addEventListener('click', () => {
    const raw = dateInput.value;
    if (!raw) return;
    const iso = dateTz.value === 'utc' ? `${raw}Z` : raw;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    shiftBase.value = String(Math.floor(d.getTime() / 1000));
    renderShift();
  });
}

init();
