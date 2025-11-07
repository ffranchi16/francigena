import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  TappaViaggio,
  TimelineError,
  PrenotazioneColor,
  Luogo,
  Viaggio,
  UserInfo,
} from '../../../../typings/custom-type.types';

@Component({
  selector: 'timeline',
  imports: [CommonModule],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
})
export class Timeline implements OnChanges {
  error: TimelineError = { color: '', message: '' };
  miniPopup: boolean = false;
  infoPopup: boolean = false;
  luogoSelezionato: Luogo = { id: -1, nome: '' };
  prenotazioneSelezionata: any = undefined;
  publicUrl: string = '';
  userInfo: UserInfo = {
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    username: '',
    type: '',
  };

  @Input() viaggioAttivo: Viaggio | undefined;
  @Input() tappeViaggio: TappaViaggio[] = [];
  @Input() mappaPrenotazioni: Map<number, PrenotazioneColor> = new Map();
  @Input() listaLuoghi: Luogo[] = [];
  @Output() modificaViaggio = new EventEmitter<void>();
  @Output() eliminaPren = new EventEmitter<any>();
  @Output() zoomLuogo = new EventEmitter<{
    index: number;
    zoomLevel: number;
  }>();

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.listaLuoghi.length > 0 &&
      this.tappeViaggio.length > 0 &&
      this.mappaPrenotazioni.size > 0
    )
      // quando tutti e tre gli input sono definiti mostra l'errore sul viaggio
      this.loadError(this.tappeViaggio);
  }

  chiudiPopup() {
    this.miniPopup = false;
    this.infoPopup = false;
    this.luogoSelezionato = { id: -1, nome: '' };
    this.prenotazioneSelezionata = undefined;
    this.publicUrl = '';
    this.userInfo = {
      nome: '',
      cognome: '',
      email: '',
      telefono: '',
      username: '',
      type: '',
    };
  }

  async clickPopup(luogo: Luogo) {
    this.luogoSelezionato = luogo;
    if (this.mappaPrenotazioni.get(luogo.id)?.color == 'green') {
      // se esiste una prenotazione viene mostrato il popup con le info della prenotazione
      this.infoPopup = true;
      this.prenotazioneSelezionata = this.mappaPrenotazioni.get(
        luogo.id
      )?.prenotazione;
      await this.getPublicUrl(); // raccolta dell'immagine della struttura
      await this.getUserInfo(
        this.prenotazioneSelezionata.struttura.proprietario
      ); // raccolta informazioni sul proprietario della struttura
      console.log(this.prenotazioneSelezionata);
    } // altrimenti viene mostrato il mini popup nella timeline
    else if (this.miniPopup) this.chiudiPopup();
    else this.miniPopup = true;
  }

  openModificaViaggio() {
    this.modificaViaggio.emit();
  }

  clickLuogo(index: number) {
    this.zoomLuogo.emit({ index: index, zoomLevel: 12 });
  } // se viene cliccato il nome del luogo nella timeline viene fatto lo zoom sulla mappa

  zoomStruct(index: number) {
    // se viene cliccato il pulsante "Prenota" nel mini-popup viene fatto lo zoom sulla mappa
    this.zoomLuogo.emit({ index: index, zoomLevel: 15 });
    this.chiudiPopup();
  }

  // funzione per mostrare l'errore del viaggio attivo all'utente
  private loadError(tappeViaggio: TappaViaggio[]) {
    if (tappeViaggio[tappeViaggio.length - 1].dataPercorrenza == null) {
      // caso pochi giorni rispetto al numero di tappe, quindi il pellegrino non riesce a concludere il viaggio
      this.error.color = 'red';
      this.error.message =
        'Hai inserito pochi giorni e non riesci a concludere il viaggio';
    } else if (
      tappeViaggio[tappeViaggio.length - 1].dataPercorrenza !=
      this.viaggioAttivo?.dataArrivo
    ) {
      // caso troppi giorni rispetto al numero di tappe, quindi il pellegrino termina il viaggio prima
      this.error.color = 'yellow';
      this.error.message =
        'Hai inserito troppi giorni di cammino e il tuo viaggio è terminato prima';
    } else {
      // viaggio sistemato, non ci sono errori
      this.error.message = '';
      this.error.color = '';
    }
  }

  // funzione per prendere dal db la foto della struttura in cui l'utente ha prenotato
  private async getPublicUrl() {
    const res = await fetch(
      `${environment.apiUrl}/strutture/foto/${this.prenotazioneSelezionata.struttura.url}`,
      { method: 'GET' }
    );
    const data = await res.json();
    this.publicUrl = data.data;
  }

  // funzione per prendere dal db le informazioni sul proprietario della struttura
  private async getUserInfo(username: string) {
    const res = await fetch(`${environment.apiUrl}/users/${username}`, {
      method: 'GET',
    });
    const data = await res.json();

    if (!res.ok) {
      console.error(data.message + ' : ' + data.details);
      this.userInfo = {
        nome: '',
        cognome: '',
        email: '',
        telefono: '',
        username: '',
        type: '',
      };
      return;
    }

    this.userInfo = data.data!;
  }

  // funzione per cancellare la prenotazione
  cancellaPrenotazione() {
    if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) return;
    this.eliminaPren.emit(this.prenotazioneSelezionata);
    this.chiudiPopup();
  }
}
