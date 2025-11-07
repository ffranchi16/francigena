import {
  Component,
  OnInit,
  Input,
  inject,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RealtimeService } from '../../../services/realtimeService/realtime-service';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { NotifyService } from '../../../services/notifyService/notify-service';
import {
  NumLettiOccupati,
  TappaViaggio,
  Luogo,
  Viaggio,
  PrenotazioneColor,
  Struttura,
  StructWithProprietario,
} from '../../../../typings/custom-type.types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'prenotazione-popup',
  imports: [CommonModule, FormsModule],
  templateUrl: './prenotazione-popup.html',
  styleUrl: './prenotazione-popup.scss',
})
export class PrenotazionePopup implements OnInit {
  struttura: StructWithProprietario = {
    id: -1,
    nome: '',
    proprietario: '',
    idLuogo: -1,
    via: '',
    viaLat: 0,
    viaLon: 0,
    civico: 0,
    nLetti: 0,
    altreInfo: '',
    colore: '',
    url: '',
    user: { nome: '', cognome: '', telefono: '' },
  };
  visible: boolean = false;
  numLettiOccupati: NumLettiOccupati[] = [];
  lettiDisponibili = 0;
  data: string = '';
  tipoPopup: string = '';
  confermaCambioPrenotazione: boolean = false;

  @Input() tappeViaggio: TappaViaggio[] = [];
  @Input() listaLuoghi: Luogo[] = [];
  @Input() viaggioAttivo: Viaggio | undefined = undefined;
  @Input() mappaPrenotazioni: Map<number, PrenotazioneColor> = new Map();
  @Output() modificaMyPrenotazioni = new EventEmitter<void>();

  realtimeService = inject(RealtimeService);
  notifyService = inject(NotifyService);

  async ngOnInit() {
    this.realtimeService.setupRealtimePrenotazioni(); // setup realtime
    this.realtimeService.getPrenotazioneChanges().subscribe((payload) => {
      this.handleRealTime(payload);
    });
    await this.loadNumLetti();
  }

  open(struttura: StructWithProprietario) {
    this.visible = true;
    this.struttura = struttura;
    this.data = this.getData(struttura.idLuogo);
    this.setType();

    const lettiOccupati =
      this.numLettiOccupati.find((el) => {
        return el.idStruttura == struttura.id && el.dataAlloggio == this.data;
      })?.totletti ?? 0;
    this.lettiDisponibili = struttura.nLetti - lettiOccupati;
  }

  private setType() {
    const pren = this.mappaPrenotazioni.get(this.struttura.idLuogo);
    if (!pren) {
      this.tipoPopup = 'info'; // se non esiste una prenotazioneColor all'interno della mappa vuol dire che la struttura su cui è stato fatto il click è fuori dal percorso
      return;
    }

    switch (pren.color) {
      case 'gray':
        this.tipoPopup = 'info'; // la struttura è in una tappa di passaggio
        break;
      case 'red':
        this.tipoPopup = 'classico'; // non ci sono prenotazioni per quella città
        break;
      case 'green':
        if (pren.prenotazione?.idStruttura == this.struttura.id)
          this.tipoPopup =
            'prenotato'; // esiste già una prenotazione per questa struttura
        else this.tipoPopup = 'cambio'; // esiste già una prenotazione per un'altra struttura nello stesso luogo
        break;
    }
  }

  getPopupClass() {
    return `popup-${this.tipoPopup}`;
  }

  onChiudi() {
    this.visible = false;
    this.struttura = {
      id: -1,
      nome: '',
      proprietario: '',
      idLuogo: -1,
      via: '',
      viaLat: 0,
      viaLon: 0,
      civico: 0,
      nLetti: 0,
      altreInfo: '',
      colore: '',
      url: '',
      user: { nome: '', cognome: '', telefono: '' },
    };
    this.data = '';
    this.lettiDisponibili = 0;
    this.tipoPopup = '';
    this.confermaCambioPrenotazione = false;
  }

  // realtime sulle prenotazioni, quando arriva una nuova prenotazione si ricarica il numero di tutti i letti dal db
  private async handleRealTime(payload: RealtimePostgresChangesPayload<any>) {
    await this.loadNumLetti();
  }

  // funzione per leggere da una view del db il numero di letti occupati raggruppati per data e struttura
  private async loadNumLetti() {
    const res = await fetch(
      `${environment.apiUrl}/prenotazioni/totaleLettiOccupati`,
      { method: 'GET' }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione(
        'Recupero totale letti occupati'
      );
      console.error(data.message + ' : ' + data.details);
      this.numLettiOccupati = [];
      return;
    }
    this.numLettiOccupati = [...data.data];
  }

  private getData(idLuogo: number): string {
    return (
      this.tappeViaggio.find((tappa) => tappa.arrivo.id == idLuogo)
        ?.dataPercorrenza ?? ''
    );
  }

  // funzione per prenotare una struttura
  async prenotaStruttura() {
    if (
      this.struttura &&
      this.lettiDisponibili >= this.viaggioAttivo!.nPersone
    ) {
      const res = await fetch(`${environment.apiUrl}/prenotazioni/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idStruttura: this.struttura.id,
          usernamePellegrino: this.viaggioAttivo!.usernamePellegrino,
          numLetti: this.viaggioAttivo!.nPersone,
          dataAlloggio: this.data,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        this.notifyService.showFallimentoOperazione('Prenotazione struttura');
        console.error(data.message + ' : ' + data.details);
        return;
      }
      this.notifyService.showSuccessoOperazione('Prenotazione struttura');

      // notifica al gestore che è avvenuta una nuova prenotazione
      await this.notifyService.notifyGestore(
        'inserimento', // tipo di notifica
        this.struttura.id,
        this.data
      );
      this.modificaMyPrenotazioni.emit(); // segnale al componente principale per dire che ci sono state delle modifiche alle prenotazioni
      this.onChiudi();
    }
  }

  // funzione per sostituire una prenotazione in una struttura con un'altra prenotazione in una struttura diversa
  async sostituisciPrenotazione() {
    let altraPren: any = undefined;
    this.mappaPrenotazioni.forEach((value) => {
      if (value.prenotazione && value.prenotazione.dataAlloggio == this.data)
        altraPren = value.prenotazione;
    }); // raccolta della prenotazione da sostituire
    if (!altraPren) return;
    const res = await fetch(`${environment.apiUrl}/prenotazioni/`, {
      // cancellazione dell'altra prenotazione
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idStruttura: altraPren.idStruttura,
        usernamePellegrino: this.viaggioAttivo!.usernamePellegrino,
        dataAlloggio: this.data,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Sostituzione prenotazione');
      console.error(data.message + ' : ' + data.details);
      return;
    }

    // notifica al gestore per la cancellazione di una prenotazione
    await this.notifyService.notifyGestore(
      'cancellazione', // tipo di notifica
      altraPren.idStruttura,
      this.data
    );

    // una volta cancellata la vecchia prenotazione si può inserire la nuova
    await this.prenotaStruttura();
  }
}
