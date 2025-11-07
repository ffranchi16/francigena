import { Component, inject } from '@angular/core';
import { NotifyService } from '../../../services/notifyService/notify-service';
import {
  InfoPrenotazione,
  UserInfo,
} from '../../../../typings/custom-type.types';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'prenotazioni-info',
  imports: [CommonModule],
  templateUrl: './prenotazioni-info.component.html',
  styleUrl: './prenotazioni-info.component.scss',
})
export class PrenotazioniInfoComponent {
  data: string = '';
  numLettiDisponibili: number = 0;
  info: InfoPrenotazione = {
    numLettiOccuppati: 0,
    prenotazioni: [],
  };
  usersInfo: Map<string, UserInfo> = new Map(); // mappa username -> UserInfo
  showInfo: boolean = false;
  notifyService = inject(NotifyService);

  async openInfo(
    data: string,
    numLettiDisponibili: number,
    info: InfoPrenotazione
  ) {
    this.data = data;
    this.numLettiDisponibili = numLettiDisponibili;
    this.info = info;

    // raccolta delle informazioni del pellegrino che ha effettuato la prenotazione
    for (const prenotazione of this.info.prenotazioni) {
      const res = await fetch(
        `${environment.apiUrl}/users/${prenotazione.usernamePellegrino}`,
        { method: 'GET' }
      );
      const data = await res.json();

      if (!res.ok) {
        this.notifyService.showFallimentoOperazione('Recupero prenotazioni');
        console.error(data.message + ' : ' + data.details);
        return;
      }
      const ui: UserInfo = data.data!;
      this.usersInfo.set(prenotazione.usernamePellegrino, ui);
    }

    this.showInfo = true;
  }

  getUsersInfo(username: string): UserInfo | undefined {
    return this.usersInfo.get(username);
  }

  closeInfo() {
    this.showInfo = false;
    this.usersInfo.clear();
  }
}
