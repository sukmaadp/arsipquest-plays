// ARSIP-QUEST AR Engine

let currentSite = null;
let selectedOption = null;
let isMarkerDetected = false;

document.addEventListener("DOMContentLoaded", function() {
  initAR();
});

function initAR() {
  const urlParams = new URLSearchParams(window.location.search);
  const siteId = urlParams.get('site') || urlParams.get('id');

  if (!siteId) {
    window.location.href = "index.html";
    return;
  }

  currentSite = SITES_DATA.find(s => s.id === siteId.toLowerCase().trim());
  
  if (!currentSite) {
    window.location.href = "index.html";
    return;
  }

  // Double check checkout/attempt status. If already attempted, kick back.
  const state = localStorage.getItem(`aq_status_${currentSite.id}`);
  if (state) {
    window.location.href = `index.html?site=${currentSite.id}`;
    return;
  }

  // Setup UI elements metadata
  document.getElementById("ar-site-name").innerText = currentSite.name.toUpperCase();
  document.getElementById("ar-site-category").innerText = currentSite.category.toUpperCase();
  document.getElementById("story-text").innerText = currentSite.story;

  // Adapt color accents
  const catSlug = getCategorySlug(currentSite.category);
  document.getElementById("story-sheet").classList.add(`card-${catSlug}`);
  document.getElementById("btn-start-quiz").className = `btn btn-gold btn-${catSlug}`;

  // Hide loader when scene finishes loading camera and entities
  const scene = document.querySelector('a-scene');
  if (scene.hasLoaded) {
    hideARLoader();
  } else {
    scene.addEventListener('loaded', hideARLoader);
  }

  // Load dynamic GLB model properties
  const glbModel = document.getElementById("glb-model");
  if (glbModel) {
    glbModel.setAttribute("gltf-model", currentSite.glbPath);
    glbModel.setAttribute("scale", currentSite.scale || "1 1 1");
    glbModel.setAttribute("rotation", currentSite.rotation || "0 0 0");
    glbModel.setAttribute("visible", "true");
  } else {
    console.error("GLB model container element not found in scene!");
  }

  // Setup Quiz button click listener
  document.getElementById("btn-start-quiz").onclick = startQuiz;
  document.getElementById("btn-submit-quiz").onclick = submitQuiz;
}

function hideARLoader() {
  const loader = document.getElementById("ar-loader");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => {
      loader.style.display = "none";
    }, 500);
  }
}

// AR.js Marker Detection registration component
AFRAME.registerComponent('marker-listener', {
  init: function () {
    const marker = this.el;
    
    marker.addEventListener('markerFound', function() {
      if (isMarkerDetected) return; // prevent repeated triggers
      isMarkerDetected = true;
      console.log("Hiro Marker Found!");
      
      // Slide up the story panel
      document.getElementById("story-sheet").classList.add("open");
      
      // Hide helper overlay banner
      document.getElementById("ar-helper").classList.add("hidden");
    });

    marker.addEventListener('markerLost', function() {
      console.log("Hiro Marker Lost!");
      // Note: We deliberately KEEP the bottom sheet open after initial detection.
      // This protects player accessibility against camera tracking jitter.
      // They don't have to keep holding their arm up in a perfect angle while reading.
    });
  }
});

// Quiz Initiation
function startQuiz() {
  // Hide story panel
  document.getElementById("story-sheet").classList.remove("open");
  
  // Show Quiz Modal
  const modal = document.getElementById("quiz-modal");
  modal.classList.add("open");

  // Load question
  document.getElementById("quiz-question").innerText = currentSite.question;

  // Load option choices
  const optionsContainer = document.getElementById("quiz-options");
  optionsContainer.innerHTML = "";
  selectedOption = null;
  document.getElementById("btn-submit-quiz").setAttribute("disabled", "true");

  currentSite.options.forEach(option => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerText = option;
    btn.onclick = function() {
      // Clear previously selected
      document.querySelectorAll(".option-btn").forEach(b => b.classList.remove("selected"));
      // Mark active selected
      btn.classList.add("selected");
      selectedOption = option;
      // Enable submit button
      document.getElementById("btn-submit-quiz").removeAttribute("disabled");
    };
    optionsContainer.appendChild(btn);
  });
}

// Quiz Submission & Validation Gate
function submitQuiz() {
  if (!selectedOption) return;

  const isCorrect = (selectedOption === currentSite.correct_answer);
  const resultState = isCorrect ? "success" : "failed";

  // Lock status permanently in localStorage
  localStorage.setItem(`aq_status_${currentSite.id}`, resultState);

  // Close quiz modal
  document.getElementById("quiz-modal").classList.remove("open");

  // Setup result screen
  const resultScreen = document.getElementById("result-screen");
  const resultTitle = document.getElementById("result-title");
  const resultMessage = document.getElementById("result-message");
  const resultIcon = document.getElementById("result-icon");

  resultScreen.classList.remove("hidden");

  if (isCorrect) {
    resultScreen.className = "result-screen theme-success";
    resultTitle.innerText = "VALIDASI BERHASIL";
    resultIcon.innerText = "✓";
    resultMessage.innerHTML = `<strong>Hebat! Jawabanmu benar.</strong><br>Kamu dapat mengklaim dan membeli situs <strong>${currentSite.name}</strong> pada papan permainan board game fisik.`;
  } else {
    resultScreen.className = "result-screen theme-failure";
    resultTitle.innerText = "VALIDASI GAGAL";
    resultIcon.innerText = "✗";
    resultMessage.innerHTML = `<strong>Aduh! Jawabanmu kurang tepat.</strong><br>Kamu <strong>belum dapat</strong> mengklaim situs <strong>${currentSite.name}</strong> pada putaran ini.<br><span style="font-size:11px; opacity:0.7;">Berdasarkan aturan permainan, kamu dilarang mengulang kuis ini.</span>`;
  }
}

// Navigation utilities
function exitAR() {
  if (currentSite) {
    window.location.href = `index.html?site=${currentSite.id}`;
  } else {
    window.location.href = "index.html";
  }
}

function getCategorySlug(category) {
  const cat = category.toLowerCase();
  if (cat.includes("nusantara")) return "nusantara";
  if (cat.includes("perjuangan") || cat.includes("kolonial")) return "kolonial";
  if (cat.includes("kebudayaan") || cat.includes("istana")) return "istana";
  if (cat.includes("lalu") || cat.includes("jejak")) return "masa-lalu";
  return "default";
}
