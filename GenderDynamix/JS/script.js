//Hamburger Menu
const hamburger = document.querySelector(".hamburger");
const navRight = document.querySelector(".nav-right");
const dropdowns = document.querySelectorAll(".dropdown");

//Toggle Mobile View
hamburger.addEventListener("click", (e) => {
  e.stopPropagation();
  hamburger.classList.toggle("active");
  navRight.classList.toggle("active");

  //Disable/Enable Body Scroll
  if (navRight.classList.contains("active")) {
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
  } else {
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
  }
});

// Handle dropdown clicks on mobile
dropdowns.forEach((dropdown) => {
  const dropdownLink = dropdown.querySelector("a");

  dropdownLink.addEventListener("click", (e) => {
    if (window.innerWidth <= 968) {
      if (!dropdown.classList.contains("active")) {
        e.preventDefault();
        e.stopPropagation();

        dropdowns.forEach((d) => {
          if (d !== dropdown) d.classList.remove("active");
        });

        dropdown.classList.add("active");
      }
    }
  });
});

//Close menu when clicking outside
document.addEventListener("click", (e) => {
  if (!navRight.contains(e.target) && !hamburger.contains(e.target)) {
    hamburger.classList.remove("active");
    navRight.classList.remove("active");

    // Re-enable scrolling
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
  }
});

//Close menu when clicking a link
const topLevelLinks = document.querySelectorAll(
  ".nav-right a:not(.dropdown > a)",
);
topLevelLinks.forEach((link) => {
  link.addEventListener("click", () => {
    hamburger.classList.remove("active");
    navRight.classList.remove("active");

    // Re-enable scrolling
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
  });
});

//Email Obfuscation
document.querySelectorAll(".email-link").forEach((link) => {
  const user = link.dataset.user;
  const domain = link.dataset.domain;
  link.href = `mailto:${user}@${domain}`;
});

/*Privacy Notice */
//Function to hide privacy banner
function hidePrivacyBanner() {
  const banner = document.getElementById("privacyBanner");
  if (banner) {
    banner.classList.remove("show");
    setTimeout(() => {
      banner.style.visibility = "hidden";
    }, 400);
  }
}

function acceptPrivacy() {
  localStorage.setItem("gdnz-privacy-consent", "accepted");
  hidePrivacyBanner();
}

function declinePrivacy() {
  localStorage.setItem("gdnz-privacy-consent", "declined");
  hidePrivacyBanner();
}

//Privacy banner modal logic
function openModal() {
  const modal = document.getElementById("privacyModal");
  if (modal) {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // Fix: use "hidden" as a string
  }
}

function closeModal() {
  const modal = document.getElementById("privacyModal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

// Consolidate everything into ONE listener
window.addEventListener("DOMContentLoaded", () => {
  // 1. Privacy Banner Display
  const consentStatus = localStorage.getItem("gdnz-privacy-consent");
  const banner = document.getElementById("privacyBanner");

  if (banner && !consentStatus) {
    banner.style.visibility = "visible";
    setTimeout(() => {
      banner.classList.add("show");
    }, 1000);
  } else if (banner) {
    banner.style.visibility = "hidden";
  }

  // 2. Learn More Link
  const learnMoreLink = document.querySelector(".privacy-content a");
  if (learnMoreLink) {
    learnMoreLink.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
  }

  // 3. Accessibility: Close modal on Esc key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });
});

/*Copyright Year*/
document.getElementById("year").textContent = new Date().getFullYear();

// Accordion toggle functionality
function toggleAccordion(header) {
  const button = header.querySelector(".accordion-toggle, .form-collapse-btn");
  const content = header.nextElementSibling;
  const container =
    header.closest(".form-card-container") || header.parentElement;

  button.classList.toggle("collapsed");
  content.classList.toggle("collapsed");

  // This is the key part that shrinks the actual card padding
  if (container) {
    container.classList.toggle("is-collapsed");
  }

  const isExpanded = !content.classList.contains("collapsed");
  button.setAttribute("aria-expanded", isExpanded);
}

/*Back to top Button*/
const backToTopButton = document.getElementById("backToTop");

//Show/hide button based on scroll position
window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTopButton.classList.add("show");
  } else {
    backToTopButton.classList.remove("show");
  }
});

//Smooth Scrolling to top when clicked
backToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

//Safety Exit
const safetyBtn = document.getElementById("quickExit");
window.addEventListener("scroll", () => {
  const scrollPosition = window.scrollY;

  if (scrollPosition > 300) {
    safetyBtn.classList.add("show");
  } else {
    safetyBtn.classList.remove("show");
  }
});

// Triple Escape Logic
const SafetyExit = {
  pressCount: 0,
  timeout: null,
  targetUrl: "https://www.stuff.co.nz/",

  trigger() {
    // Clear session data to protect user privacy
    sessionStorage.clear();
    window.location.replace(this.targetUrl);
  },

  handleKeydown(e) {
    if (e.key === "Escape") {
      const modal = document.getElementById("privacyModal");
      const isModalOpen = modal && modal.classList.contains("active");

      //Logic to prevent modal exit from triggering safety exit
      if (isModalOpen) {
        closeModal();
        this.pressCount = 0;
        return;
      }

      e.preventDefault();
      this.pressCount++;

      clearTimeout(this.timeout);

      if (this.pressCount === 3) {
        this.trigger();
        return;
      }

      this.timeout = setTimeout(() => {
        this.pressCount = 0;
      }, 1500);
    }
  },
};

// Initialize listener
document.addEventListener("keydown", (e) => SafetyExit.handleKeydown(e));

/* Intersection Observer to hide Safety Exit at Footer */
const footer = document.querySelector(".main-footer");

const footerOptions = {
  root: null,
  threshold: 0,
  rootMargin: "0px 0px -20px 0px",
};

const footerObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      safetyBtn.classList.add("at-footer");
    } else {
      safetyBtn.classList.remove("at-footer");
    }
  });
}, footerOptions);

footerObserver.observe(footer);

//Image preview
// Get lightbox elements
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const captionText = document.getElementById("lightbox-caption");
const previewImages = document.querySelectorAll(".preview-img");
const closeBtn = document.querySelector(".lightbox-close");

//Add click event to preview all images
if (previewImages.length > 0 && lightbox && lightboxImg) {
  previewImages.forEach((img) => {
    img.addEventListener("click", () => {
      lightbox.style.display = "block";
      lightboxImg.src = img.src;
      if (captionText) {
        captionText.innerHTML = img.alt;
      }
    });
  });
}

// Close lightbox on clicking 'X'
if (closeBtn && lightbox) {
  closeBtn.onclick = () => {
    lightbox.style.display = "none";
  };
}

if (lightbox) {
  lightbox.onclick = (e) => {
    if (e.target === lightbox) {
      lightbox.style.display = "none";
    }
  };
}

//Close Lightbox with esc key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox && lightbox.style.display === "block") {
    lightbox.style.display = "none";
  }
});

//Marquee Pause/Play Toggle
const marqueeTrack = document.querySelector(".marquee-track");
const pauseBtn = document.getElementById("marqueePauseBtn");
if (pauseBtn && marqueeTrack) {
  pauseBtn.addEventListener("click", () => {
    const isPaused = marqueeTrack.classList.toggle("paused");

    //Update the icon and ARIA label for accessibility
    const icon = pauseBtn.querySelector("i");
    if (isPaused) {
      icon.className = "fas fa-play";
      pauseBtn.setAttribute("aria-label", "Play Animation");
    } else {
      icon.className = "fas fa-pause";
      pauseBtn.setAttribute("aria-label", "Pause Animation");
    }
  });
}

// Carousel configuration
let currentSlide = 0;
const slides = document.querySelectorAll(".carousel-slide");
const indicators = document.querySelectorAll(".carousel-indicator");
const totalSlides = slides.length;

// Captions for each slide (customize these)
const captions = [
  {
    title: "Community Gathering 2024",
    description: "Celebrating our community with pride and joy",
  },
  {
    title: "Support Workshop",
    description: "Providing education and resources to our community",
  },
  {
    title: "Pride Celebration",
    description: "Standing together in solidarity and celebration",
  },
  {
    title: "Our Team",
    description: "Dedicated to supporting and empowering our community",
  },
  {
    title: "Youth Support Program",
    description: "Creating safe spaces for young people to thrive",
  },
];

// Update carousel display
function updateCarousel() {
  const track = document.getElementById("carouselTrack");
  const captionElement = document.getElementById("carouselCaption");

  // Move the carousel track
  if (track) {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
  }

  // Update indicators
  indicators.forEach((indicator, index) => {
    if (index === currentSlide) {
      indicator.classList.add("active");
    } else {
      indicator.classList.remove("active");
    }
  });

  // Update caption
  if (captionElement && captions[currentSlide]) {
    captionElement.innerHTML = `
      <h3>${captions[currentSlide].title}</h3>
      <p>${captions[currentSlide].description}</p>
    `;
  }
}

// Move carousel by direction (-1 for prev, 1 for next)
function moveCarousel(direction) {
  currentSlide += direction;

  // Loop around
  if (currentSlide < 0) {
    currentSlide = totalSlides - 1;
  } else if (currentSlide >= totalSlides) {
    currentSlide = 0;
  }

  updateCarousel();
}

// Go to specific slide
function goToSlide(index) {
  currentSlide = index;
  updateCarousel();
}

// Auto-advance carousel every 5 seconds
let autoplayInterval = setInterval(() => {
  moveCarousel(1);
}, 5000);

// Pause autoplay on hover
const carouselContainer = document.querySelector(".carousel-container");
if (carouselContainer) {
  carouselContainer.addEventListener("mouseenter", () => {
    clearInterval(autoplayInterval);
  });

  carouselContainer.addEventListener("mouseleave", () => {
    autoplayInterval = setInterval(() => {
      moveCarousel(1);
    }, 5000);
  });
}

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    moveCarousel(-1);
  } else if (e.key === "ArrowRight") {
    moveCarousel(1);
  }
});

// Touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

if (carouselContainer) {
  carouselContainer.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  carouselContainer.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });
}

function handleSwipe() {
  if (touchEndX < touchStartX - 50) {
    moveCarousel(1);
  }
  if (touchEndX > touchStartX + 50) {
    moveCarousel(-1);
  }
}
