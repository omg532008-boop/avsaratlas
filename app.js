let rawJobs = [];
let rawUpdates = [];
let activeFilter = "all";
let currentLang = "hi";

async function init() {
  setupAgeCalculator();
  setupFilters();
  setupSearch();
  setupLanguage();
  await loadData();
  renderAll();
}

async function loadData() {
  try {
    const [jobsRes, updatesRes] = await Promise.all([
      fetch("data/jobs.json").then(r => r.ok ? r.json() : []),
      fetch("data/updates.json").then(r => r.ok ? r.json() : [])
    ]);
    rawJobs = jobsRes;
    rawUpdates = updatesRes;
  } catch (err) {
    console.error("Data load failed", err);
  }
}

function setupFilters() {
  const chips = document.querySelectorAll(".chip[data-filter]");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.dataset.filter;
      renderAll();
    });
  });
}

function setupSearch() {
  document.getElementById("searchInput").addEventListener("input", () => {
    renderAll();
  });
}

function setupLanguage() {
  const btn = document.getElementById("langToggleBtn");
  btn.addEventListener("click", () => {
    currentLang = currentLang === "hi" ? "en" : "hi";
    btn.textContent = currentLang === "hi" ? "English" : "हिंदी";
    renderAll();
  });
}

function renderAll() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();

  // Filter lists
  const filterList = (list) => {
    return list.filter(item => {
      const text = ((item.title_en || '') + ' ' + (item.title_hi || '') + ' ' + (item.summary_en || '')).toLowerCase();
      
      // Quick Chip filter
      if (activeFilter === "10th" && !text.includes("10th") && !text.includes("matric") && !text.includes("board")) return false;
      if (activeFilter === "12th" && !text.includes("12th") && !text.includes("inter")) return false;
      if (activeFilter === "police" && !text.includes("police") && !text.includes("constable") && !text.includes("defense") && !text.includes("army")) return false;
      if (activeFilter === "railway" && !text.includes("railway") && !text.includes("rrb")) return false;

      // Query search
      if (query && !text.includes(query)) return false;
      return true;
    });
  };

  const results = filterList(rawUpdates.filter(u => u.type === "result"));
  const admitCards = filterList(rawUpdates.filter(u => u.type === "admit_card"));
  const jobs = filterList(rawJobs);

  renderColumn("resultsList", results, "Result");
  renderColumn("admitList", admitCards, "Admit Card");
  renderColumn("jobsList", jobs, "Job");
}

function renderColumn(elementId, items, badgeFallback) {
  const container = document.getElementById(elementId);
  if (items.length === 0) {
    container.innerHTML = `<div class="loading">कोई सूचना उपलब्ध नहीं है।</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const title = (currentLang === "hi" ? item.title_hi : item.title_en) || item.title_en;
    const date = item.date_published || item.last_verified_date || "";
    const badge = item.qualification && item.qualification !== "Refer Notification" ? item.qualification : badgeFallback;

    return `
      <div class="item-card">
        <a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>
        <div class="item-meta">
          <span class="item-badge">${badge}</span>
          <span>📅 ${date}</span>
        </div>
      </div>
    `;
  }).join("");
}

/* Built-in Age Calculator Tool Logic */
function setupAgeCalculator() {
  const modal = document.getElementById("calcModal");
  const openBtn = document.getElementById("openCalcBtn");
  const closeBtn = document.getElementById("closeCalcBtn");
  const calcBtn = document.getElementById("doCalcBtn");
  const resultDiv = document.getElementById("calcResult");

  // Set today as default target date
  document.getElementById("targetDateInput").valueAsDate = new Date();

  openBtn.addEventListener("click", () => modal.classList.add("open"));
  closeBtn.addEventListener("click", () => modal.classList.remove("open"));
  window.addEventListener("click", (e) => { if(e.target === modal) modal.classList.remove("open"); });

  calcBtn.addEventListener("click", () => {
    const dobVal = document.getElementById("dobInput").value;
    const targetVal = document.getElementById("targetDateInput").value;

    if (!dobVal || !targetVal) {
      alert("कृपया दोनों तारीखें चुनें!");
      return;
    }

    const dob = new Date(dobVal);
    const target = new Date(targetVal);

    if (dob > target) {
      alert("जन्मतिथि टारगेट तारीख से पहले की होनी चाहिए!");
      return;
    }

    let years = target.getFullYear() - dob.getFullYear();
    let months = target.getMonth() - dob.getMonth();
    let days = target.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    resultDiv.style.display = "block";
    resultDiv.innerHTML = `🎉 आपकी सही उम्र: <br><strong>${years} वर्ष, ${months} महीने, और ${days} दिन</strong>`;
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

document.addEventListener("DOMContentLoaded", init);
