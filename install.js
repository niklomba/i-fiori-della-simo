'use strict';
(() => {
  const banner = document.getElementById('pwaInstallBanner');
  const installButton = document.getElementById('pwaInstallButton');
  const dismissButton = document.getElementById('pwaInstallDismiss');
  const helpDialog = document.getElementById('pwaInstallDialog');
  const helpContent = document.getElementById('pwaInstallHelpContent');
  const closeButton = document.getElementById('pwaInstallHelpClose');
  if (!banner || !installButton || !dismissButton || !helpDialog || !helpContent || !closeButton) return;

  let deferredPrompt = null;
  let installedInThisSession = false;
  const dismissedKey = 'ifiori-install-promo-dismissed-session';
  const standaloneMedia = window.matchMedia('(display-mode: standalone)');

  function standalone() {
    return standaloneMedia.matches || window.navigator.standalone === true ||
      window.matchMedia('(display-mode: fullscreen)').matches;
  }

  function dismissed() {
    try { return window.sessionStorage.getItem(dismissedKey) === '1'; }
    catch (_) { return false; }
  }

  function hideBanner() { banner.hidden = true; }

  function updateVisibility() {
    const shouldHide = standalone() || installedInThisSession || dismissed();
    banner.hidden = shouldHide;
  }

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function showGuide() {
    let guide;
    if (isIOS()) {
      guide = '<p><strong>iPhone e iPad</strong></p>' +
        '<ol><li>Apri questo sito con <strong>Safari</strong> (non nel browser interno di WhatsApp o altre app).</li>' +
        '<li>Tocca <strong>Condividi</strong> (il quadrato con la freccia verso l’alto).</li>' +
        '<li>Seleziona <strong>Aggiungi alla schermata Home</strong>, poi conferma con <strong>Aggiungi</strong>.</li>' +
        '<li>Avvia I FIORI della SIMO dalla nuova icona sulla Home: il pulsante di installazione non comparirà.</li></ol>' +
        '<p>Su iPhone non è disponibile una finestra di installazione automatica come su Android.</p>';
    } else if (/Android/i.test(navigator.userAgent)) {
      guide = '<p><strong>Android</strong></p>' +
        '<ol><li>Apri questo indirizzo in <strong>Chrome</strong>.</li>' +
        '<li>Tocca il menu <strong>⋮</strong> e cerca <strong>Installa app</strong> o <strong>Aggiungi a schermata Home</strong>.</li>' +
        '<li>Conferma e apri I FIORI della SIMO dalla sua icona.</li></ol>' +
        '<p>La finestra automatica appare solo quando il browser ritiene l’app installabile. Se non compare, prova dal menu di Chrome.</p>';
    } else {
      guide = '<p><strong>Computer</strong></p>' +
        '<p>Apri il sito in Chrome o Edge e usa <strong>Installa app</strong> dal menu del browser o dall’icona di installazione nella barra degli indirizzi, se disponibile.</p>' +
        '<p>Per Android e iPhone, apri lo stesso collegamento dal telefono.</p>';
    }
    helpContent.innerHTML = guide;
    if (typeof helpDialog.showModal === 'function') helpDialog.showModal();
    else helpDialog.setAttribute('open', '');
  }

  function closeGuide() {
    if (typeof helpDialog.close === 'function') helpDialog.close();
    else helpDialog.removeAttribute('open');
  }

  window.addEventListener('beforeinstallprompt', event => {
    if (standalone()) return;
    event.preventDefault();
    deferredPrompt = event;
    updateVisibility();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installedInThisSession = true;
    hideBanner();
    closeGuide();
  });

  if (typeof standaloneMedia.addEventListener === 'function') {
    standaloneMedia.addEventListener('change', updateVisibility);
  } else if (typeof standaloneMedia.addListener === 'function') {
    standaloneMedia.addListener(updateVisibility);
  }

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
      showGuide();
      return;
    }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        installedInThisSession = true;
        hideBanner();
      } else {
        updateVisibility();
      }
    } catch (error) {
      console.warn('Installazione diretta non disponibile:', error);
      showGuide();
    }
  });

  dismissButton.addEventListener('click', () => {
    try { sessionStorage.setItem(dismissedKey, '1'); } catch (_) {}
    hideBanner();
  });

  closeButton.addEventListener('click', closeGuide);
  helpDialog.addEventListener('click', event => {
    if (event.target === helpDialog) closeGuide();
  });

  updateVisibility();
})();
