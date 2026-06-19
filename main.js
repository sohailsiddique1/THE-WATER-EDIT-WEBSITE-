/* ----------------------------------------------------
   CONFIG & GLOBAL VARIABLES
---------------------------------------------------- */
const TOTAL_FRAMES = 174;
const images = [];
let currentFrameIndex = 0;
let targetFrameIndex = 0;
const easeFactor = 0.08; // Smooth momentum factor for kinetic scroll animation

// DOM Elements
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');
const progressFill = document.getElementById('loader-progress');
const percentageText = document.getElementById('loader-percentage');
const scrollIndicator = document.getElementById('scroll-indicator');

/* ----------------------------------------------------
   IMAGE PRELOADING
---------------------------------------------------- */
function getFramePath(index) {
  // Frames are named ezgif-frame-001.jpg to ezgif-frame-174.jpg
  const paddedIndex = String(index).padStart(3, '0');
  return `./images/ezgif-frame-${paddedIndex}.jpg`;
}

function preloadImages() {
  return new Promise((resolve) => {
    let loadedCount = 0;

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        loadedCount++;
        const percent = Math.round((loadedCount / TOTAL_FRAMES) * 100);
        progressFill.style.width = `${percent}%`;
        percentageText.textContent = `${percent}%`;

        // Once the first image is loaded, draw it immediately so canvas isn't blank
        if (loadedCount === 1) {
          drawFrame(img);
        }

        if (loadedCount === TOTAL_FRAMES) {
          // Add a small delay for premium visual pacing
          setTimeout(() => {
            hideLoader();
            resolve();
          }, 600);
        }
      };
      
      img.onerror = () => {
        console.error(`Failed to load frame ${i} at path: ${img.src}`);
        // Increment count so the loader doesn't get stuck in case of single image failures
        loadedCount++;
        if (loadedCount === TOTAL_FRAMES) {
          hideLoader();
          resolve();
        }
      };

      images.push(img);
    }
  });
}

function hideLoader() {
  loader.classList.add('loader-hidden');
}

/* ----------------------------------------------------
   CANVAS RENDERING & SCALING
---------------------------------------------------- */
function resizeCanvas() {
  // Set dimensions based on device pixel ratio for crystal clear rendering
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  // Re-draw the current frame on resize
  const frameToDraw = images[Math.round(currentFrameIndex)] || images[0];
  if (frameToDraw) {
    drawFrame(frameToDraw);
  }
}

function drawFrame(img) {
  if (!img) return;
  
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;
  
  if (imgWidth === 0 || imgHeight === 0) return; // Prevent division by zero
  
  const imgRatio = imgWidth / imgHeight;
  const canvasRatio = canvasWidth / canvasHeight;
  
  let drawWidth, drawHeight, drawX, drawY;
  
  if (canvasRatio > imgRatio) {
    // Canvas is wider than the image aspect ratio (Crop top/bottom)
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgRatio;
    drawX = 0;
    drawY = (canvasHeight - drawHeight) / 2;
  } else {
    // Canvas is taller than the image aspect ratio (Crop sides)
    drawWidth = canvasHeight * imgRatio;
    drawHeight = canvasHeight;
    drawX = (canvasWidth - drawWidth) / 2;
    drawY = 0;
  }
  
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

/* ----------------------------------------------------
   SCROLL ENGINE LOOP (LERP FOR KINETIC SMOOTHNESS)
---------------------------------------------------- */
function updateScroll() {
  const scrollTop = window.scrollY;
  // Calculate maximum height the user can scroll
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  
  // Guard against division by zero if page is not scrollable
  const scrollFraction = maxScroll > 0 ? scrollTop / maxScroll : 0;
  
  // Target index maps smoothly from 0 to total frames - 1
  targetFrameIndex = Math.min(TOTAL_FRAMES - 1, Math.max(0, scrollFraction * (TOTAL_FRAMES - 1)));
  
  // Scroll Indicator visibility toggle
  if (scrollTop > 50) {
    scrollIndicator.classList.add('indicator-hidden');
  } else {
    scrollIndicator.classList.remove('indicator-hidden');
  }
}

// Custom animation loop that runs independent of event listener frequencies
function renderLoop() {
  // LERP: currentFrameIndex slowly catches up to targetFrameIndex
  const delta = targetFrameIndex - currentFrameIndex;
  
  if (Math.abs(delta) > 0.01) {
    currentFrameIndex += delta * easeFactor;
    
    // Draw the image frame matching the current easing step
    const imgIndex = Math.round(currentFrameIndex);
    const activeImage = images[imgIndex];
    
    if (activeImage && activeImage.complete) {
      drawFrame(activeImage);
    }
  }
  
  requestAnimationFrame(renderLoop);
}

/* ----------------------------------------------------
   INTERSECTION OBSERVER FOR FADING SECTIONS & ACTIVE NAV LINK
---------------------------------------------------- */
function setupIntersectionObserver() {
  const sections = document.querySelectorAll('.scroll-section');
  const navLinks = document.querySelectorAll('.nav-link');

  const options = {
    root: null,
    rootMargin: '-20% 0px -20% 0px', // Trigger slightly before middle of screen
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Fade in section card
        entry.target.classList.add('active-section');
        
        // Update navigation link state
        const targetId = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${targetId}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      } else {
        // Optional: fade out when scrolled far away
        // entry.target.classList.remove('active-section');
      }
    });
  }, options);

  sections.forEach(section => {
    observer.observe(section);
  });
}

/* ----------------------------------------------------
   INITIALIZATION
---------------------------------------------------- */
async function init() {
  // Establish baseline dimensions
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Begin preloading assets
  await preloadImages();
  
  // Set up listeners once loaded
  window.addEventListener('scroll', updateScroll, { passive: true });
  setupIntersectionObserver();
  
  // Trigger initial frame layout calculation
  updateScroll();
  
  // Boot up kinetic render animation loop
  renderLoop();
}

window.addEventListener('DOMContentLoaded', init);
