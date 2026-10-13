# I FIORI della SIMO — v0.2.0

PWA gratuita per Android e iPhone, separata dall'app Dalla Simo.

## Funzionalità
- 355 specie consultabili offline: 22 schede iniziali con consigli orientativi e 333 schede identificative essenziali.
- Ricerca estesa online tra le specie botaniche tramite API iNaturalist.
- Identificazione fotografica con Pl@ntNet: fotocamera/galleria, cinque risultati alternativi e aggiunta al giardino.
- Giardino personale, diario, promemoria di irrigazione e concimazione, backup JSON.
- Home compatta; calendario, backup e strumenti secondari sono raccolti in menu espandibili.

## Attivare il riconoscimento gratuito
Il riconoscimento richiede Internet e una chiave API Pl@ntNet gratuita personale. Le condizioni correnti prevedono fino a 500 identificazioni al giorno nel piano gratuito. Nessuna chiave è inclusa nel codice pubblico.

1. Registrati su https://my.plantnet.org/.
2. Genera una API key nelle impostazioni.
3. Abilita **Expose my API key (CORS)** e autorizza **https://niklomba.github.io** (senza percorso).
4. Nell'app apri **Identifica → Attiva il riconoscimento gratuito** e salva la chiave.
5. Scatta una foto o sceglila dalla galleria e premi **Identifica questa pianta**.

La chiave viene conservata in chiaro nel localStorage del browser, non nel repository. Non utilizzarla su dispositivi condivisi e non incollarla nelle chat. Revocala/rigenerala se ritieni che sia stata esposta.

**Privacy:** foto e dati del giardino restano nel browser del dispositivo, eccetto le immagini che scegli di inviare esplicitamente a Pl@ntNet per l'identificazione. Le ricerche estese inviano il termine cercato a iNaturalist. I risultati non sono conferme botaniche certe.

## Limiti e affidabilità
Le 333 nuove voci offline non hanno dati verificati di tossicità e irrigazione; non usare l'app per stabilire commestibilità o sicurezza di una specie. La fotocamera deve essere provata su dispositivi reali con chiave valida. Il calendario non invia notifiche quando l'app è chiusa; alcune funzioni online non sono utilizzabili offline.

## Installazione
https://niklomba.github.io/i-fiori-della-simo/

- Android: Chrome → ⋮ → **Installa app**.
- iPhone: Safari → **Condividi → Aggiungi alla schermata Home**.

Effettua backup periodici e **non cancellare i dati del sito** per aggiornare la PWA, altrimenti elimini anche il giardino personale.

## File principali
`catalogo.js` (22 schede), `catalogo-extra.js` (333 specie aggiunte), `identifica.js` (Pl@ntNet), `app.js` (interfaccia), `sw.js` (cache offline).


## Scanner botanico con fotocamera (v0.3.0)

- **Identifica → Avvia scanner**: richiede il permesso alla fotocamera posteriore, mostra il video in diretta con una cornice e acquisisce **una sola fotografia dopo circa 2 secondi** quando il video è pronto. Con una chiave API Pl@ntNet valida, la foto viene inviata e appaiono fino a 5 identificazioni possibili.
- **Riconosci ora**: acquisizione manuale immediata. **Foto**: apre la fotocamera del sistema operativo. **Galleria**: analizza una foto già presente.
- La videocamera viene spenta immediatamente dopo lo scatto, quando si preme «Chiudi fotocamera» e quando si passa a un'altra sezione; non viene trasmesso video continuo.
- Occorre HTTPS, Internet e **una chiave API Pl@ntNet personale** (https://my.plantnet.org/), da abilitare per uso CORS e autorizzare per il dominio https://niklomba.github.io. Senza chiave funziona la fotocamera ma **non l'identificazione AI**.
- Le fotografie sono inviate al servizio esterno solo dopo l'azione dell'utente; i dati salvati delle piante restano sul dispositivo.
- È un riconoscimento probabilistico: confrontare i risultati e le alternative; non affidarsi alla sola foto per dichiarare una pianta commestibile o non tossica.
- Per ricaricare dopo gli aggiornamenti, aprire nuovamente il link HTTPS; l'app conserva IndexedDB.
