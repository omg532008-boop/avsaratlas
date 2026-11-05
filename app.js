let jobsData = [];
let updatesData = [];
let activeTab = "all";
let currentLang = "hi";

const translations = {
  hi: {
    tagline: "हर अवसर की सही जानकारी",
    heroHeading: "सभी सरकारी व प्राइवेट अवसर एक ही स्थान पर",
    searchPlaceholder: "वैकेंसी, परीक्षा या बोर्ड का नाम खोजें...",
    tabAll: "सभी (All)",
    tabGovt: "सरकारी नौकरी",
    tabResult: "रिजल्ट",
    tabAdmit: "एडमिट कार्ड",
    tabKey: "उत्तर कुंजी",
    feedTitle: "ताज़ा अवसर व अपडेट्स",
    applyBtn: "आधिकारिक सूचना देखें ↗",
    disclaimer: "⚠️ स्वतंत्र सूचना मंच: आवेदन से पूर्व आधिकारिक वेबसाइट से विवरण का मिलान अवश्य करें।"
  },
  en: {
    tagline: "Your Guide to Every Opportunity",
    heroHeading: "All Govt & Private Opportunities in One Place",
    searchPlaceholder: "Search exams, posts, departments...",
    tabAll: "All",
    tabGovt: "Govt Jobs",
    tabResult: "Results",
    tabAdmit: "Admit Cards",
    tabKey: "Answer Keys",
    feedTitle: "Live Alerts & Opportunities",
    applyBtn: "View Official Source ↗",
    disclaimer: "⚠️ Independent Information Portal: Always verify details with official website."
  }
};

async function init() {
  setupLanguage();
  setupTabs();
  setupSearch();
  await loadData();
  render();
}

async function loadData() {
  try {
    const [resJobs, resUpdates] = await Promise.all([
      fetch("data/jobs.json").then(r => r.ok ? r.json() : []),
      fetch("data/updates.json").then(r => r.ok ? r.json() : [])
    ]);
    jobsData = resJobs;
    updatesData = resUpdates;
  } catch (err) {
    console.error("Data load failed", err);
  }
}

function setupLanguage() {
  const btn = document.getElementById("langToggleBtn");
  btn.addEventListener("click", () => {
    currentLang = currentLang === "hi" ? "en" : "hi";
    btn.textContent = currentLang === "hi" ? "English" : "हिंदी";
    applyTexts();
    render();
  });
}

function applyTexts() {
  const t = translations[currentLang];
  document.getElementById("brandTagline").textContent = t.tagline;
  document.getElementById("heroHeading").textContent = t.heroHeading;
  document.getElementById("searchInput").placeholder = t.searchPlaceholder;
  document.getElementById("tabAll").textContent = t.tabAll;
  document.getElementById("tabGovt").textContent = t.tabGovt;
  document.getElementById("tabResult").textContent = t.tabResult;
  document.getElementById("tabAdmit").textContent = t.tabAdmit;
  document.getElementById("tabKey").textContent = t.tabKey;
  document.getElementById("feedTitle").textContent = t.feedTitle;
  document.getElementById("disclaimerNotice").textContent = t.disclaimer;
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeTab = tab.dataset.tab;
      render();
    });
  });
}

function setupSearch() {
  const input = document.getElementById("searchInput");
  input.addEventListener("input", () => {
    render();
  });
}

function render() {
  const container = document.getElementById("feedContainer");
  const query = document.getElementById("searchInput").value.toLowerCase().trim();
  const t = translations[currentLang];

  // Merge items based on activeTab
  let items = [];
  if (activeTab === "all") {
    items = [...jobsData.map(j => ({ ...j, kind: 'job' })), ...updatesData.map(u => ({ ...u, kind: 'update' }))];
  } else if (activeTab === "govt") {
    items = jobsData.filter(j => j.sector === "govt").map(j => ({ ...j, kind: 'job' }));
  } else {
    items = updatesData.filter(u => u.type === activeTab).map(u => ({ ...u, kind: 'update' }));
  }

  // Filter with query
  if (query) {
    items = items.filter(item => {
      const title = (currentLang === "hi" ? item.title_hi : item.title_en) || item.title_en || "";
      const org = item.org || "";
      return title.toLowerCase().includes(query) || org.toLowerCase().includes(query);
    });
  }

  if (items.length === 0) {
    container.innerHTML = `<div class="loading-state">कोई सूचना नहीं मिली (No matches found)</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const title = (currentLang === "hi" ? item.title_hi : item.title_en) || item.title_en;
    const summary = (currentLang === "hi" ? item.summary_hi : item.summary_en) || item.summary_en || "";
    const date = item.last_verified_date || item.date_published || "";
    const tag = item.kind === "job" ? "JOB" : item.type.replace("_", " ").toUpperCase();

    return `
      <article class="card">
        <div class="card-top">
          <span class="org-tag">${escape(item.org)}</span>
          <span class="badge">${tag}</span>
        </div>
        <h4 class="card-title">${escape(title)}</h4>
        <p class="card-summary">${escape(summary)}</p>
        <div class="card-footer">
          <span>📅 ${date}</span>
          <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="btn-apply">${t.applyBtn}</a>
        </div>
      </article>
    `;
  }).join("");
}

function escape(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

document.addEventListener("DOMContentLoaded", init);
