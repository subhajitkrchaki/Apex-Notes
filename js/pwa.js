/**
 * ApexNotes - PWA Registration & Install Handler
 * Works on Windows (Edge / Chrome install app) and Android (Add to Home Screen).
 * Configured with relative scope for subfolder deployment (e.g., /apexnotes/).
 */

class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.installBtn = null;
    this.init();
  }

  init() {
    // 1. Register Service Worker with relative scope
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        // Register sw.js relative to the current subfolder location
        navigator.serviceWorker.register('./sw.js', { scope: './' })
          .then((reg) => {
            console.log('ApexNotes Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('ApexNotes Service Worker registration failed:', err);
          });
      });
    }

    // 2. Capture install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent browser default mini-infobar on mobile
      e.preventDefault();
      this.deferredPrompt = e;

      // Show install buttons if available
      this.updateInstallUI(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.updateInstallUI(false);
      if (window.App) {
        window.App.showToast('ApexNotes installed successfully! 🎉');
      }
    });
  }

  setInstallButton(buttonEl) {
    this.installBtn = buttonEl;
    if (this.installBtn) {
      this.installBtn.addEventListener('click', () => this.promptInstall());
    }
  }

  updateInstallUI(isAvailable) {
    if (this.installBtn) {
      this.installBtn.style.display = isAvailable ? 'flex' : 'none';
    }
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      if (window.App) {
        window.App.showToast('App is already installed or browser does not support install prompts. On mobile, use "Add to Home Screen" in your browser menu.');
      }
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    this.deferredPrompt = null;
    this.updateInstallUI(false);
  }
}

window.PWA = new PWAManager();
