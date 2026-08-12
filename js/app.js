// ARSIP-QUEST Portal JS

document.addEventListener("DOMContentLoaded", function() {
  initApp();
});

function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const siteId = urlParams.get('site') || urlParams.get('id'); // support both

  if (siteId) {
    const site = SITES_DATA.find(s => s.id === siteId.toLowerCase().trim());
    if (site) {
      loadSiteDetail(site);
      return;
    }
  }
  
  // If no site parameter, load default landing page
  loadLandingPage();
}

function loadLandingPage() {
  document.getElementById("landing-screen").classList.remove("hidden");
  document.getElementById("detail-screen").classList.add("hidden");
  
  // Populate developer panel
  populateDevGrid();
}

function loadSiteDetail(site) {
  document.getElementById("landing-screen").classList.add("hidden");
  const detailScreen = document.getElementById("detail-screen");
  detailScreen.classList.remove("hidden");

  // Reset category classes on details page wrapper to enable dynamic styling
  detailScreen.className = "screen accent-" + getCategorySlug(site.category);
  
  // Populate site metadata
  document.getElementById("site-title").innerText = site.name.toUpperCase();
  document.getElementById("site-location-text").innerText = site.location;
  document.getElementById("site-desc-text").innerText = site.story;

  // Set category badge details
  const siteBadge = document.getElementById("site-badge");
  siteBadge.innerText = site.category;
  siteBadge.className = "badge badge-" + getCategorySlug(site.category);

  // Set site card category border styles
  const detailCard = document.getElementById("detail-card");
  detailCard.className = "card card-" + getCategorySlug(site.category);

  // Check validation state in localStorage
  const validationState = localStorage.getItem(`aq_status_${site.id}`);
  const statusContainer = document.getElementById("site-status-container");
  const statusBanner = document.getElementById("site-status-banner");
  const btnScan = document.getElementById("btn-scan-ar");
  const statusInfo = document.getElementById("site-status-info");

  if (validationState === "success") {
    // Validated successfully
    statusContainer.classList.remove("hidden");
    statusBanner.innerText = "VALIDASI BERHASIL";
    statusBanner.className = "status-banner status-success";
    statusInfo.innerText = "Situs ini telah berhasil kamu klaim! Kembali ke permainan board game fisik untuk membelinya.";
    btnScan.classList.add("hidden");
  } else if (validationState === "failed") {
    // Failed quiz validation
    statusContainer.classList.remove("hidden");
    statusBanner.innerText = "VALIDASI GAGAL";
    statusBanner.className = "status-banner status-failed";
    statusInfo.innerText = "Validasi gagal. Kamu tidak dapat mengklaim situs ini pada putaran permainan ini.";
    btnScan.classList.add("hidden");
  } else {
    // Unattempted quiz
    statusContainer.classList.add("hidden");
    btnScan.classList.remove("hidden");
    btnScan.onclick = function() {
      // Redirect to AR viewer page with site ID
      window.location.href = `ar.html?site=${site.id}`;
    };
  }
}

// Utility to parse categories to slugs for classes
function getCategorySlug(category) {
  const cat = category.toLowerCase();
  if (cat.includes("nusantara")) return "nusantara";
  if (cat.includes("perjuangan") || cat.includes("kolonial")) return "kolonial";
  if (cat.includes("kebudayaan") || cat.includes("istana")) return "istana";
  if (cat.includes("lalu") || cat.includes("jejak")) return "masa-lalu";
  return "default";
}

// Navigation back to landing instruction page
function goHome() {
  // Clear site parameter in URL without reloading
  window.history.pushState({}, '', window.location.pathname);
  loadLandingPage();
}

// Developer Panel Simulation Grid population
function populateDevGrid() {
  const devGrid = document.getElementById("dev-grid");
  devGrid.innerHTML = "";

  // Group sites by Category
  const categories = {};
  SITES_DATA.forEach(site => {
    if (!categories[site.category]) {
      categories[site.category] = [];
    }
    categories[site.category].push(site);
  });

  // Create section for each category
  for (const [catName, sites] of Object.entries(categories)) {
    const slug = getCategorySlug(catName);
    
    // Category Heading in Grid
    const categoryHeader = document.createElement("div");
    categoryHeader.style.gridColumn = "span 2";
    categoryHeader.style.fontFamily = "var(--font-header)";
    categoryHeader.style.fontSize = "10px";
    categoryHeader.style.color = `var(--${slug}-color)`;
    categoryHeader.style.marginTop = "8px";
    categoryHeader.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
    categoryHeader.style.paddingBottom = "2px";
    categoryHeader.innerText = catName.toUpperCase();
    devGrid.appendChild(categoryHeader);

    sites.forEach(site => {
      const button = document.createElement("button");
      button.className = "dev-site-btn";
      
      // Add a visual status indicator dot
      const state = localStorage.getItem(`aq_status_${site.id}`);
      let dot = "⚪"; // unattempted
      if (state === "success") dot = "🟢";
      if (state === "failed") dot = "🔴";

      button.innerHTML = `<span style="font-size:8px; margin-right:4px;">${dot}</span> ${site.name}`;
      button.onclick = function() {
        // Update URL parameter and trigger view change
        window.history.pushState({}, '', `?site=${site.id}`);
        initApp();
      };
      devGrid.appendChild(button);
    });
  }
}

// Collapsible Developer Simulation Hub Accordion
function toggleDevPanel() {
  const devGrid = document.getElementById("dev-grid");
  const devToggleIcon = document.getElementById("dev-toggle-icon");
  const isHidden = devGrid.classList.contains("hidden");

  if (isHidden) {
    devGrid.classList.remove("hidden");
    devToggleIcon.innerText = "▲";
  } else {
    devGrid.classList.add("hidden");
    devToggleIcon.innerText = "▼";
  }
}
