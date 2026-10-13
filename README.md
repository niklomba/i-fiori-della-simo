# I FIORI della SIMO — v0.1.1 (PWA pronta per pubblicazione)

Prima versione dell'app personale per coltivare e curare piante. Progetto **separato** da «Dalla Simo». Branding e mascotte scelti dall'utente.

## Funzioni disponibili ORA

- PWA responsive in italiano, installabile tramite browser quando pubblicata su HTTPS.
- Catalogo iniziale ricercabile con **22 schede botaniche orientative**.
- Giardino personale con foto, nomi, posizioni, note ed esposizione.
- Registrazione delle annaffiature e concimazioni, con storico per pianta.
- Diario di potatura, rinvaso e osservazioni.
- Calendario delle prossime cure, con intervalli modificabili.
- Guida **manuale** alle possibili cause di sei sintomi delle piante (non diagnostica automatica).
- Backup completo JSON esportabile e importabile (incluse fotografie, compresse localmente).
- Archivio con IndexedDB **solo sul dispositivo**: nessun login, sincronizzazione, analytics o pubblicità.
- Cache PWA per utilizzo offline **dopo** il primo caricamento su HTTPS o localhost.

## Funzioni NON disponibili in questa versione

- Riconoscimento automatico della pianta da fotografia.
- Diagnosi delle malattie tramite IA/fotografia.
- Chatbot botanico intelligente.
- Notifiche di sistema con app chiusa.
- Meteo geolocalizzato e sincronizzazione fra dispositivi.

Queste aree sono previste come fasi successive: non esistono finti pulsanti che simulino funzionalità non implementate.

## Prova da PC Windows

1. Estrai lo ZIP in una cartella.
2. Metodo più semplice: apri **`anteprima-autonoma.html`** con Chrome o Edge. Se il browser impedisce il salvataggio locale dei file aperti con `file://`, usa il metodo seguente.
3. Se Python è già installato sul computer, apri il terminale nella cartella estratta ed esegui:
   `python -m http.server 8000`
4. Apri `http://localhost:8000/` in Chrome, Edge o Firefox.

Per installare l'app come icona indipendente su Android o iPhone tramite browser, va pubblicata sotto **HTTPS** (ad esempio in un nuovo repository GitHub con GitHub Pages). Non è necessario un account per usare l'app; pubblicare il codice non pubblica il tuo archivio personale, che resta sul tuo dispositivo.

**Importante:** non aprire un indirizzo diverso pensando di ritrovare automaticamente i dati (es. file locale, localhost e futuro dominio GitHub Pages hanno archivi separati). Usa **Altro → Esporta il backup** e poi **Importa un backup** per spostare i dati da un indirizzo all'altro.

## Privacy, limiti e sicurezza

- Il browser salva i dati in IndexedDB per **quell'origine**, **quel profilo** e **quel dispositivo**.
- La cancellazione dei dati del browser, l'uso in navigazione in incognito o la rimozione dell'app può causare perdita dei dati. Fai backup regolari.
- Le immagini vengono compresse a max 1000 px, in JPEG, prima di essere memorizzate.
- Il calendario usa intervalli indicativi: **non** irriga automaticamente e non verifica umidità, meteo o substrato.
- Le indicazioni di tossicità e cura sono note generali, non certificate per ogni cultivar o situazione.
- Il catalogo non si sostituisce a un botanico o tecnico fitosanitario.
- L'importazione richiede un file JSON generato dall'app e sovrascrive i dati solo dopo conferma.

## File principali

- `index.html` — interfaccia e navigazione.
- `styles.css` — UI responsive.
- `app.js` — gestione piante, database, calendario, diario e backup.
- `catalogo.js` — dati delle 22 schede botaniche iniziali.
- `manifest.webmanifest`, `sw.js`, `icons/` — installazione PWA e cache offline.
- `anteprima-autonoma.html` — versione di prova autonoma senza server (alcuni browser limitano la persistenza da `file://`).
- `tests/test_ui.py` — test UI eseguito su una pagina con database simulato (non sostituisce il collaudo su dispositivo reale).

Versione 0.1.1. Nessuna modifica o pubblicazione del repository «Dalla Simo».

## Installazione Android e iPhone

Vedi `ISTRUZIONI_ANDROID_IPHONE.md` per pubblicazione su GitHub Pages, installazione nei due sistemi e backup. L’app è installabile come PWA da browser quando disponibile su HTTPS.
