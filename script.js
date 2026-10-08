'use strict';

const STORAGE_KEY = 'classHoursManager_v1';
const DEFAULT_CLASSES = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'];

const $ = (id) => document.getElementById(id);

const state = loadState();
let toastTimer = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { teacherName: '', classes: [...DEFAULT_CLASSES], records: [] };
    const parsed = JSON.parse(raw);
    return {
      teacherName: typeof parsed.teacherName === 'string' ? parsed.teacherName : '',
      classes: Array.isArray(parsed.classes) && parsed.classes.length ? parsed.classes : [...DEFAULT_CLASSES],
      records: Array.isArray(parsed.records) ? parsed.records : []
    };
  } catch (error) {
    console.warn('保存データの読み込みに失敗しました。初期状態で起動します。', error);
    return { teacherName: '', classes: [...DEFAULT_CLASSES], records: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(dateString) {
  const [y, m, d] = dateString.split('-');
  return `${y}/${m}/${d}`;
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function renderClassSelect() {
  const select = $('classSelect');
  const current = select.value;
  select.innerHTML = '';
  state.classes.forEach((className) => {
    const option = document.createElement('option');
    option.value = className;
    option.textContent = className;
    select.appendChild(option);
  });
  if (state.classes.includes(current)) select.value = current;
}

function renderSettingsClasses() {
  const list = $('classSettingsList');
  list.innerHTML = '';
  if (!state.classes.length) {
    list.innerHTML = '<div class="empty">登録されているクラスがありません。</div>';
    return;
  }

  state.classes.forEach((className) => {
    const item = document.createElement('div');
    item.className = 'class-setting-item';
    item.innerHTML = `
      <span class="class-setting-name"></span>
      <button class="remove-class" type="button" data-class=""></button>
    `;
    item.querySelector('.class-setting-name').textContent = className;
    const removeButton = item.querySelector('.remove-class');
    removeButton.dataset.class = className;
    removeButton.textContent = '削除';
    list.appendChild(item);
  });
}

function renderSummary() {
  const list = $('summaryList');
  list.innerHTML = '';
  $('classCount').textContent = `${state.classes.length}クラス`;

  const totals = new Map(state.classes.map((name) => [name, 0]));
  state.records.forEach((record) => {
    if (totals.has(record.className)) totals.set(record.className, totals.get(record.className) + record.hours);
  });
  const max = Math.max(...totals.values(), 1);

  if (!state.classes.length) {
    list.innerHTML = '<div class="empty">設定からクラスを追加してください。</div>';
    return;
  }

  state.classes.forEach((className) => {
    const total = totals.get(className) || 0;
    const item = document.createElement('div');
    item.className = 'summary-item';
    item.innerHTML = `
      <span class="class-chip"></span>
      <div class="bar-track"><div class="bar-fill"></div></div>
      <div class="summary-hours"><strong>${formatHours(total)}</strong> <small>時間</small></div>
    `;
    item.querySelector('.class-chip').textContent = className;
    item.querySelector('.bar-fill').style.width = `${Math.min(100, (total / max) * 100)}%`;
    list.appendChild(item);
  });
}

function renderHistory() {
  const list = $('historyList');
  list.innerHTML = '';
  const records = [...state.records].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    return dateDiff || b.createdAt - a.createdAt;
  });

  if (!records.length) {
    list.innerHTML = '<div class="empty">まだ記録がありません。上から授業時数を入力してください。</div>';
    return;
  }

  records.forEach((record) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-main">
        <span class="history-class"></span>
        <span class="history-date"></span>
      </div>
      <div class="history-actions">
        <span class="history-hours"></span>
        <button class="delete-record" type="button" data-id="" aria-label="この記録を削除">×</button>
      </div>
    `;
    item.querySelector('.history-class').textContent = record.className;
    item.querySelector('.history-date').textContent = formatDate(record.date);
    item.querySelector('.history-hours').textContent = `${formatHours(record.hours)}時間`;
    item.querySelector('.delete-record').dataset.id = record.id;
    list.appendChild(item);
  });
}

function renderToday() {
  const today = getLocalDateString();
  const todayRecords = state.records.filter((record) => record.date === today);
  const total = todayRecords.reduce((sum, record) => sum + record.hours, 0);
  const date = new Date();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  $('todayLabel').textContent = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
  $('todayTotal').textContent = formatHours(total);
}

function formatHours(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function renderTeacherName() {
  const name = state.teacherName.trim();
  $('teacherBadge').textContent = name ? `${name}` : '先生名未設定';
  $('teacherNameInput').value = name;
}

function renderAll() {
  renderTeacherName();
  renderClassSelect();
  renderSettingsClasses();
  renderSummary();
  renderHistory();
  renderToday();
}

function openSettings() {
  $('settingsModal').hidden = false;
  renderTeacherName();
  setTimeout(() => $('teacherNameInput').focus(), 0);
}

function closeSettings() {
  $('settingsModal').hidden = true;
}

$('saveTeacherBtn').addEventListener('click', () => {
  const name = $('teacherNameInput').value.trim();
  state.teacherName = name;
  saveState();
  renderTeacherName();
  showToast(name ? `先生名を「${name}」に設定しました` : '先生名を削除しました');
});

$('recordForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!state.classes.length) {
    showToast('先に設定からクラスを追加してください。');
    openSettings();
    return;
  }

  const className = $('classSelect').value;
  const date = $('dateInput').value;
  const hours = Number($('hoursInput').value);

  if (!className || !date || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
    showToast('クラス・日付・授業時数を正しく入力してください。');
    return;
  }

  state.records.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    className,
    date,
    hours,
    createdAt: Date.now()
  });
  saveState();
  renderAll();
  $('hoursInput').value = '';
  $('hoursInput').focus();
  showToast(`${className}：${formatHours(hours)}時間を記録しました`);
});

$('classForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('classNameInput');
  const className = input.value.trim();
  if (!className) {
    showToast('クラス名を入力してください。');
    return;
  }
  if (state.classes.includes(className)) {
    showToast('そのクラスはすでに登録されています。');
    return;
  }
  state.classes.push(className);
  saveState();
  renderAll();
  $('classSelect').value = className;
  input.value = '';
  showToast(`${className}を追加しました`);
});

$('classSettingsList').addEventListener('click', (event) => {
  const button = event.target.closest('.remove-class');
  if (!button) return;
  const className = button.dataset.class;
  if (!state.classes.includes(className)) return;
  if (!confirm(`「${className}」をクラス設定から削除しますか？\n過去の記録は残ります。`)) return;
  state.classes = state.classes.filter((name) => name !== className);
  saveState();
  renderAll();
  showToast(`${className}を削除しました`);
});

$('historyList').addEventListener('click', (event) => {
  const button = event.target.closest('.delete-record');
  if (!button) return;
  const id = button.dataset.id;
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  if (!confirm(`${record.className}・${formatDate(record.date)}・${formatHours(record.hours)}時間\nこの記録を削除しますか？`)) return;
  state.records = state.records.filter((item) => item.id !== id);
  saveState();
  renderAll();
  showToast('記録を削除しました');
});

$('clearHistoryBtn').addEventListener('click', () => {
  if (!state.records.length) {
    showToast('削除する履歴がありません。');
    return;
  }
  if (!confirm('すべての授業時数記録を削除しますか？\nクラス設定は残ります。')) return;
  state.records = [];
  saveState();
  renderAll();
  showToast('履歴をすべて削除しました');
});

$('settingsBtn').addEventListener('click', openSettings);
$('closeSettingsBtn').addEventListener('click', closeSettings);
$('settingsModal').addEventListener('click', (event) => {
  if (event.target === $('settingsModal')) closeSettings();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('settingsModal').hidden) closeSettings();
});

$('dateInput').value = getLocalDateString();
renderAll();
