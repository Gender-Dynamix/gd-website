//===========================================
// NAVIGATION & MOBILE MENU
//===========================================
const hamburger = document.querySelector(".hamburger");
const navRight = document.querySelector(".nav-right");
const dropdowns = document.querySelectorAll(".dropdown");

//Toggle Mobile View
if (hamburger && navRight) {
  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    hamburger.classList.toggle("active");
    navRight.classList.toggle("active");

    //Update aria-expanded for accessibility
    const isExpanded = navRight.classList.contains("active");
    hamburger.setAttribute("aria-expanded", isExpanded);

    //Disable/Enable Body Scroll
    if (navRight.classList.contains("active")) {
      document.body.classList.add("no-scroll");
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
  });

  //Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!navRight.contains(e.target) && !hamburger.contains(e.target)) {
      hamburger.classList.remove("active");
      navRight.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");

      // Re-enable scrolling
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
  });
}

// Handle dropdown clicks on mobile
if (dropdowns.length > 0) {
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
}

//Close menu when clicking a link
const topLevelLinks = document.querySelectorAll(
  ".nav-right a:not(.dropdown > a)",
);
if (topLevelLinks.length > 0 && hamburger && navRight) {
  topLevelLinks.forEach((link) => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("active");
      navRight.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");

      // Re-enable scrolling
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    });
  });
}
//===========================================
// EMAIL OBFUSCATION
//===========================================

document.querySelectorAll(".email-link").forEach((link) => {
  const user = link.dataset.user;
  const domain = link.dataset.domain;
  link.href = `mailto:${user}@${domain}`;
});

//===========================================
// PRIVACY BANNER & SAFETY EXIT TUTORIAL MODAL
//===========================================
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

  // 3. Footer Privacy Link Logic
  const footerPrivacyLink = document.querySelector(".js-privacy-trigger");
  if (footerPrivacyLink) {
    footerPrivacyLink.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });
  }

  //4. Safety Tutorial Modal
  const hasSeenTutorial = localStorage.getItem("gdnz-safety-tutorial-seen");
  const tutorialModal = document.getElementById("safetyTutorialModal");

  if (tutorialModal && !hasSeenTutorial) {
    setTimeout(() => {
      tutorialModal.classList.add("active");
      tutorialModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
    }, 2000);
  }
});

//Function to close Safe Exit Tutorial Modal
function closeSafetyModal() {
  const modal = document.getElementById("safetyTutorialModal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }
}

function confirmSafetyTutorial() {
  //Mark as seen in local storage
  localStorage.setItem("gdnz-safety-tutorial-seen", "true");
  closeSafetyModal();
}

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

//===========================================
// MODALS
//===========================================

//Privacy Modal
function openModal() {
  const modal = document.getElementById("privacyModal");
  if (modal) {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }
}

function closeModal() {
  const modal = document.getElementById("privacyModal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }
}

//Terms & Conditions Modal
function openTermsModal() {
  const modal = document.getElementById("termsModal");
  if (modal) {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }
}

function closeTermsModal() {
  const modal = document.getElementById("termsModal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }
}

//===========================================
// AGE VERIFICATION MODAL
//===========================================

let pendingAgeRestrictedUrl = null;

//Intercept clicks on age-restricted websites
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-age-restricted='true']");

  if (link) {
    e.preventDefault();

    //Check if user is already verified age this session
    const isVerified = sessionStorage.getItem("gdnz-age-verified");

    if (isVerified === "true") {
      //Already verified, open link directly
      window.open(link.href, "_blank");
    } else {
      //Show age verification modal
      pendingAgeRestrictedUrl = link.href;
      openAgeVerificationModal();
    }
  }
});

function openAgeVerificationModal() {
  const modal = document.getElementById("ageVerificationModal");
  if (modal) {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }
}

function closeAgeVerificationModal() {
  const modal = document.getElementById("ageVerificationModal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }
  pendingAgeRestrictedUrl = null;
}

function proceedAgeRestricted() {
  //Remember age verification for this session
  sessionStorage.setItem("gdnz-age-verified", "true");

  //Open the link
  if (pendingAgeRestrictedUrl) {
    window.open(pendingAgeRestrictedUrl, "_blank");
  }

  closeAgeVerificationModal();
}

function cancelAgeRestricted() {
  closeAgeVerificationModal();
}

//===========================================
// COPYRIGHT YEAR
//===========================================
document.getElementById("year").textContent = new Date().getFullYear();

//===========================================
// ACCORDION
//===========================================

function toggleAccordion(header) {
  const button = header.querySelector(".accordion-toggle, .form-collapse-btn");
  const content = header.nextElementSibling;
  const container =
    header.closest(".form-card-container") || header.parentElement;

  button.classList.toggle("collapsed");
  content.classList.toggle("collapsed");

  if (container) {
    container.classList.toggle("is-collapsed");
  }

  const isExpanded = !content.classList.contains("collapsed");
  button.setAttribute("aria-expanded", isExpanded);
}

//===========================================
// BACK TO TOP BUTTON
//===========================================

const backToTopButton = document.getElementById("backToTop");

//Show/hide button based on scroll position
window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTopButton.classList.add("show");
  } else {
    backToTopButton.classList.remove("show");
  }
});

// Smooth Scrolling to top when clicked
backToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

//===========================================
// SAFETY EXIT
//===========================================

const safetyBtn = document.getElementById("quickExit");

if (safetyBtn) {
  window.addEventListener("scroll", () => {
    const scrollPosition = window.scrollY;

    if (scrollPosition > 300) {
      safetyBtn.classList.add("show");
    } else {
      safetyBtn.classList.remove("show");
    }
  });

  // Footer observer
  const footer = document.querySelector(".main-footer");
  if (footer) {
    const footerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            safetyBtn.classList.add("at-footer");
          } else {
            safetyBtn.classList.remove("at-footer");
          }
        });
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "0px 0px -20px 0px",
      },
    );
    footerObserver.observe(footer);
  }
}

//===========================================
// SAFETY EXIT - TRIPLE ESC LOGIC
//===========================================

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
  },
};

//===========================================
// LIGHTBOX
//===========================================

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const captionText = document.getElementById("lightbox-caption");
const previewImages = document.querySelectorAll(".preview-img");
const closeBtn = document.querySelector(".lightbox-close");

// Add click event to preview all images
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
//===========================================
// MARQUEE
//===========================================
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

//===========================================
// CAROUSEL
//===========================================

const slides = document.querySelectorAll(".carousel-slide");
const indicators = document.querySelectorAll(".carousel-indicator");
const carouselContainer = document.querySelector(".carousel-container");

if (slides.length > 0) {
  let currentSlide = 0;
  const totalSlides = slides.length;

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

  function updateCarousel() {
    const track = document.getElementById("carouselTrack");
    const captionElement = document.getElementById("carouselCaption");

    if (track) {
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
    }

    if (indicators.length > 0) {
      indicators.forEach((indicator, index) => {
        if (index === currentSlide) {
          indicator.classList.add("active");
        } else {
          indicator.classList.remove("active");
        }
      });
    }

    if (captionElement && captions[currentSlide]) {
      captionElement.innerHTML = `
        <h3>${captions[currentSlide].title}</h3>
        <p>${captions[currentSlide].description}</p>
      `;
    }
  }

  function moveCarousel(direction) {
    currentSlide += direction;

    if (currentSlide < 0) {
      currentSlide = totalSlides - 1;
    } else if (currentSlide >= totalSlides) {
      currentSlide = 0;
    }

    updateCarousel();
  }

  function goToSlide(index) {
    currentSlide = index;
    updateCarousel();
  }

  // Autoplay
  let autoplayInterval = setInterval(() => {
    moveCarousel(1);
  }, 5000);

  window.addEventListener("beforeunload", () => {
    clearInterval(autoplayInterval);
  });

  // Pause on hover
  if (carouselContainer) {
    carouselContainer.addEventListener("mouseenter", () => {
      clearInterval(autoplayInterval);
    });

    carouselContainer.addEventListener("mouseleave", () => {
      autoplayInterval = setInterval(() => {
        moveCarousel(1);
      }, 5000);
    });

    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    carouselContainer.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    carouselContainer.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 50) {
        moveCarousel(1);
      }
      if (touchEndX > touchStartX + 50) {
        moveCarousel(-1);
      }
    });
  }

  // Make functions global for HTML onclick
  window.moveCarousel = moveCarousel;
  window.goToSlide = goToSlide;
}

//=======================================================
// UNIFIED KEYBOARD HANDLER
// Priority: Modals -> Lightbox -> Safety Exit -> Carousel
//=======================================================
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    //1. Safety Tutorial Modal (Can't Escape Must Confirm)
    const tutorialModal = document.getElementById("safetyTutorialModal");
    if (tutorialModal && tutorialModal.classList.contains("active")) {
      //Don't allow ESC to close tutorial - User must click "Got it"
      SafetyExit.pressCount = 0;
      return;
    }

    //2. Close Age verification Modal
    const ageModal = document.getElementById("ageVerificationModal");
    if (ageModal && ageModal.classList.contains("active")) {
      cancelAgeRestricted();
      SafetyExit.pressCount = 0;
      return;
    }

    //3. Close Terms & Conditions Modal
    const termsModal = document.getElementById("termsModal");
    if (termsModal && termsModal.classList.contains("active")) {
      closeTermsModal();
      SafetyExit.pressCount = 0;
      return;
    }
    //4. Close Privacy Modal
    const privacyModal = document.getElementById("privacyModal");
    if (privacyModal && privacyModal.classList.contains("active")) {
      closeModal();
      SafetyExit.pressCount = 0;
      return;
    }

    //5. Close Lightbox if open
    const lightbox = document.getElementById("lightbox");
    if (lightbox && lightbox.style.display === "block") {
      lightbox.style.display = "none";
      SafetyExit.pressCount = 0;
      return;
    }

    //6. Safety exit
    SafetyExit.handleKeydown(e);
  }

  //Carousel Navigation (Non-Esc Keys)
  if (e.key === "ArrowLeft") {
    const carouselContainer = document.querySelector(".carousel-container");
    if (carouselContainer) moveCarousel(-1);
  }

  if (e.key === "ArrowRight") {
    const carouselContainer = document.querySelector(".carousel-container");
    if (carouselContainer) moveCarousel(1);
  }
});
