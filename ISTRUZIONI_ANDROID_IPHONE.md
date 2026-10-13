# I FIORI della SIMO — installazione Android e iPhone

Questa versione 0.1.1 è una **PWA** installabile tramite browser. Non richiede pubblicazione su Google Play o App Store.

## Pubblicazione su GitHub Pages

1. Crea un nuovo repository **pubblico**, distinto da `dalla-simo`, nel tuo account GitHub.
2. Carica **il contenuto della cartella** estratta da questo ZIP nella **radice** del nuovo repository (index.html, app.js, manifest.webmanifest, icons/ ecc.). Non caricare soltanto il file ZIP, né lasciare una cartella contenitore sopra index.html.
3. Apri **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Seleziona `main` e `/(root)`, poi **Save**.
5. Quando GitHub ha completato la pubblicazione, l'indirizzo sarà nel formato `https://<utente>.github.io/<repository>/`. Il nome e l'indirizzo esatti si ricavano dalla pagina Pages; non presumerli prima della pubblicazione.
6. Apri quell'indirizzo sul telefono. La prima apertura richiede Internet; in seguito il service worker abilita la consultazione offline delle risorse già scaricate.

**Importante:** la pagina GitHub contiene esclusivamente il codice e le schede iniziali. Il giardino personale e le foto sono salvati nella memoria locale del dispositivo, mai pubblicati sul repository.

## Android

- Apri il sito con **Google Chrome**.
- Tocca il menu **⋮**, quindi **Installa app** o **Aggiungi a schermata Home** (la voce cambia in base alla versione).
- Conferma. L'icona «I FIORI della SIMO» apparirà sulla schermata Home.

## iPhone / iPad

- Apri il sito con **Safari**.
- Tocca **Condividi** o il menu della pagina; seleziona **Aggiungi alla schermata Home**.
- Se disponibile, scegli **Apri come app**, poi conferma **Aggiungi**.
- Potrai aprire l'app dall'icona sulla schermata Home. Non serve App Store.

## Come conservare i dati

- Archivio e fotografie personali sono memorizzati solo sul singolo dispositivo e sul relativo spazio di archiviazione web.
- Su iPhone, Safari e l'app installata potrebbero usare contenitori di dati separati: se aggiungi piante prima dell'installazione, esporta un backup e reimportalo nell'app installata.
- Vai in **Altro → Esporta il backup** regolarmente. Conserva il JSON su un supporto scelto da te.
- Per passare a un altro dispositivo, esporta il file e importalo manualmente. **Non c'è sincronizzazione automatica**.
- Non usare finestre anonime per i dati da conservare; evita di cancellare i dati del sito.

## Cosa manca ancora

Riconoscimento automatico dalle foto, diagnosi AI, notifiche push con app chiusa, meteo e sincronizzazione non sono implementati in questa prima versione.

## Test e limiti

Installazione e interfaccia sono predisposte per Android e iOS. Sono disponibili test automatici con browser Chromium mobile simulato; **il funzionamento su veri dispositivi Android e iPhone richiede collaudo sui telefoni**. Non è un'app nativa pubblicata negli store.
