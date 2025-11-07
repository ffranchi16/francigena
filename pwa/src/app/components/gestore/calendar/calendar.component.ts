import { Component, inject, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { LegendItemComponent } from '../legend-item/legend-item.component';
import { PrenotazioniInfoComponent } from '../prenotazioni-info/prenotazioni-info.component';
import { RealtimeService } from '../../../services/realtimeService/realtime-service';
import { NotifyService } from '../../../services/notifyService/notify-service';
import { environment } from '../../../../environments/environment';
import {
  Prenotazione,
  InfoPrenotazione,
  Struttura,
  Event,
} from '../../../../typings/custom-type.types';

@Component({
  selector: 'calendar',
  imports: [
    CommonModule,
    FullCalendarModule,
    LegendItemComponent,
    PrenotazioniInfoComponent,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent implements OnInit {
  @Input() username: string = '';
  strutture: Map<number, Struttura> = new Map<number, Struttura>(); // struttura dati per contenere le strutture
  events: Event[] = []; // struttura dati per contenere gli eventi da visualizzare nel calendario
  eventMap: Map<string, Map<number, InfoPrenotazione>> = new Map(); // struttura dati utilizzata per raggruppare le prenotazioni per data e struttura e fare il conteggio dei letti
  @ViewChild('prenotazioniInfo') prenotazioniInfo!: PrenotazioniInfoComponent; // riferimento a un elemento html
  realtimeService = inject(RealtimeService);
  notifyService = inject(NotifyService);

  calendarOptions: CalendarOptions = {
    // opzioni per il calendario
    initialView: 'dayGridMonth',
    contentHeight: 'auto',
    aspectRatio: 0.5,

    views: {
      // ottimizzazioni per mobile
      dayGridMonth: {
        titleFormat: { year: 'numeric', month: 'short' },
        dayHeaderFormat: { weekday: 'short' },
      },
      timeGridWeek: { dayHeaderFormat: { weekday: 'short', day: 'numeric' } },
    },
    plugins: [dayGridPlugin],
    eventDisplay: 'block',
    eventClick: this.openInfo.bind(this), // click su un evento apre le info per quel determinato evento
  };

  // setup inziale della pagina
  async ngOnInit() {
    if (!this.username) return;

    await this.getStrutture();
    await this.getEventi();
    this.realtimeService.setupRealtimePrenotazioni(); // setup del realtime per ascoltare i cambiamenti delle prenotazioni
    this.realtimeService.getPrenotazioneChanges().subscribe((payload) => {
      this.handleRealTime(payload);
    });
  }

  // funzione per raccogliere le strutture dell'utente
  async getStrutture() {
    const res = await fetch(
      `${environment.apiUrl}/strutture/username/${this.username}`,
      { method: 'GET' }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Recupero strutture');
      console.error(data.message + ' : ' + data.details);
      return;
    }
    data.data.forEach((struttura: Struttura) => {
      this.strutture.set(struttura.id, struttura);
    });
  }

  // funzione per raccogliere le prenotazioni ricevute dal gestore
  async getEventi() {
    const res = await fetch(
      `${environment.apiUrl}/prenotazioni/gestore/${this.username}`,
      { method: 'GET' }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Recupero prenotazioni');
      console.error(data.message + ' : ' + data.details);
      return;
    }

    // reset delle strutture dati per popolarle successivamente da zero
    this.events = [];
    this.eventMap.clear();

    data.data.forEach((prenotazione: Prenotazione) => {
      this.insertEventMap(prenotazione);
    });
    this.setEvents();
  }

  // funzione per inserire un elemento prenotazione all'interno della mappa degli eventi
  private insertEventMap(prenotazione: Prenotazione) {
    if (!this.eventMap.has(prenotazione.dataAlloggio))
      // se non ci sono eventi per quella data, allora creazione della struttura vuota
      this.eventMap.set(prenotazione.dataAlloggio, new Map());

    if (
      !this.eventMap
        .get(prenotazione.dataAlloggio)!
        .has(prenotazione.idStruttura)
    ) {
      // se ci sono eventi per quella data, ma non per quella struttura allora creazione dell'oggetto InfoPrenotazione vuoto
      const infoPren: InfoPrenotazione = {
        numLettiOccuppati: 0,
        prenotazioni: [],
      };
      this.eventMap
        .get(prenotazione.dataAlloggio)!
        .set(prenotazione.idStruttura, infoPren);
    }

    // aggiunta del numero di letti e della prenotazione nel posto della mappa corretto
    this.eventMap
      .get(prenotazione.dataAlloggio)!
      .get(prenotazione.idStruttura)!.numLettiOccuppati +=
      prenotazione.numLetti; // utilizzo dei ! perchè ho la certezza che ci siano gli elementi data la creazione soprastante
    this.eventMap
      .get(prenotazione.dataAlloggio)!
      .get(prenotazione.idStruttura)!
      .prenotazioni.push(prenotazione);
  }

  // funzione per inserire gli eventi all'interno del calendario
  private setEvents() {
    this.events = [];
    for (let [data, strutturaMap] of this.eventMap) {
      for (let [idStruttura, infoPren] of strutturaMap) {
        this.events.push({
          title:
            '🛌🏻 ' +
            infoPren.numLettiOccuppati +
            ' di ' +
            this.strutture.get(idStruttura)!.nLetti,
          date: data,
          backgroundColor: this.strutture.get(idStruttura)!.colore,
        });
      }
    }
    this.calendarOptions.events = this.events;
  }

  // funzione per aprire le informazioni dell'evento nel calendario
  openInfo(clickInfo: EventClickArg) {
    const data = clickInfo.event.startStr;
    const color = clickInfo.event.backgroundColor;
    const struct = Array.from(this.strutture.values()).find(
      (struttura) => struttura.colore === color
    ); // ogni colore è associato in modo univoco ad una struttura, quindi per sapere quale su quale evento di quale struttura è stato fatto il click, basta utilizzare il colore
    if (struct)
      this.prenotazioniInfo.openInfo(
        data,
        struct.nLetti,
        this.eventMap.get(data)!.get(struct.id)!
      );
  }

  // il realtime serve solo per le prenotazioni perchè vengono aggiunte dai pellegrini, mentre le strutture vengono modificate/aggiunte solo dall'utente (che deve quindi cambiare pagina per farlo e quando torna su questa viene aggiornata in automatico)
  private async handleRealTime(payload: RealtimePostgresChangesPayload<any>) {
    console.log('ciao');
    switch (payload.eventType) {
      case 'INSERT':
        const newPren: Prenotazione = {
          idStruttura: payload.new.idStruttura,
          dataAlloggio: payload.new.dataAlloggio,
          usernamePellegrino: payload.new.usernamePellegrino,
          numLetti: payload.new.numLetti,
        };

        this.insertEventMap(newPren); // inserimento della nuova prenotazione nella mappa
        this.setEvents(); // reinserimento di tutti gli eventi nel calendario dopo l'aggiunta del nuovo evento
        break;
      case 'UPDATE': // l'update non può mai accadere perchè non è possibile modificare una prenotazione, il pellegrino può solo crearla o cancellarla
        break;
      case 'DELETE':
        await this.getEventi(); // in caso di delete aggiornamento di eventMap e events con azzeramento e nuovo riempimento, perchè in payload.old non sono presenti il numero di letti della prenotazione eliminata
        break;
    }
  }
}
