'use strict';
(() => {
  const banner = document.getElementById('pwaInstallBanner');
  const installLink = document.getElementById('pwaInstallButton');
  if (!banner || !installLink) return;

  let installPrompt = null;
  let justInstalled = false;
  const standaloneMedia = window.matchMedia('(display-mode: standalone)');
  const fullscreenMedia = window.matchMedia('(display-mode: fullscreen)');

  function isStandalone() {
    return standaloneMedia.matches || fullscreenMedia.matches ||
      window.navigator.standalone === true;
  }

  function updateInstallBanner() {
    banner.hidden = isStandalone() || justInstalled;
  }

  // On Android Chromium the browser alone decides whether this event is available.
  // On iOS the link opens our static illustrated installation instructions.
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    updateInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    justInstalled = true;
    updateInstallBanner();
  });

  installLink.addEventListener('click', async event => {
    // No browser installation prompt? Follow the real installation guide.
    if (!installPrompt) return;
    event.preventDefault();
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        justInstalled = true;
        updateInstallBanner();
      }
    } catch (error) {
      console.warn('Installazione automatica non disponibile:', error);
      window.location.assign(installLink.href);
    }
  });

  if (typeof standaloneMedia.addEventListener === 'function') {
    standaloneMedia.addEventListener('change', updateInstallBanner);
  } else if (typeof standaloneMedia.addListener === 'function') {
    standaloneMedia.addListener(updateInstallBanner);
  }

  window.addEventListener('pageshow', updateInstallBanner);
  document.addEventListener('visibilitychange', updateInstallBanner);
  updateInstallBanner();
})();
