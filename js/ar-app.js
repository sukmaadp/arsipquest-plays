// ARSIP-QUEST AR Engine

let currentSite = null;
let selectedOption = null;
let isMarkerDetected = false;
let quizStarted = false;
let splashTimer = null;
let hiroTimer = null;

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
  const storySheet = document.getElementById("story-sheet");
  if (storySheet) {
    storySheet.classList.add(`card-${catSlug}`);
  }
  const btnExit = document.getElementById("btn-exit-ar");
  if (btnExit) {
    btnExit.className = `btn btn-gold btn-${catSlug}`;
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

  // Set submit button click
  document.getElementById("btn-submit-quiz").onclick = submitQuiz;

  // Check A-Frame loading state. Once loaded, automatically transition to Hiro scan screen.
  const scene = document.querySelector('a-scene');
  if (scene) {
    if (scene.hasLoaded) {
      hideInitialSplash();
    } else {
      scene.addEventListener('loaded', hideInitialSplash);
    }
  }
}

function hideInitialSplash() {
  const loader = document.getElementById("ar-loader");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => {
      loader.style.display = "none";
      // Show Hiro scanning overlay
      startHiroSplash();
    }, 500);
  }
}

// 2. Hiro Scanning Splash Screen (10 seconds)
function startHiroSplash() {
  const hiroSplash = document.getElementById("hiro-splash");
  if (hiroSplash) {
    hiroSplash.classList.remove("hidden");
  }

  let timeLeft = 10;
  const hiroSecondsEl = document.getElementById("hiro-seconds");

  hiroTimer = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      hiroSecondsEl.innerText = timeLeft;
    } else {
      clearInterval(hiroTimer);
      // Timeout reached, go directly to quiz
      triggerQuizTransition();
    }
  }, 1000);
}

function triggerQuizTransition() {
  if (quizStarted) return;
  quizStarted = true;

  // Clear timer in case marker detected before timeout
  if (hiroTimer) {
    clearInterval(hiroTimer);
  }

  // Hide Hiro splash overlay
  const hiroSplash = document.getElementById("hiro-splash");
  if (hiroSplash) {
    hiroSplash.classList.add("hidden");
  }

  // Hide helper banner completely since camera stream is stopping
  const arHelper = document.getElementById("ar-helper");
  if (arHelper) {
    arHelper.classList.add("hidden");
  }

  // Turn off the webcam stream and hide A-Frame scene
  stopCameraStream();

  // Load and show the Quiz Modal automatically
  startQuiz();
}

// AR.js Marker Detection registration component
AFRAME.registerComponent('marker-listener', {
  init: function () {
    const marker = this.el;
    
    marker.addEventListener('markerFound', function() {
      if (isMarkerDetected) return; // prevent repeated triggers
      isMarkerDetected = true;
      console.log("Hiro Marker Found!");
      
      // If we are still in the scanning splash phase, immediately proceed to quiz!
      if (!quizStarted) {
        triggerQuizTransition();
      }
    });

    marker.addEventListener('markerLost', function() {
      console.log("Hiro Marker Lost!");
    });
  }
});

// Quiz Initiation
function startQuiz() {
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

  // Setup results inside bottom sheet
  const resultBlock = document.getElementById("sheet-result-block");
  const statusBanner = document.getElementById("sheet-status-banner");
  const resultMessage = document.getElementById("sheet-result-message");
  const titleLabel = document.getElementById("sheet-title-label");

  resultBlock.classList.remove("hidden");
  titleLabel.innerText = "CERITA & FAKTA SEJARAH";

  if (isCorrect) {
    statusBanner.innerText = "VALIDASI BERHASIL";
    statusBanner.className = "status-banner status-success";
    resultMessage.innerHTML = `<strong>Hebat! Jawabanmu benar.</strong><br>Kamu dapat mengklaim dan membeli situs <strong>${currentSite.name}</strong> pada papan permainan board game fisik.`;
  } else {
    statusBanner.innerText = "VALIDASI GAGAL";
    statusBanner.className = "status-banner status-failed";
    resultMessage.innerHTML = `<strong>Aduh! Jawabanmu kurang tepat.</strong><br>Kamu <strong>belum dapat</strong> mengklaim situs <strong>${currentSite.name}</strong> pada putaran ini.<br><span style="font-size:11px; opacity:0.7;">Berdasarkan aturan permainan, kamu dilarang mengulang kuis ini.</span>`;
  }

  // Slide up the story sheet containing the historical text
  const storySheet = document.getElementById("story-sheet");
  storySheet.classList.add("open");
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

// Stop and release camera tracks to prevent battery drain and switch back to normal web background
function stopCameraStream() {
  // Find all active video elements and stop their media tracks
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.srcObject) {
      try {
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
      } catch (err) {
        console.error("Error stopping video stream track:", err);
      }
    }
    video.remove();
  });

  // Remove AR.js injected video streams from DOM
  const arjsVideos = document.querySelectorAll('.arjs-video');
  arjsVideos.forEach(el => el.remove());

  // Hide/remove A-Frame scene element
  const scene = document.querySelector('a-scene');
  if (scene) {
    try {
      scene.style.display = "none";
      scene.remove();
    } catch (e) {
      console.warn("A-Frame scene removal warning:", e);
    }
  }

  // Restore scroll overflow settings that AR.js may have overridden
  document.body.style.overflow = "auto";
  const htmlEl = document.documentElement;
  if (htmlEl) {
    htmlEl.style.overflow = "auto";
  }
}
