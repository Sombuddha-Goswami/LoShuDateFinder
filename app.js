/* ============================================
   Lo Shu Grid Date Finder — Application Logic v2
   ============================================ */

(() => {
  'use strict';

  // ================================================================
  //  CONSTANTS
  // ================================================================

  // Lo Shu Grid layout (position index → number)
  //   4 | 9 | 2
  //   3 | 5 | 7
  //   8 | 1 | 6
  const LOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const RESULTS_PER_PAGE = 30;

  // Chaldean Name Number chart
  //  1: A I J Q Y
  //  2: B K R
  //  3: C G L S
  //  4: D M T
  //  5: E H N X
  //  6: U V W
  //  7: O Z
  //  8: F P
  const CHALDEAN = {
    A:1, I:1, J:1, Q:1, Y:1,
    B:2, K:2, R:2,
    C:3, G:3, L:3, S:3,
    D:4, M:4, T:4,
    E:5, H:5, N:5, X:5,
    U:6, V:6, W:6,
    O:7, Z:7,
    F:8, P:8
  };

  // ================================================================
  //  STATE
  // ================================================================
  let selectedNumbers = new Set();
  let allResults = [];
  let filteredResults = [];
  let currentPage = 1;
  let currentView = 'grid';

  // ================================================================
  //  DOM ELEMENTS
  // ================================================================

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const tabIndicator = document.getElementById('tabIndicator');

  // Lo Shu tab
  const selectorCells = document.querySelectorAll('.loshu-cell');
  const selectedCountEl = document.getElementById('selectedCount');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const endDateNote = document.getElementById('endDateNote');
  const findBtn = document.getElementById('findBtn');
  const errorMsgEl = document.getElementById('errorMsg');
  const resultsSection = document.getElementById('resultsSection');
  const resultsContainer = document.getElementById('resultsContainer');
  const totalResultsEl = document.getElementById('totalResults');
  const searchRangeEl = document.getElementById('searchRange');
  const paginationEl = document.getElementById('pagination');
  const filterInput = document.getElementById('resultFilter');
  const viewGridBtn = document.getElementById('viewGrid');
  const viewListBtn = document.getElementById('viewList');

  // Chaldean tab
  const nameInput = document.getElementById('nameInput');
  const nameResultEl = document.getElementById('nameResult');
  const letterBreakdownEl = document.getElementById('letterBreakdown');
  const wordTotalsEl = document.getElementById('wordTotals');
  const finalReductionEl = document.getElementById('finalReduction');
  const finalNumberEl = document.getElementById('finalNumber');
  const chartLetterSpans = document.querySelectorAll('.chart-letters span');

  // ================================================================
  //  INIT
  // ================================================================
  function init() {
    setEndDate();
    setupTabListeners();
    setupLoshuListeners();
    setupChaldeanListeners();
    validateForm();
  }

  // ================================================================
  //  TABS
  // ================================================================
  function setupTabListeners() {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });
  }

  function switchTab(tabName) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    tabContents.forEach(tc => tc.classList.toggle('active', tc.id === `tab-${tabName}`));
    tabIndicator.classList.toggle('tab-right', tabName === 'chaldean');
  }

  // ================================================================
  //  LO SHU TAB
  // ================================================================

  function setEndDate() {
    const today = new Date();
    const endDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    endDateInput.value = formatDateISO(endDate);
    endDateNote.textContent = `Auto-calculated: 18 years before today (${formatDateDisplay(endDate)})`;
    startDateInput.max = endDateInput.value;
  }

  function setupLoshuListeners() {
    selectorCells.forEach(cell => {
      cell.addEventListener('click', () => {
        const num = parseInt(cell.dataset.num);
        if (selectedNumbers.has(num)) {
          selectedNumbers.delete(num);
          cell.classList.remove('selected');
        } else {
          selectedNumbers.add(num);
          cell.classList.add('selected');
        }
        selectedCountEl.textContent = selectedNumbers.size;
        validateForm();
      });
    });

    startDateInput.addEventListener('change', validateForm);
    findBtn.addEventListener('click', runSearch);
    filterInput.addEventListener('input', applyFilter);
    viewGridBtn.addEventListener('click', () => setView('grid'));
    viewListBtn.addEventListener('click', () => setView('list'));
  }

  function validateForm() {
    const hasNumbers = selectedNumbers.size > 0;
    const hasStart = startDateInput.value !== '';
    let valid = hasNumbers && hasStart;

    if (hasStart) {
      const start = new Date(startDateInput.value);
      const end = new Date(endDateInput.value);
      if (start > end) {
        valid = false;
        showError('Start date must be before the end date.');
      } else {
        clearError();
      }
    } else {
      clearError();
    }

    findBtn.disabled = !valid;
    return valid;
  }

  // ---- Numerology Calculations ----

  function reduceToSingle(num) {
    while (num > 9) {
      let sum = 0;
      while (num > 0) { sum += num % 10; num = Math.floor(num / 10); }
      num = sum;
    }
    return num;
  }

  function calcMulank(day) { return reduceToSingle(day); }

  function calcBhagyank(day, month, year) {
    return reduceToSingle(digitSum(day) + digitSum(month) + digitSum(year));
  }

  function digitSum(num) {
    let s = 0; num = Math.abs(num);
    while (num > 0) { s += num % 10; num = Math.floor(num / 10); }
    return s;
  }

  function getLoShuNumbers(day, month, year) {
    const present = new Set();
    const dateStr = String(day).padStart(2, '0') + String(month).padStart(2, '0') + String(year);
    for (const ch of dateStr) { const d = parseInt(ch); if (d >= 1 && d <= 9) present.add(d); }
    const mulank = calcMulank(day);
    const bhagyank = calcBhagyank(day, month, year);
    present.add(mulank);
    present.add(bhagyank);
    return { present, mulank, bhagyank };
  }

  function buildLoShuGrid(day, month, year) {
    const counts = new Array(10).fill(0);
    const dateStr = String(day).padStart(2, '0') + String(month).padStart(2, '0') + String(year);
    for (const ch of dateStr) { const d = parseInt(ch); if (d >= 1 && d <= 9) counts[d]++; }
    counts[calcMulank(day)]++;
    counts[calcBhagyank(day, month, year)]++;
    return counts;
  }

  // ---- Search ----

  function runSearch() {
    if (!validateForm()) return;

    const required = new Set(selectedNumbers);
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);

    findBtn.classList.add('loading');
    findBtn.disabled = true;
    allResults = [];
    clearError();

    setTimeout(() => {
      const results = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        const day = current.getDate();
        const month = current.getMonth() + 1;
        const year = current.getFullYear();
        const { present, mulank, bhagyank } = getLoShuNumbers(day, month, year);

        let match = true;
        for (const num of required) {
          if (!present.has(num)) { match = false; break; }
        }

        if (match) {
          results.push({
            date: new Date(current), day, month, year,
            mulank, bhagyank,
            dayName: DAYS_OF_WEEK[current.getDay()],
            present,
            counts: buildLoShuGrid(day, month, year)
          });
        }
        current.setDate(current.getDate() + 1);
      }

      allResults = results;
      filteredResults = results;
      currentPage = 1;
      findBtn.classList.remove('loading');
      findBtn.disabled = false;
      displayResults();
    }, 50);
  }

  // ---- Display Results ----

  function displayResults() {
    resultsSection.style.display = 'block';
    totalResultsEl.textContent = filteredResults.length.toLocaleString();
    searchRangeEl.textContent = `${formatDateDisplay(new Date(startDateInput.value))} → ${formatDateDisplay(new Date(endDateInput.value))}`;

    if (filteredResults.length === 0) {
      resultsContainer.innerHTML = `
        <div class="no-results" style="grid-column: 1 / -1;">
          <div class="no-results-icon">🔍</div>
          <p>No matching dates found for the selected numbers in this range.</p>
        </div>`;
      paginationEl.innerHTML = '';
      return;
    }
    renderPage();
    renderPagination();
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPage() {
    const start = (currentPage - 1) * RESULTS_PER_PAGE;
    const end = Math.min(start + RESULTS_PER_PAGE, filteredResults.length);
    const pageResults = filteredResults.slice(start, end);
    resultsContainer.className = currentView === 'grid' ? 'results-grid' : 'results-list';

    resultsContainer.innerHTML = pageResults.map(r => {
      const miniGrid = renderMiniGrid(r.counts);
      const dateDisplay = formatDateDisplay(r.date);

      if (currentView === 'list') {
        return `<div class="result-item">
          <div class="result-info"><div class="result-date">${dateDisplay}</div><div class="result-day-name">${r.dayName}</div></div>
          <div class="result-nums">
            <div class="num-badge"><span class="num-badge-label">Mulank</span><span class="num-badge-value">${r.mulank}</span></div>
            <div class="num-badge"><span class="num-badge-label">Bhagyank</span><span class="num-badge-value">${r.bhagyank}</span></div>
          </div>${miniGrid}</div>`;
      }
      return `<div class="result-item">
        <div class="result-date">${dateDisplay}</div><div class="result-day-name">${r.dayName}</div>
        <div class="result-nums">
          <div class="num-badge"><span class="num-badge-label">Mulank</span><span class="num-badge-value">${r.mulank}</span></div>
          <div class="num-badge"><span class="num-badge-label">Bhagyank</span><span class="num-badge-value">${r.bhagyank}</span></div>
        </div>${miniGrid}</div>`;
    }).join('');
  }

  function renderMiniGrid(counts) {
    let html = '<div class="mini-loshu">';
    for (let i = 0; i < 9; i++) {
      const num = LOSHU_ORDER[i];
      const count = counts[num];
      const isFilled = count > 0;
      const isHighlighted = isFilled && selectedNumbers.has(num);
      const cls = isHighlighted ? 'highlighted' : (isFilled ? 'filled' : '');
      const display = isFilled ? (count > 1 ? String(num).repeat(count) : num) : '';
      html += `<div class="mini-cell ${cls}">${display}</div>`;
    }
    html += '</div>';
    return html;
  }

  // ---- Pagination ----

  function renderPagination() {
    const totalPages = Math.ceil(filteredResults.length / RESULTS_PER_PAGE);
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">← Prev</button>`;
    const maxButtons = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);

    if (startPage > 1) {
      html += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) html += `<span style="color:var(--text-muted);padding:0 4px;">…</span>`;
    }
    for (let p = startPage; p <= endPage; p++) {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span style="color:var(--text-muted);padding:0 4px;">…</span>`;
      html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next →</button>`;

    paginationEl.innerHTML = html;
    paginationEl.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        currentPage = parseInt(btn.dataset.page);
        renderPage();
        renderPagination();
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function applyFilter() {
    const query = filterInput.value.trim().toLowerCase();
    filteredResults = !query ? allResults : allResults.filter(r => {
      return formatDateDisplay(r.date).toLowerCase().includes(query) || r.dayName.toLowerCase().includes(query);
    });
    currentPage = 1;
    totalResultsEl.textContent = filteredResults.length.toLocaleString();
    renderPage();
    renderPagination();
  }

  function setView(view) {
    currentView = view;
    viewGridBtn.classList.toggle('active', view === 'grid');
    viewListBtn.classList.toggle('active', view === 'list');
    renderPage();
  }

  // ================================================================
  //  CHALDEAN NAME NUMBER TAB
  // ================================================================

  function setupChaldeanListeners() {
    nameInput.addEventListener('input', calculateNameNumber);
  }

  function calculateNameNumber() {
    const raw = nameInput.value;
    const cleaned = raw.toUpperCase();

    // Clear chart highlights
    chartLetterSpans.forEach(s => s.classList.remove('active-letter'));

    if (!cleaned.replace(/[^A-Z]/g, '')) {
      nameResultEl.style.display = 'none';
      return;
    }

    nameResultEl.style.display = 'block';

    // Split into words
    const words = cleaned.split(/\s+/).filter(w => w.replace(/[^A-Z]/g, '').length > 0);

    // Build letter breakdown HTML
    let breakdownHTML = '';
    const activeLetters = new Set();

    words.forEach((word, wi) => {
      for (const ch of word) {
        const upper = ch.toUpperCase();
        if (CHALDEAN[upper] !== undefined) {
          breakdownHTML += `<div class="letter-chip">
            <span class="letter">${upper}</span>
            <span class="letter-val">${CHALDEAN[upper]}</span>
          </div>`;
          activeLetters.add(upper);
        }
      }
      if (wi < words.length - 1) {
        breakdownHTML += `<div class="letter-chip space-chip"></div>`;
      }
    });

    letterBreakdownEl.innerHTML = breakdownHTML;

    // Highlight active letters in chart
    chartLetterSpans.forEach(s => {
      if (activeLetters.has(s.textContent.trim().toUpperCase())) {
        s.classList.add('active-letter');
      }
    });

    // Word totals
    let wordTotalsHTML = '';
    let grandTotal = 0;
    const wordSums = [];

    words.forEach(word => {
      let sum = 0;
      const letters = word.replace(/[^A-Z]/g, '');
      for (const ch of letters) {
        if (CHALDEAN[ch] !== undefined) sum += CHALDEAN[ch];
      }
      grandTotal += sum;
      wordSums.push({ word: letters, sum });

      wordTotalsHTML += `<div class="word-total-card">
        <span class="word-name">${capitalize(letters)}</span>
        <span class="word-sum">${buildWordSumStr(letters)}</span>
        <span class="word-val">${sum}</span>
      </div>`;
    });

    wordTotalsEl.innerHTML = wordTotalsHTML;

    // Final reduction
    const reductionSteps = getReductionSteps(grandTotal);
    let reductionHTML = reductionSteps.map((step, i) => {
      if (i === 0) return `<strong>${step}</strong>`;
      return `<span class="reduction-arrow">→</span> <strong>${step}</strong>`;
    }).join(' ');

    finalReductionEl.innerHTML = reductionHTML;
    finalNumberEl.textContent = reductionSteps[reductionSteps.length - 1];
  }

  function buildWordSumStr(word) {
    const parts = [];
    for (const ch of word) {
      if (CHALDEAN[ch] !== undefined) parts.push(CHALDEAN[ch]);
    }
    return parts.join(' + ');
  }

  function getReductionSteps(num) {
    const steps = [num];
    while (num > 9) {
      let sum = 0;
      let temp = num;
      while (temp > 0) { sum += temp % 10; temp = Math.floor(temp / 10); }
      num = sum;
      steps.push(num);
    }
    return steps;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // ================================================================
  //  HELPERS
  // ================================================================

  function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDateDisplay(date) {
    const d = date.getDate();
    const m = date.toLocaleString('en-US', { month: 'short' });
    const y = date.getFullYear();
    return `${d} ${m} ${y}`;
  }

  function showError(msg) { errorMsgEl.textContent = msg; }
  function clearError() { errorMsgEl.textContent = ''; }

  // ================================================================
  //  BOOT
  // ================================================================
  init();
})();
