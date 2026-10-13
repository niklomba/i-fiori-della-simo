'use strict';
/* Linee guida orientative, volutamente senza dosi assolute o diagnosi infondate. */
(() => {
  const speciesCare={
    ortensia:['Terriccio fresco, organico e drenante.','Mezz’ombra, preferibilmente sole del mattino; proteggi dai raggi estivi più forti.','Controlla spesso: la sete provoca appassimenti rapidi, ma non lasciare acqua stagnante.'],
    rosa:['Terreno fertile e drenante.','Preferisce diverse ore di sole e buona circolazione d’aria.','Bagna alla base quando necessario; limita foglie bagnate e ristagni.'],
    geranio:['Terriccio leggero, drenante.','Sole abbondante, con riparo nelle ore molto calde se necessario.','Lascia asciugare i primi centimetri fra le bagnature.'],
    orchidea:['Corteccia specifica per orchidee, non terriccio universale compatto.','Luce intensa ma indiretta, al riparo dal sole diretto forte.','Valuta colore delle radici e peso del vaso; lascia scolare completamente il coprivaso.'],
    pothos:['Terriccio leggero e drenante.','Luce diffusa; evita il sole diretto intenso.','Bagna quando i primi centimetri sono asciutti.'],
    monstera:['Terriccio arioso con drenaggio, eventualmente con corteccia/perlite.','Luce abbondante ma indiretta.','Controlla i primi centimetri prima di irrigare; evita sottovasi pieni.'],
    ficus:['Substrato fertile e drenante.','Luce diffusa intensa, evitare spostamenti e correnti fredde.','Bagna in modo regolare secondo asciugatura del terriccio.'],
    aloe:['Mix molto drenante per succulente.','Ambiente luminoso, adattandola gradualmente al sole.','Lascia asciugare completamente il substrato; evita annaffiature frequenti.'],
    lavanda:['Terreno povero e molto drenante.','Pieno sole e buona ventilazione.','Tollera la siccità meglio del terreno costantemente bagnato.'],
    rosmarino:['Terreno minerale molto drenante.','Sole e aria; in casa richiede molta luce.','Aspetta che il substrato sia asciutto in parte prima di bagnare.'],
    basilico:['Terreno fertile ma drenante.','Molta luce, evitando forte stress da caldo o freddo.','Controlla spesso il terriccio in vaso; non lasciare seccare del tutto a lungo.'],
    menta:['Terreno fertile che trattenga un po’ di umidità, ma con drenaggio.','Luce diffusa o sole non eccessivo.','Preferisce umidità regolare senza ristagni.'],
    sansevieria:['Terriccio molto drenante.','Da luce diffusa a buona luminosità, evitando cambi bruschi.','Lascia asciugare a fondo; molta cautela in inverno.'],
    zamioculcas:['Miscela leggera e molto drenante.','Luce indiretta; tollera condizioni meno luminose, cresce più lentamente.','Aspetta asciugatura marcata: i rizomi conservano acqua.'],
    gelsomino:['Terriccio fertile e drenante.','Esposizione luminosa e adeguata alla specie.','Regola acqua e potatura secondo la specie effettiva.'],
    ciclamino:['Terriccio drenante.','Posizione fresca e luminosa, senza sole caldo.','Mantieni umidità moderata; non lasciare acqua nella corona.'],
    camelia:['Terriccio acido e drenante.','Mezz’ombra, riparo dal sole estivo intenso.','Umidità uniforme, evitare acqua stagnante.'],
    azalea:['Terriccio per acidofile, fresco e drenante.','Mezz’ombra luminosa.','Mantieni umido senza saturare; attenzione alla sensibilità al calcare.'],
    ulivo:['Suolo molto drenante.','Sole pieno, meglio all’aperto.','Varia molto fra giovane pianta in vaso e albero radicato in terra.'],
    limone:['Terriccio per agrumi drenante.','Molto sole, al riparo da gelate.','Controlla più spesso in estate nei vasi piccoli; drenaggio fondamentale.'],
    dalia:['Terriccio fertile e drenante.','Sole con protezione da temperature estreme.','Durante crescita e fioritura mantieni umidità equilibrata.'],
    peonia:['Terreno fertile e drenante.','Sole o lieve ombra secondo il clima.','Mantieni acqua equilibrata; evita trapianti frequenti.']
  };
  function family(c){
    if(!c)return 'nonverificata';
    if(c.essenziale)return 'nonverificata';
    if(c.tipo==='Succulenta')return 'succulenta';
    if(c.tipo==='Interno')return 'interno';
    if(c.tipo==='Aromatica')return 'aromatica';
    if(c.tipo==='Albero')return 'albero';
    return 'fiorita';
  }
  function moistureFor(cat){
    if(cat==='succulenta')return 'Aspetta che il substrato sia asciutto quasi o del tutto, anche in profondità.';
    if(cat==='interno')return 'Controlla con un dito i primi 2–4 cm del terriccio: bagna soltanto se asciutti secondo la specie.';
    if(cat==='aromatica')return 'Controlla il substrato: mediterranee come rosmarino e lavanda preferiscono asciugare più di basilico e menta.';
    if(cat==='fiorita')return 'Verifica l’umidità vicino alle radici, non solo in superficie; alcune fiorite richiedono maggiore regolarità.';
    return 'Controlla l’umidità del terreno e la stagione prima di decidere se annaffiare.';
  }
  function waterRange(pot){
    const d=Number(pot);
    if(!Number.isFinite(d)||d<8||d>80)return null;
    // Euristica *illustrativa* per vasi con fori, non dose agronomica universale.
    const middle=Math.round((d*d*0.9)/25)*25;
    const lo=Math.max(50,Math.round(middle*.65/25)*25);
    const hi=Math.max(lo+25,Math.round(middle*1.4/25)*25);
    return {lo,hi};
  }
  function advise(plant,cat){
    const kind=family(cat),detail=speciesCare[cat?.id];
    const diameter=Number(plant?.potDiameterCm);
    const estimate=plant?.containerType==='vaso'&&plant?.drainage==='si'&&kind!=='nonverificata'?
      waterRange(diameter):null;
    const drainage=plant?.drainage==='no'?'ATTENZIONE: vaso senza fori. Rischio ristagno: valuta un contenitore drenante prima di irrigare.':
      plant?.drainage==='si'?'Verifica che i fori scarichino liberamente; svuota il sottovaso.':
      'Verifica che il vaso abbia fori di drenaggio prima di aggiungere acqua.';
    const amount=plant?.waterAmountMl>0?
      'Quantità personale impostata: '+plant.waterAmountMl+' ml per intervento. È un promemoria, non una dose automatica: modifica secondo terreno e stagione.':
      estimate?
      'Per vaso da '+diameter+' cm, riferimento molto indicativo: '+estimate.lo+'–'+estimate.hi+' ml. Non usarlo come dose fissa: fermati se il substrato è saturo, osserva l’acqua in uscita e regola sui bisogni reali.':
      'Non è possibile definire una quantità affidabile senza dati sul vaso, drenaggio e specie. Se il terreno lo richiede, irriga lentamente e osserva l’assorbimento e l’eventuale deflusso.';
    const exposition=detail?.[1] || (cat&&!cat.essenziale?cat.luce+' (orientativo). Verifica le esigenze effettive della specie e l’intensità stagionale.':
      'Da verificare per questa specie: non assegnare sole o ombra senza identificazione attendibile.');
    return {
      verified:!!(cat&&!cat.essenziale),
      amount,
      moisture:detail?.[2]||moistureFor(kind),
      position:exposition,
      soil:detail?.[0]||'Terriccio specifico e drenaggio da verificare per la specie. Evita substrati saturi; controlla che il contenitore scarichi.',
      drainage,
      fertilizer:'Non aumentare le dosi a caso. Segui l’etichetta del concime adatto alla specie e concima preferibilmente nella fase di crescita, non una pianta già stressata.',
      toxicity:cat&&!cat.essenziale?cat.tossica:'Tossicità non verificata: evita l’ingestione da parte di bambini o animali.'
    };
  }
  window.SIMO_CARE={advise,waterRange};
})();
