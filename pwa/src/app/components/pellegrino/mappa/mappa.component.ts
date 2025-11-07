import {
  Component,
  AfterViewInit,
  ViewChild,
  Input,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import * as leaflet from 'leaflet';
import 'leaflet-gpx';
import { RealtimeService } from '../../../services/realtimeService/realtime-service';
import { NotifyService } from '../../../services/notifyService/notify-service';
import { environment } from '../../../../environments/environment';
import {
  PrenotazioneColor,
  PrenotazioneWithStruct,
  Viaggio,
  TappaViaggio,
  TimelineError,
  Luogo,
  Struttura,
  StructWithProprietario,
} from '../../../../typings/custom-type.types';
import { ViaggioForm } from '../viaggio-form/viaggio-form';
import { Timeline } from '../timeline/timeline';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { PrenotazionePopup } from '../prenotazione-popup/prenotazione-popup';
import { ModificaViaggioForm } from '../modifica-viaggio-form/modifica-viaggio-form';

declare let L: typeof leaflet; // serve per far funzionare leaflet-gpx in fase di build ottimizzata, altrimenti viene rimpiazzato L con un altra variabile e non trova il costruttore

// serve per far funzionare correttamente le icone dei marker di leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'assets/marker/pin-icon-start.png',
  iconRetinaUrl: 'assets/marker/pin-icon-start.png',
  shadowUrl: 'assets/marker/pin-shadow.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface CustomMarker extends L.Marker {
  strutturaId?: number;
} // marker custom con l'id della struttura per poterlo eliminare tramite la ricerca per id Struttura

const SOGLIA_ZOOM_STRUCT = 12; // costante per la soglia minima di zoom per cui far apparire le icone delle strutture

@Component({
  selector: 'mappa',
  templateUrl: './mappa.component.html',
  styleUrls: ['./mappa.component.scss'],
  imports: [
    ViaggioForm,
    CommonModule,
    Timeline,
    PrenotazionePopup,
    ModificaViaggioForm,
  ],
})
export class MappaComponent implements AfterViewInit, OnInit {
  @Input() username: string = '';
  private map: any;
  showPathPopup: boolean = false;
  viaggioAttivo: Viaggio | undefined = undefined;
  tappeViaggio: TappaViaggio[] = [];
  luoghi: Luogo[] = [];
  strutture: StructWithProprietario[] = [];
  error: TimelineError = { color: '', message: '' };
  openLegend: boolean = false;
  mappaPrenotazioni: Map<number, PrenotazioneColor> = new Map(); // id -> PrenotazioneColor

  @ViewChild('formViaggio') formViaggio!: ViaggioForm; // il ! serve per non avere un'inizializzazione immediata, ma verrà certamente inizializzato in seguito
  @ViewChild('prenotazionePopup') prenotazionePopup!: PrenotazionePopup;
  @ViewChild('modificaViaggioForm') modificaViaggioForm!: ModificaViaggioForm;

  // layer per la visualizzazione delle icone delle struttue e dei marker numerici nella mappa
  private struttureLayer = L.layerGroup();
  private tappeLayer = L.layerGroup();

  realtimeService = inject(RealtimeService);
  notifyService = inject(NotifyService);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.realtimeService.setupRealtimeStrutture(); // setup del realtime per ascoltare i cambiamenti delle strutture
    this.realtimeService.getStruttureChanges().subscribe((payload) => {
      this.handleRealTime(payload);
    });
  }

  async ngAfterViewInit() {
    this.initMap(); // inzializzazione della mappa come disabilitata

    await this.checkViaggiAttivi();
    if (!this.viaggioAttivo) return;

    // se c'è un viaggio attivo avviene il caricamento delle tappe, delle prenotazioni dell'utente e dei luoghi del viaggio
    await this.getTappeViaggio();
    await this.loadMyPrenotazioni();
    await this.loadLuoghi();
    this.enableMap(); // abilita la mappa
  }

  // funzione per inizializzare la mappa con le opzioni di base, di default viene inizializzata disabilitata
  private initMap(): void {
    this.map = L.map('map', {
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      keyboard: false,

      center: [43.5, 11.3], // centro della mappa sul centro dell'Italia, circa Firenze
      zoom: 6,
      preferCanvas: true, // migliora le performance
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);
  }

  openViaggioForm() {
    this.formViaggio.openForm(this.username);
  }

  // funzione chiamato quando deve essere chiuso il form, loadMap è un booleano che dice se deve essere chiusa la mappa e quindi la creazione del viaggio è andata a buon fine
  async onFormClosed(event: {
    loadMap: boolean;
    viaggioAttivo: Viaggio | undefined;
  }) {
    if (!event.loadMap) return;

    this.viaggioAttivo = event.viaggioAttivo;
    await this.getTappeViaggio();
    await this.loadMyPrenotazioni();
    await this.loadLuoghi();
    this.enableMap();
  }

  // funzione che prende dal db il viaggio attivo, se esiste
  private async checkViaggiAttivi() {
    const res = await fetch(
      `${environment.apiUrl}/viaggi/attivo/${this.username}`,
      { method: 'GET' }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Recupero viaggio attivo');
      console.error(data.message + ' : ' + data.details);
      this.viaggioAttivo = undefined;
      return;
    }

    if (data.data.lenght != 0) this.viaggioAttivo = data.data[0];
    // viene selezionato il primo viaggio, ma non è possibile che ci siano più viaggiAttivi in contemporanea per lo stesso utente
    else this.viaggioAttivo = undefined;
    return;
  }

  // funzione per abilitare la mappa e caricare i vari layer con le rispettive icone
  enableMap() {
    const overlay = document.getElementById('mapOverlay');
    const mapElement = document.getElementById('map');
    const button = document.getElementById('overlayButton');

    // rimozione dell'overlay e del pulsante di creazione viaggio
    if (button) button.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    if (mapElement) {
      mapElement.style.pointerEvents = 'auto';
      mapElement.style.opacity = '1';
      mapElement.style.filter = 'none';
    }

    // interazione leaflet con la mappa abilitate
    this.map.dragging.enable();
    this.map.zoomControl.addTo(this.map);
    this.map.scrollWheelZoom.enable();

    this.loadViaFrancigena(); // layer per la visualizzazione di tutto il percorso della via francigena (sulla mappa percorso grigio)
    this.loadTappeColorate(); // layer per le tappe scelte + marker per ogni città
    this.loadStrutture(); // layer per le strutture
    this.map.on('zoomend', () => {
      this.updateVisibilityStrutture();
    }); // setup dell'evento di zoom con controllo sulla visibilità, se maggiore di SOGLIA_ZOOM_STRUCT mostra le icone delle strutture
  }

  // funzione per caricare il percorso della via Francigena tramite richiesta HTTP
  private loadViaFrancigena(): void {
    this.http
      .get('assets/geo/viaFrancigena.geojson')
      .subscribe((geojson: any) => {
        const routeStyle = {
          color: 'gray',
          weight: 3,
          opacity: 0.8,
        };

        const routeLayer = L.geoJSON(geojson, {
          style: routeStyle,
          filter: (feature) => feature.geometry.type !== 'Point',
        });

        routeLayer.addTo(this.map); // aggiunta del layer alla mappa
      });
  }

  // funzione per caricare i percorsi della via francigena scelti + marker ad ogni luogo del viaggio
  private loadTappeColorate() {
    if (this.viaggioAttivo?.ordineInverso) this.tappeViaggio.reverse(); // se il viaggio è inverso anche l'ordine di lettura delle tappe sarà l'inverso
    let numTappa = 1;
    this.tappeViaggio.forEach((tappa, index) => {
      const gpx = new L.GPX(`assets/gpx/${tappa.gpx_url}`, {
        async: true,
        markers: {
          // se ordine classico allora segno sulla mappa tutti i punti di partenza dei percorsi + l'ultimo punto di arrivo, mentre se ordine inverso allora il contrario
          startIcon: !this.viaggioAttivo?.ordineInverso
            ? L.divIcon({
                // se ordine classico, quindi da nord a sud, la start icon serve sempre. Tappa 1 composta da luoghi 1 e 2
                html: `<div class="marker-number">${numTappa}</div>`,
                className: 'custom-marker',
                iconSize: [30, 30],
                iconAnchor: [0, 30],
              })
            : index == this.tappeViaggio.length - 1 // se ordine inverso segna il punto solo se è l'ultimo
            ? L.divIcon({
                html: `<div class="marker-number">${numTappa + 1}</div>`,
                className: 'custom-marker',
                iconSize: [30, 30],
                iconAnchor: [0, 30],
              })
            : null,
          endIcon: !this.viaggioAttivo?.ordineInverso
            ? index == this.tappeViaggio.length - 1 // se ordine classico segna il punto solo se l'ultimo
              ? L.divIcon({
                  html: `<div class="marker-number">${numTappa + 1}</div>`,
                  className: 'custom-marker',
                  iconSize: [30, 30],
                  iconAnchor: [0, 30],
                })
              : null
            : L.divIcon({
                html: `<div class="marker-number">${numTappa}</div>`,
                className: 'custom-marker',
                iconSize: [30, 30],
                iconAnchor: [0, 30],
              }),
          shadowUrl: '',
        },
        polyline_options: {
          color: 'red',
          weight: 6,
          opacity: 1,
        },
      }).addTo(this.tappeLayer);

      // zoom centrato sulla tappa centrale, così da avere tutto il percorso visibile sulla mappa
      if (index == Math.ceil(this.tappeViaggio.length / 2)) {
        gpx.on('loaded', (e: any) => {
          const targ = e.target;
          this.map.fitBounds(targ.getBounds(), {
            padding: [20, 20],
            maxZoom: 8,
          });
        });
      }
      numTappa++;
    });

    this.tappeLayer.addTo(this.map); // aggiunta del layer delle tappe alla mappa
  }

  // funzione per caricare tutte le strutture presenti nel db, anche quelle fuori dal percorso
  private async loadStrutture() {
    const res = await fetch(`${environment.apiUrl}/strutture/`, {
      method: 'GET',
    });
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Recupero strutture');
      console.error(data.message + ' : ' + data.details);
      this.strutture = [];
      return;
    }
    this.strutture = [...data.data];
    this.strutture.forEach((struttura) => this.createMarker(struttura)); // per ogni struttura viene creato il marker corrispondente
  }

  // funzione per caricare dal db tutte le tappe presenti nel viaggio attivo
  private async getTappeViaggio() {
    const res = await fetch(
      `${environment.apiUrl}/tappe/viaggio/${this.viaggioAttivo?.idViaggio}`,
      { method: 'GET' }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Recupero tappe viaggio');
      console.error(data.message + ' : ' + data.details);
      this.tappeViaggio = [];
      return;
    }

    data.data.forEach((tappa: any) => {
      const partenza: Luogo = !this.viaggioAttivo?.ordineInverso
        ? tappa.tappe.luogo1
        : tappa.tappe.luogo2;
      const arrivo: Luogo = !this.viaggioAttivo?.ordineInverso
        ? tappa.tappe.luogo2
        : tappa.tappe.luogo1;
      this.tappeViaggio.push({
        idViaggio: tappa.idViaggio,
        idTappa: tappa.idTappa,
        partenza: partenza,
        arrivo: arrivo,
        dataPercorrenza: tappa.dataPercorrenza,
        nomeTappa: tappa.nomeTappa,
        km: tappa.tappe.km,
        durata: tappa.tappe.durata,
        gpx_url: tappa.tappe.gpx_url,
      });
    });
    this.tappeViaggio = [...this.tappeViaggio]; // forzo la modifica del riferimento dell'array per farlo vedere agli altri componenti
  }

  // funzione per effettuare lo zoom su un luogo al click sul marker della timeline o sul pulsante "Prenota"
  zoomLuogo(event: { index: number; zoomLevel: number }) {
    this.map.eachLayer((layer: any) => {
      // ricerca del marker corrispondente
      if (layer instanceof L.Marker) {
        const icon = layer.options.icon as L.DivIcon;
        const iconHtml = icon.options.html as string;

        // cerca il numero all'interno dell'HTML del marker
        if (
          iconHtml &&
          iconHtml.includes(`<div class="marker-number">${event.index}</div>`)
        ) {
          const latlng = layer.getLatLng();
          this.map.flyTo(latlng, event.zoomLevel); // effetto zoom animato
        }
      }
    });
  }

  // funzione per caricare dal db tutte le prenotazioni effettuate dall'utente
  private async loadMyPrenotazioni() {
    const params = new URLSearchParams({
      username: this.username,
      dataPartenza: this.viaggioAttivo!.dataPartenza,
      dataArrivo: this.viaggioAttivo!.dataArrivo,
    });
    const res = await fetch(
      `${environment.apiUrl}/prenotazioni/pellegrino?${params.toString()}`,
      { method: 'GET' }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Recupero prenotazioni');
      console.error(data.message + ' : ' + data.details);
      return;
    }

    // creazione della mappa delle prenotazioni
    this.createMap(data.data);

    //this.myPrenotazioni = [...data.data];
  }

  private createMap(prenotazioni: PrenotazioneWithStruct[]) {
    // la prima città di partenza sarà sicuramente grigia perchè non ci alloggio mai
    this.mappaPrenotazioni.set(this.tappeViaggio[0].partenza.id, {
      color: 'gray',
      luogo: this.tappeViaggio[0].partenza.nome,
      prenotazione: null,
    });

    // per ogni tappa controlla se la data di percorrenza è null (fuori dal viaggio) oppure è uguale alla successiva (tappa di passaggio)
    for (
      let indexTappa = 0;
      indexTappa < this.tappeViaggio.length - 1;
      indexTappa++
    ) {
      if (
        this.tappeViaggio[indexTappa].dataPercorrenza == null ||
        this.tappeViaggio[indexTappa].dataPercorrenza ==
          this.tappeViaggio[indexTappa + 1].dataPercorrenza
      ) {
        this.mappaPrenotazioni.set(this.tappeViaggio[indexTappa].arrivo.id, {
          color: 'gray',
          luogo: this.tappeViaggio[indexTappa].arrivo.nome,
          prenotazione: null, // non è necessaria prenotazione
        });
      } else this.checkPren(indexTappa, prenotazioni); // è necessario pernottare in questa città
    }

    // ultima città del viaggio
    if (
      this.tappeViaggio[this.tappeViaggio.length - 1].dataPercorrenza == null
    ) {
      // se l'ultima tappa non è inclusa nel viaggio non è necessario pernottamento
      this.mappaPrenotazioni.set(
        this.tappeViaggio[this.tappeViaggio.length - 1].arrivo.id,
        {
          color: 'gray',
          luogo: this.tappeViaggio[this.tappeViaggio.length - 1].arrivo.nome,
          prenotazione: null,
        }
      );
    } else this.checkPren(this.tappeViaggio.length - 1, prenotazioni); // per l'ultima tappa serve per forza pernottare
  }

  private checkPren(
    indexTappa: number,
    prenotazioni: PrenotazioneWithStruct[]
  ) {
    const pren = prenotazioni.find(
      (prenotazione: PrenotazioneWithStruct) =>
        prenotazione.struttura.idLuogo ==
          this.tappeViaggio[indexTappa].arrivo.id &&
        this.tappeViaggio[indexTappa].dataPercorrenza ==
          prenotazione.dataAlloggio
    ); // ricerca della prenotazione nell'array

    if (pren != undefined) {
      this.mappaPrenotazioni.set(this.tappeViaggio[indexTappa].arrivo.id, {
        // se la prenotazione esiste allora il colore sarà verde
        color: 'green',
        luogo: this.tappeViaggio[indexTappa].arrivo.nome,
        prenotazione: pren,
      });
    } else {
      this.mappaPrenotazioni.set(this.tappeViaggio[indexTappa].arrivo.id, {
        // se la prenotazione non esiste allora il colore sarà rosso
        color: 'red',
        luogo: this.tappeViaggio[indexTappa].arrivo.nome,
        prenotazione: undefined,
      });
    }
  }

  async modificaMyPrenotazioni() {
    await this.loadMyPrenotazioni();
  } // devo ricaricare tutto quanto perchè all'interno della prenotazione ci sono anche tutte le info sulla struttura prenotata

  // funzione per la creazione del marker per la struttura passata come parametro
  private createMarker(struttura: any) {
    const customIcon = L.icon({
      iconUrl: 'assets/marker/home-marker.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
    const marker = L.marker([struttura.viaLat, struttura.viaLon], {
      icon: customIcon,
    }) as CustomMarker;
    marker.on('click', () => {
      this.openPopup(struttura);
    }); // click sul marker apre il popup
    marker.strutturaId = struttura.id;
    this.struttureLayer.addLayer(marker); // aggiunta del marker al layer delle strutture
  }

  // funzione per l'eliminazione del marker della struttura
  private deleteMarker(strutturaId: number) {
    const layers = this.struttureLayer.getLayers() as CustomMarker[];
    const marker = layers.find((layer) => {
      return layer.strutturaId == strutturaId;
    }); // ricerca del marker tramite id

    if (marker) this.struttureLayer.removeLayer(marker);
  }

  // funzione per controllare il livello di zoom e in caso mostrare il layer delle strutture
  private updateVisibilityStrutture() {
    const currentZoom = this.map.getZoom();

    if (currentZoom >= SOGLIA_ZOOM_STRUCT)
      this.map.addLayer(this.struttureLayer);
    else this.map.removeLayer(this.struttureLayer);
  }

  // realtime necessario per le strutture in quanto vengono aggiunte dai gestori
  private async handleRealTime(payload: RealtimePostgresChangesPayload<any>) {
    switch (payload.eventType) {
      case 'INSERT':
        const idStruttura = payload.new.id;
        const s = await this.loadStrutturaById(idStruttura); // caricamento della nuova struttura
        break;
      case 'DELETE':
        const id = this.strutture.find((struct) => {
          return (
            struct.colore === payload.old['colore'] &&
            struct.proprietario === payload.old['proprietario']
          );
        })?.id; // ricerca della struttura interessata nell'array
        if (!id) break;

        this.deleteMarker(id); // eliminazione del marker dalla mappa
        this.strutture = this.strutture.filter((s) => s.id != id); // eliminazione della struttura dall'array
        for (const [key, value] of this.mappaPrenotazioni) {
          // ricerca di eventuali prenotazioni per quella struttura
          if (value.prenotazione && value.prenotazione.idStruttura == id) {
            this.mappaPrenotazioni.set(key, {
              // nel caso esistesse una struttura allora la prenotazione nel db è stata eliminata in automatico e va aggiornata la UI
              color: 'red',
              luogo: value.luogo,
              prenotazione: undefined,
            });
            break;
          }
        }
        this.mappaPrenotazioni = new Map(this.mappaPrenotazioni); // aggiornamento del riferimento per farlo vedere agli altri componenti
        break;
      case 'UPDATE': // nell'UPDATE devo eliminare il marker e poi reinserirlo perchè potrebbe essere cambiata la via o la città
        const idUp = payload.new.id;
        this.deleteMarker(idUp);
        this.strutture = this.strutture.filter((struct) => struct.id != idUp); // rimuovo la struttura
        await this.loadStrutturaById(idUp);
        break;
    }
    this.updateVisibilityStrutture();
  }

  // caricamento dal db di una singola struttura + creazione del marker
  private async loadStrutturaById(id: number) {
    const res = await fetch(`${environment.apiUrl}/strutture/id/${id}`, {
      method: 'GET',
    });
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Recupero struttura');
      console.error(data.message + ' : ' + data.details);
      return;
    }
    this.strutture.push(data.data[0]);
    this.strutture = [...this.strutture];
    this.createMarker(this.strutture[this.strutture.length - 1]);
  }

  private openPopup(struttura: StructWithProprietario) {
    this.prenotazionePopup.open(struttura);
  }

  // funzione per caricare i luogi delle tappe del viaggio attivo
  private async loadLuoghi() {
    const res = await fetch(
      `${environment.apiUrl}/tappe/viaggio/${this.viaggioAttivo?.idViaggio}/luoghi`,
      { method: 'GET' }
    );
    const data = await res.json();
    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Recupero luoghi viaggio');
      console.error(data.message + ' : ' + data.details);
      return;
    }
    this.luoghi = [...data.data];
  }

  modificaViaggio() {
    this.modificaViaggioForm.open();
  }

  async aggiornaViaggio(newViaggio: Viaggio) {
    this.viaggioAttivo = { ...newViaggio };

    // reset di tutto
    this.tappeViaggio = [];
    this.luoghi = [];
    this.tappeLayer.clearLayers();

    // nuovo caricamento di tutto quanto
    await this.getTappeViaggio();
    await this.loadLuoghi();
    this.loadTappeColorate();
    await this.deletePren();
    this.notifyService.showSuccessoOperazione('Aggiornamento viaggio');
  }

  // funzione per eliminare le prenotazioni quando cambia il viaggio
  private async deletePren() {
    let myPrenotazioni: any = [];
    this.mappaPrenotazioni.forEach((pren) => {
      // raccolta di tutte le prenotazioni
      if (pren.color == 'green') myPrenotazioni.push(pren.prenotazione);
    });
    const prenDaEliminare = [];
    for (const pren of myPrenotazioni) {
      const tappa = this.tappeViaggio.find((t) => {
        return t.arrivo.id == pren.struttura.idLuogo;
      });
      if (!(tappa && tappa.dataPercorrenza == pren.dataAlloggio))
        prenDaEliminare.push(pren); // se non esiste alcuna tappa di arrivo relativa alla prenotazione oppure la data di percorrenza della tappa è cambiata, allora la prenotazione va eliminata
    }

    try {
      const res = await Promise.allSettled(
        prenDaEliminare.map((pren) => {
          myPrenotazioni = myPrenotazioni.filter(
            (p: any) =>
              p.idStruttura !== pren.idStruttura ||
              p.dataAlloggio !== pren.dataAlloggio
          );
          return this.eliminaPrenotazione(pren);
        })
      );

      // controlla quanti fallimenti ci sono stati nell'eliminazione delle prenotazioni
      const fallimenti = res.filter((r) => r.status === 'rejected').length;
      if (fallimenti > 0)
        this.notifyService.showFallimentoOperazione(
          'Eliminazione di alcune prenotazioni'
        );
    } catch (error) {
      this.notifyService.showFallimentoOperazione('Eliminazione prenotazioni');
    }

    // reset della mappa e ripopolamento con le nuove tappe e le nuove prenotazioni
    this.mappaPrenotazioni.clear();
    this.createMap(myPrenotazioni);
  }

  // funzione per eliminare una prenotazione
  private async eliminaPrenotazione(pren: any) {
    try {
      const res = await fetch(`${environment.apiUrl}/prenotazioni/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idStruttura: pren.idStruttura,
          usernamePellegrino: this.viaggioAttivo!.usernamePellegrino,
          dataAlloggio: pren.dataAlloggio,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message); // passa l'errore sopra

      // invio della notifica al gestore
      await this.notifyService.notifyGestore(
        'cancellazione', // tipo di notifica
        pren.idStruttura,
        pren.dataAlloggio
      );
    } catch (error) {
      throw error;
    }
  }

  // funzione per eliminare una prenotazione quando viene cliccato il pulsante "Elimina" dalla timeline
  async eliminaPrenTimeline(pren: any) {
    try {
      await this.eliminaPrenotazione(pren); // eliminazione dal db
      this.notifyService.showSuccessoOperazione('Eliminazione prenotazione');
      const oldPren = this.mappaPrenotazioni.get(pren.struttura.idLuogo);
      this.mappaPrenotazioni.set(pren.struttura.idLuogo, {
        // eliminazione dalla mappa
        color: 'red',
        luogo: oldPren!.luogo,
        prenotazione: undefined,
      });
      this.mappaPrenotazioni = new Map(this.mappaPrenotazioni); // aggiornamento del riferimento
    } catch (error) {
      console.error(error);
      this.notifyService.showFallimentoOperazione('Eliminazione prenotazione');
    }
  }
}
