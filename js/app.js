// ARSIP-QUEST Portal JS

document.addEventListener("DOMContentLoaded", function() {
  initApp();
});

function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const siteId = urlParams.get('site') || urlParams.get('id'); // support both

  // Bind homepage validation button click handler
  const startValidationBtn = document.getElementById("btn-start-validation");
  if (startValidationBtn) {
    startValidationBtn.onclick = function() {
      const currentSiteId = new URLSearchParams(window.location.search).get('site') || new URLSearchParams(window.location.search).get('id');
      if (currentSiteId) {
        window.location.href = `ar.html?site=${currentSiteId.toLowerCase().trim()}`;
      } else {
        openSiteSelector();
      }
    };
  }

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

  // Hide validation status container by default as it is not permanent
  const statusContainer = document.getElementById("site-status-container");
  if (statusContainer) {
    statusContainer.classList.add("hidden");
  }

  // Always enable the scan button
  const btnScan = document.getElementById("btn-scan-ar");
  if (btnScan) {
    btnScan.classList.remove("hidden");
    btnScan.onclick = function() {
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

// Site Selector Modal population and control
function openSiteSelector() {
  const modal = document.getElementById("site-selector-modal");
  if (!modal) return;

  const container = document.getElementById("site-selector-list");
  if (!container) return;

  // Group sites by Category
  const categories = {};
  SITES_DATA.forEach(site => {
    if (!categories[site.category]) {
      categories[site.category] = [];
    }
    categories[site.category].push(site);
  });

  // Render list
  container.innerHTML = "";
  for (const [catName, sites] of Object.entries(categories)) {
    const slug = getCategorySlug(catName);
    
    // Category Heading
    const header = document.createElement("div");
    header.style.fontFamily = "var(--font-header)";
    header.style.fontSize = "11px";
    header.style.color = `var(--${slug}-color)`;
    header.style.marginTop = "12px";
    header.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
    header.style.paddingBottom = "4px";
    header.innerText = catName.toUpperCase();
    container.appendChild(header);

    // Sites grid
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(2, 1fr)";
    grid.style.gap = "8px";
    
    sites.forEach(site => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.style.padding = "10px";
      btn.style.fontSize = "12px";
      
      btn.innerHTML = `${site.name}`;
      btn.onclick = function() {
        window.location.href = `ar.html?site=${site.id}`;
      };
      grid.appendChild(btn);
    });
    container.appendChild(grid);
  }

  modal.classList.add("open");
}

function closeSiteSelector() {
  const modal = document.getElementById("site-selector-modal");
  if (modal) {
    modal.classList.remove("open");
  }
}
