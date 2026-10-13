# I FIORI della SIMO — stato funzionale e roadmap

Ispirazione di flusso (non copia di contenuti o grafica): PictureThis – Identifica Piante.
**Vincoli:** italiano, PWA gratuita, nessun abbonamento dell'app, dati personali locali, nessun backend aggiuntivo.

## Operativo nel codice attuale (v0.4)
- Home essenziale con 3 azioni: Scansiona, Diagnosi, Le mie piante.
- Identificazione specie da fotocamera/galleria Pl@ntNet (chiave personale per ogni dispositivo), alternative e salvataggio nel giardino.
- Diagnosi fotografica malattie/parassiti con endpoint Pl@ntNet /v2/diseases/identify e stessa chiave: solo patologie supportate; suggerimenti preliminari, senza prescrizioni chimiche.
- Guida ai sintomi separata e offline; primi controlli di drenaggio, luce, umidità e presenza di insetti.
- Enciclopedia locale di 355 specie (22 schede dettagliate; altre specie identificative), ricerca mondiale iNaturalist quando online.
- Scheda pianta: esposizione, posizione, terreno, drenaggio, tipo di coltivazione, diametro vaso, volume personale d'acqua, stimatore indicativo per specie curate, avvertenze.
- Diario e calendario delle cure, con annullamento da pulsante immediato o X nel diario: elimina evento e ripristina data di cura.
- Backup/importazione JSON sul dispositivo, nessun account obbligatorio dell'app, funzionamento offline delle sezioni locali.

## Limitazioni da non nascondere
- Lo scanner e la diagnosi richiedono Internet e chiave Pl@ntNet CORS autorizzata. Nessuna identificazione è garantita.
- Copertura Pl@ntNet delle malattie/parassiti limitata. I risultati AI sono ipotesi da verificare.
- Nessuna fotografia permette di affermare con certezza che una pianta sia commestibile, non tossica o sana.
- Il numero di giorni e il volume d'acqua dipendono da stagione, substrato, dimensioni, temperatura e drenaggio; non sono prescrizioni automatiche.
- Le 333 voci botaniche extra non dispongono di cure colturali verificate.
- Nessuna notifica push garantita quando l'app è chiusa; le scadenze sono consultabili nell'app.
- Non sono previsti sincronizzazione cloud o fotodiagnosi offline.

## Prossime priorità
1. **Verifica dal vivo**: prima identificazione/diagnosi con foto reali su Android e iPhone; usabilità, autorizzazioni camera, messaggi di errore e compatibilità.
2. **Cure per specie**: ampliare e verificare i profili botanici, terriccio, pH, luce, umidità, potatura, stagione e tossicità usando fonti affidabili, senza inventare valori.
3. **Programma di cura adattivo**: calibrare i promemoria alle condizioni inserite dall'utente e all'andamento delle cure; non applicare automaticamente volumi o trattamenti.
4. **Monitoraggio dello stato della pianta**: foto del medesimo esemplare nel tempo, note sui sintomi e andamento registrato, evitando false diagnosi.
5. **Meteo contestuale**: solo con consenso e localizzazione volontaria, con indicazione della fonte e adattamento prudente dei promemoria.
6. **Altri strumenti utili**: semina e rinvaso, diario di crescita, filtri per ambiente, accessibilità e miglioramento del contrasto.
7. **Funzionalità a costo aggiuntivo**: assistente AI generativo, notifiche remote e sincronizzazione devono essere valutati separatamente; niente funzioni fittizie nella UI.

## Principio di progettazione
Prima schermata: Scansiona, Diagnosi, Le mie piante. Scadenze visibili sotto; Enciclopedia, Calendario esteso, guida ai sintomi e backup nel menu Altro. Niente numeri di versione o istruzioni di installazione nella normale esperienza d'uso, fatta eccezione per un eventuale pulsante installazione nel browser finché l'app non è installata.
