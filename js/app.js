// ARSIP-QUEST — Master Application Engine

let currentSite = null;
let selectedOption = null;
let isMarkerDetected = false;
const validatedSites = {};

document.addEventListener("DOMContentLoaded", function () {
  initApp();
  initMarkerListener();
});

/**
 * Extracts site slug from Pathname, Query String, or Hash.
 * Supports:
 * - /candi-tikus
 * - /candi-borobudur
 * - /prambanan
 * - /sangiran
 * - /?site=candi-tikus
 * - /#candi-tikus
 */
function extractSiteSlug() {
  // 1. Check Query String (?site=... or ?id=...)
  const urlParams = new URLSearchParams(window.location.search);
  const querySite = urlParams.get('site') || urlParams.get('id');
  if (querySite) {
    return querySite.toLowerCase().trim();
  }

  // 2. Check Hash (#/candi-borobudur or #candi-borobudur)
  if (window.location.hash) {
    const cleanHash = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim();
    if (cleanHash && cleanHash !== 'ar' && cleanHash !== 'quiz' && cleanHash !== 'detail') {
      return cleanHash.toLowerCase();
    }
  }

  // 3. Check Pathname (/candi-tikus, /candi-borobudur, etc.)
  let pathname = window.location.pathname || '';
  pathname = pathname.replace(/\/+$/, '');
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length > 0) {
    const last = segments[segments.length - 1].toLowerCase().trim();
    if (
      last &&
      last !== 'index' &&
      last !== 'index.html' &&
      last !== 'ar' &&
      last !== 'ar.html' &&
      !last.endsWith('.html') &&
      !last.endsWith('.php')
    ) {
      return last;
    }
  }

  return null;
}

/**
 * Initialize application routing and screen presentation.
 */
function initApp() {
  const slug = extractSiteSlug();

  // If no site specified in URL, load standard guide screen
  if (!slug) {
    showScreen("landing-screen");
    return;
  }

  // Resolve site identity using smart alias and prefix matching
  const site = window.findSiteBySlug ? window.findSiteBySlug(slug) : null;

  if (site) {
    currentSite = site;
    loadSiteDetail(site);
  } else {
    // Site slug was provided in URL but not recognized in historical archives
    const notfoundEl = document.getElementById("notfound-message");
    if (notfoundEl) {
      notfoundEl.innerHTML = `Situs dengan tautan <strong>/${escapeHtml(slug)}</strong> tidak ditemukan dalam arsip sejarah ARSIP-QUEST.<br>Pastikan Anda memindai QR Code resmi pada kartu fisik permainan.`;
    }
    showScreen("notfound-screen");
  }
}

/**
 * Switch screen visibility cleanly.
 */
function showScreen(screenId) {
  const screens = ["landing-screen", "notfound-screen", "detail-screen"];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === screenId) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    }
  });
}

/**
 * Step 1: Halaman Pembuka Situs
 */
function loadSiteDetail(site) {
  showScreen("detail-screen");
  const detailScreen = document.getElementById("detail-screen");

  // Dynamic category accent
  const catSlug = getCategorySlug(site.category);
  detailScreen.className = "screen accent-" + catSlug;

  // Populate site metadata
  document.getElementById("site-title").innerText = site.name.toUpperCase();
  document.getElementById("site-location-text").innerText = site.location;
  document.getElementById("site-desc-text").innerText = site.story;

  // Set category badge details
  const siteBadge = document.getElementById("site-badge");
  siteBadge.innerText = site.category;
  siteBadge.className = "badge badge-" + catSlug;

  // Set site card category border styles
  const detailCard = document.getElementById("detail-card");
  detailCard.className = "card card-" + catSlug;

  // Check if site was already claimed during this session
  const statusContainer = document.getElementById("site-status-container");
  const btnScan = document.getElementById("btn-scan-ar");

  if (validatedSites[site.id]) {
    statusContainer.classList.remove("hidden");
    btnScan.innerText = "LIHAT AR LAGI";
  } else {
    statusContainer.classList.add("hidden");
    btnScan.innerText = "SCAN AR";
  }

  btnScan.onclick = function () {
    startARMode();
  };
}

/**
 * Step 2: Kamera AR Situs (Diorama 3D + Tombol Lanjut)
 */
function startARMode() {
  if (!currentSite) return;

  // Hide Halaman Pembuka
  document.getElementById("detail-screen").classList.add("hidden");

  // Show AR overlay and A-Frame scene
  const arScreen = document.getElementById("ar-screen");
  const arViewport = document.getElementById("ar-viewport");
  arScreen.classList.remove("hidden");
  arViewport.classList.remove("hidden");

  // Setup AR Header
  document.getElementById("ar-site-name").innerText = currentSite.name.toUpperCase();
  document.getElementById("ar-site-category").innerText = currentSite.category.toUpperCase();

  // Reset Hiro reticle state
  isMarkerDetected = false;
  const statusTitle = document.getElementById("ar-marker-status-title");
  const statusDesc = document.getElementById("ar-marker-status-desc");
  if (statusTitle) statusTitle.innerText = "ARAHKAN KE HIRO MARKER";
  if (statusDesc) statusDesc.innerText = "Dekatkan kamera ke Hiro Marker pada kartu untuk memproyeksikan Diorama 3D.";

  // Configure GLB Model in A-Frame Scene
  const glbModel = document.getElementById("glb-model");
  if (glbModel) {
    glbModel.setAttribute("gltf-model", currentSite.glbPath);
    glbModel.setAttribute("scale", currentSite.scale || "0.5 0.5 0.5");
    glbModel.setAttribute("rotation", currentSite.rotation || "0 0 0");
    glbModel.setAttribute("visible", "true");
  }

  // Restore body overflow for AR.js
  document.body.style.overflow = "hidden";
}

/**
 * Exit AR mode back to Halaman Pembuka.
 */
function exitARMode() {
  const arScreen = document.getElementById("ar-screen");
  const arViewport = document.getElementById("ar-viewport");
  if (arScreen) arScreen.classList.add("hidden");
  if (arViewport) arViewport.classList.add("hidden");

  document.body.style.overflow = "auto";
  if (currentSite) {
    loadSiteDetail(currentSite);
  } else {
    showScreen("landing-screen");
  }
}

/**
 * Register A-Frame Hiro Marker Detection.
 */
function initMarkerListener() {
  if (typeof AFRAME === "undefined") return;

  if (!AFRAME.components['marker-listener']) {
    AFRAME.registerComponent('marker-listener', {
      init: function () {
        const marker = this.el;

        marker.addEventListener('markerFound', function () {
          isMarkerDetected = true;
          const statusTitle = document.getElementById("ar-marker-status-title");
          const statusDesc = document.getElementById("ar-marker-status-desc");
          if (statusTitle) {
            statusTitle.innerText = "✨ MODEL 3D DITEMUKAN!";
            statusTitle.style.color = "var(--gold-light)";
          }
          if (statusDesc) {
            statusDesc.innerText = "Diorama 3D aktif di atas kartu Anda. Amati model, lalu tekan tombol 'LANJUT KE KUIS'.";
          }
        });

        marker.addEventListener('markerLost', function () {
          const statusTitle = document.getElementById("ar-marker-status-title");
          const statusDesc = document.getElementById("ar-marker-status-desc");
          if (statusTitle) {
            statusTitle.innerText = "MENCARI HIRO MARKER...";
            statusTitle.style.color = "var(--text-bright)";
          }
          if (statusDesc) {
            statusDesc.innerText = "Arahkan kembali kamera ke Hiro Marker pada kartu situs.";
          }
        });
      }
    });
  }
}

/**
 * Step 3: Tombol "Lanjut" ditekan → Membuka Quiz Situs
 */
function openQuizFromAR() {
  if (!currentSite) return;

  // Hide AR overlays
  document.getElementById("ar-screen").classList.add("hidden");

  // Open Quiz Modal
  const modal = document.getElementById("quiz-modal");
  modal.classList.add("open");

  // Set Title & Question
  document.getElementById("quiz-modal-title").innerText = `QUIZ VALIDASI — ${currentSite.name.toUpperCase()}`;
  document.getElementById("quiz-question").innerText = currentSite.question;

  // Render site-specific options
  const optionsContainer = document.getElementById("quiz-options");
  optionsContainer.innerHTML = "";
  selectedOption = null;

  const submitBtn = document.getElementById("btn-submit-quiz");
  submitBtn.setAttribute("disabled", "true");
  submitBtn.onclick = submitQuiz;

  currentSite.options.forEach(option => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerText = option;
    btn.onclick = function () {
      document.querySelectorAll(".option-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedOption = option;
      submitBtn.removeAttribute("disabled");
    };
    optionsContainer.appendChild(btn);
  });
}

/**
 * Step 4 & 5: Validasi Jawaban, Klaim Situs & Fakta Singkat
 */
function submitQuiz() {
  if (!selectedOption || !currentSite) return;

  const isCorrect = (selectedOption.trim() === currentSite.correct_answer.trim());

  // Close quiz modal
  document.getElementById("quiz-modal").classList.remove("open");

  // Setup Results Bottom Sheet
  const statusBanner = document.getElementById("sheet-status-banner");
  const resultMessage = document.getElementById("sheet-result-message");
  const titleLabel = document.getElementById("sheet-title-label");
  const storyText = document.getElementById("story-text");

  titleLabel.innerText = `CERITA & FAKTA SEJARAH: ${currentSite.name.toUpperCase()}`;
  storyText.innerText = currentSite.story;

  if (isCorrect) {
    validatedSites[currentSite.id] = true;
    statusBanner.innerText = "VALIDASI BERHASIL";
    statusBanner.className = "status-banner status-success";
    resultMessage.innerHTML = `<strong>Hebat! Jawabanmu benar.</strong><br>Kamu berhak mengklaim situs <strong>${currentSite.name}</strong> pada papan permainan fisik ARSIP-QUEST.`;
  } else {
    statusBanner.innerText = "VALIDASI GAGAL";
    statusBanner.className = "status-banner status-failed";
    resultMessage.innerHTML = `<strong>Jawabanmu kurang tepat.</strong><br>Kamu <strong>belum dapat</strong> mengklaim situs <strong>${currentSite.name}</strong> pada putaran ini.<br><span style="font-size:11px; opacity:0.75;">Berdasarkan aturan permainan, kamu dilarang mengulang kuis pada putaran ini.</span>`;
  }

  // Slide up bottom sheet
  const storySheet = document.getElementById("story-sheet");
  const catSlug = getCategorySlug(currentSite.category);
  storySheet.className = `bottom-sheet card-${catSlug} open`;
}

/**
 * Step 6: Selesai → Kembali ke Halaman Pembuka Situs dengan Status Tervalidasi
 */
function finishFlowAndReturn() {
  const storySheet = document.getElementById("story-sheet");
  if (storySheet) storySheet.classList.remove("open");

  exitARMode();
}

/**
 * Navigation utility: Return to landing guide.
 */
function goToLandingGuide() {
  // Clear path/query without breaking origin
  if (window.history.pushState) {
    window.history.pushState({}, '', '/');
  }
  currentSite = null;
  showScreen("landing-screen");
}

/**
 * Utility: Map Category to CSS Slug.
 */
function getCategorySlug(category) {
  if (!category) return "default";
  const cat = category.toLowerCase();
  if (cat.includes("nusantara")) return "nusantara";
  if (cat.includes("perjuangan") || cat.includes("kolonial")) return "kolonial";
  if (cat.includes("kebudayaan") || cat.includes("istana")) return "istana";
  if (cat.includes("lalu") || cat.includes("jejak")) return "masa-lalu";
  return "default";
}

/**
 * Utility: Escape HTML for security.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
