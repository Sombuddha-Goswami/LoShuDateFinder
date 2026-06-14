/* ============================================
   Lo Shu Grid Date Finder — Application Logic
   ============================================ */

(() => {
  'use strict';

  // ---- Lo Shu Grid Positions (number → grid index) ----
  // Traditional Lo Shu layout:
  //   4 | 9 | 2
  //   3 | 5 | 7
  //   8 | 1 | 6
  const LOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  const NUM_TO_POS = {};
  LOSHU_ORDER.forEach((num, idx) => { NUM_TO_POS[num] = idx; });

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const RESULTS_PER_PAGE = 30;

  // ---- State ----
  let selectedNumbers = new Set();
  let allResults = [];
  let filteredResults = [];
  let currentPage = 1;
  let currentView = 'grid';

  // ---- DOM Elements ----
  const selectorCells = document.querySelectorAll('.loshu-cell');
  const selectedCountEl = document.getElementById('selectedCount');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const endDateNote = document.getElementById('endDateNote');
  const findBtn = document.getElementById('findBtn');
  const btnLoader = document.getElementById('btnLoader');
  const errorMsgEl = document.getElementById('errorMsg');
  const resultsSection = document.getElementById('resultsSection');
  const resultsContainer = document.getElementById('resultsContainer');
  const totalResultsEl = document.getElementById('totalResults');
  const searchRangeEl = document.getElementById('searchRange');
  const paginationEl = document.getElementById('pagination');
  const filterInput = document.getElementById('resultFilter');
  const viewGridBtn = document.getElementById('viewGrid');
  const viewListBtn = document.getElementById('viewList');

  // ---- Initialize ----
  function init() {
    setEndDate();
    setupEventListeners();
    validateForm();
  }

  function setEndDate() {
    const today = new Date();
    const endDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const formatted = formatDateISO(endDate);
    endDateInput.value = formatted;
    endDateNote.textContent = `Auto-calculated: 18 years before today (${formatDateDisplay(endDate)})`;
    
    // Set reasonable defaults for start date
    startDateInput.max = formatted;
  }

  // ---- Event Listeners ----
  function setupEventListeners() {
    // Lo Shu cell selection
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

    // Date inputs
    startDateInput.addEventListener('change', validateForm);

    // Find button
    findBtn.addEventListener('click', runSearch);

    // Filter
    filterInput.addEventListener('input', () => {
      applyFilter();
    });

    // View toggle
    viewGridBtn.addEventListener('click', () => setView('grid'));
    viewListBtn.addEventListener('click', () => setView('list'));
  }

  // ---- Validation ----
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

  /**
   * Reduce a number to a single digit by summing its digits repeatedly.
   */
  function reduceToSingle(num) {
    while (num > 9) {
      let sum = 0;
      while (num > 0) {
        sum += num % 10;
        num = Math.floor(num / 10);
      }
      num = sum;
    }
    return num;
  }

  /**
   * Mulank (Root Number): Reduce the day of the month to a single digit.
   * e.g., 28 → 2+8 = 10 → 1+0 = 1
   */
  function calcMulank(day) {
    return reduceToSingle(day);
  }

  /**
   * Bhagyank (Destiny Number): Reduce the full date (DD+MM+YYYY) digits to a single digit.
   * e.g., 28-03-1990 → 2+8+0+3+1+9+9+0 = 32 → 3+2 = 5
   */
  function calcBhagyank(day, month, year) {
    const sum = digitSum(day) + digitSum(month) + digitSum(year);
    return reduceToSingle(sum);
  }

  function digitSum(num) {
    let s = 0;
    num = Math.abs(num);
    while (num > 0) {
      s += num % 10;
      num = Math.floor(num / 10);
    }
    return s;
  }

  /**
   * Get all numbers (1-9) present in a date's Lo Shu grid.
   * This includes:
   *   - Each non-zero digit of the full date (DD-MM-YYYY)
   *   - The Mulank
   *   - The Bhagyank
   */
  function getLoShuNumbers(day, month, year) {
    const present = new Set();

    // Extract digits from DD, MM, YYYY
    const dateStr = String(day).padStart(2, '0') +
                    String(month).padStart(2, '0') +
                    String(year);
    for (const ch of dateStr) {
      const d = parseInt(ch);
      if (d >= 1 && d <= 9) present.add(d);
    }

    // Add Mulank and Bhagyank
    const mulank = calcMulank(day);
    const bhagyank = calcBhagyank(day, month, year);
    present.add(mulank);
    present.add(bhagyank);

    return { present, mulank, bhagyank };
  }

  /**
   * Build the full Lo Shu grid counts for display.
   * Returns an array of 9 elements (positions 0-8) with the count of each number.
   */
  function buildLoShuGrid(day, month, year) {
    const counts = new Array(10).fill(0); // index 1-9

    const dateStr = String(day).padStart(2, '0') +
                    String(month).padStart(2, '0') +
                    String(year);
    for (const ch of dateStr) {
      const d = parseInt(ch);
      if (d >= 1 && d <= 9) counts[d]++;
    }

    const mulank = calcMulank(day);
    const bhagyank = calcBhagyank(day, month, year);
    counts[mulank]++;
    counts[bhagyank]++;

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

    // Use setTimeout to allow the UI to update before the heavy computation
    setTimeout(() => {
      const results = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        const day = current.getDate();
        const month = current.getMonth() + 1;
        const year = current.getFullYear();

        const { present, mulank, bhagyank } = getLoShuNumbers(day, month, year);

        // Check: every required number must be present
        let match = true;
        for (const num of required) {
          if (!present.has(num)) {
            match = false;
            break;
          }
        }

        if (match) {
          results.push({
            date: new Date(current),
            day,
            month,
            year,
            mulank,
            bhagyank,
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
        </div>
      `;
      paginationEl.innerHTML = '';
      return;
    }

    renderPage();
    renderPagination();

    // Scroll to results
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
        return `
          <div class="result-item">
            <div class="result-info">
              <div class="result-date">${dateDisplay}</div>
              <div class="result-day-name">${r.dayName}</div>
            </div>
            <div class="result-nums">
              <div class="num-badge">
                <span class="num-badge-label">Mulank</span>
                <span class="num-badge-value">${r.mulank}</span>
              </div>
              <div class="num-badge">
                <span class="num-badge-label">Bhagyank</span>
                <span class="num-badge-value">${r.bhagyank}</span>
              </div>
            </div>
            ${miniGrid}
          </div>
        `;
      }

      return `
        <div class="result-item">
          <div class="result-date">${dateDisplay}</div>
          <div class="result-day-name">${r.dayName}</div>
          <div class="result-nums">
            <div class="num-badge">
              <span class="num-badge-label">Mulank</span>
              <span class="num-badge-value">${r.mulank}</span>
            </div>
            <div class="num-badge">
              <span class="num-badge-label">Bhagyank</span>
              <span class="num-badge-value">${r.bhagyank}</span>
            </div>
          </div>
          ${miniGrid}
        </div>
      `;
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
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    let html = '';
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">← Prev</button>`;

    const maxButtons = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

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

  // ---- Filter ----
  function applyFilter() {
    const query = filterInput.value.trim().toLowerCase();
    if (!query) {
      filteredResults = allResults;
    } else {
      filteredResults = allResults.filter(r => {
        const dateStr = formatDateDisplay(r.date).toLowerCase();
        const dayName = r.dayName.toLowerCase();
        return dateStr.includes(query) || dayName.includes(query);
      });
    }
    currentPage = 1;
    totalResultsEl.textContent = filteredResults.length.toLocaleString();
    renderPage();
    renderPagination();
  }

  // ---- View Toggle ----
  function setView(view) {
    currentView = view;
    viewGridBtn.classList.toggle('active', view === 'grid');
    viewListBtn.classList.toggle('active', view === 'list');
    renderPage();
  }

  // ---- Helpers ----
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

  function showError(msg) {
    errorMsgEl.textContent = msg;
  }

  function clearError() {
    errorMsgEl.textContent = '';
  }

  // ---- Boot ----
  init();
})();
