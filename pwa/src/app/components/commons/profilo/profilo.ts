import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/authService/auth-service';
import { NotifyService } from '../../../services/notifyService/notify-service';
import { Navbar } from '../navbar/navbar';
import {
  UserInfo,
  StatsPellegrino,
  StatsGestore,
} from '../../../../typings/custom-type.types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'profilo',
  imports: [Navbar, CommonModule],
  templateUrl: './profilo.html',
  styleUrl: './profilo.scss',
})
export class Profilo implements OnInit {
  username: string = '';
  userInfo: UserInfo = {
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    username: '',
    type: '',
  };
  statsPellegrino: StatsPellegrino = {
    totViaggi: 0,
    totKm: 0,
    viaggioAttivo: false,
  };
  statsGestore: StatsGestore = { nStrutture: 0 };
  activatedRoute = inject(ActivatedRoute);
  notifyService = inject(NotifyService);
  authService = inject(AuthService);
  router = inject(Router);
  dOggi = new Date();

  async ngOnInit() {
    this.username = this.activatedRoute.snapshot.params?.['username'] || '';
    if (!this.username) return;

    await this.getUserInfo();
    this.dOggi.setHours(0, 0, 0, 0); // reset dell'orario per confrontare solo le date
    if (this.userInfo.type == 'pellegrino') await this.getInfoPellegrino();
    else if (this.userInfo.type == 'gestore') await this.getInfoGestore();
  }

  // funzione per raccogliere le informazioni riguardo l'utente
  private async getUserInfo() {
    const res = await fetch(`${environment.apiUrl}/users/${this.username}`, {
      method: 'GET',
    });
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione(
        'Recupero informazioni utente'
      );
      console.error(data.message + ' : ' + data.details);
      return;
    }
    this.userInfo = data.data;
  }

  // funzione per raccogliere le informazioni riguardante il pellegrino
  private async getInfoPellegrino() {
    const res = await fetch(
      `${environment.apiUrl}/tappe/stats/${this.username}`,
      { method: 'GET' }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione(
        'Recupero informazioni per statistiche pellegrino'
      );
      console.error(data.message + ' : ' + data.details);
      return;
    }

    if (data.data.length == 0) {
      this.statsPellegrino.totViaggi = 0;
      this.statsPellegrino.viaggioAttivo = false;
      this.statsPellegrino.totKm = 0;
      return;
    }

    // calcolo stats generali
    let idViaggi: number[] = [];
    let totKm: number = 0.0;

    data.data.forEach((t: any) => {
      if (!idViaggi.includes(t.idViaggio)) idViaggi.push(t.idViaggio);
      totKm += t.tappe.km;
    });

    this.statsPellegrino.totViaggi = idViaggi.length;
    this.statsPellegrino.totKm = totKm;

    // calcolo stats viaggio attivo
    const lastViaggio = data.data[data.data.length - 1].viaggi;
    this.statsPellegrino.idViaggioAttivo = lastViaggio.idViaggio;
    const dArrivo = new Date(lastViaggio.dataArrivo);
    dArrivo.setHours(0, 0, 0, 0);
    if (dArrivo > this.dOggi) {
      this.statsPellegrino.viaggioAttivo = true;
      this.statsPellegrino.dataPartenza = lastViaggio.dataPartenza;
      this.statsPellegrino.dataArrivo = lastViaggio.dataArrivo;

      const tappe = data.data.filter(
        (d: any) => d.idViaggio == lastViaggio.idViaggio
      ); // selezione delle sole tappe che fanno parte del viaggio

      let km = 0.0,
        min = 0;
      tappe.forEach((t: any) => {
        if (t.idTappa == lastViaggio.idTappaPartenza)
          this.statsPellegrino.luogoPartenza = !lastViaggio.ordineInverso
            ? t.tappe.luogo1.nome
            : t.tappe.luogo2.nome;
        if (t.idTappa == lastViaggio.idTappaArrivo)
          this.statsPellegrino.luogoArrivo = !lastViaggio.ordineInverso
            ? t.tappe.luogo2.nome
            : t.tappe.luogo1.nome;
        km += t.tappe.km;
        min += this.oreToMinuti(t.tappe.durata); // trasformazione da ore a minuti per effettuare la somma
      });
      this.statsPellegrino.kmAttivo = km;
      this.statsPellegrino.oreAttivo = this.minutiToOre(min); // trasformazione inversa da minuti a ore per stampare il totale
    } else this.statsPellegrino.viaggioAttivo = false;
  }

  // funzione per trasformare le ore in minuti, con le ore scritte nel formato h.m
  private oreToMinuti(ore: number): number {
    const h = Math.floor(ore);
    const min = (ore - h) * 100;
    return h * 60 + min;
  }

  // funzione per trasformare i minuti in ore
  private minutiToOre(minutiTotali: number): number {
    const ore = Math.floor(minutiTotali / 60);
    const minuti = minutiTotali % 60;
    return ore + minuti / 100;
  }

  // funzione per raccogliere le informazioni del gestore
  private async getInfoGestore() {
    const resStruct = await fetch(
      `${environment.apiUrl}/strutture/username/${this.username}`,
      { method: 'GET' }
    );
    const dataStruct = await resStruct.json();

    if (!resStruct.ok) {
      this.notifyService.showFallimentoOperazione(
        'Recupero informazioni per statistiche gestore'
      );
      console.error(dataStruct.message + ' : ' + dataStruct.details);
      return;
    }

    const resPren = await fetch(
      `${environment.apiUrl}/prenotazioni/gestore/${this.username}`,
      { method: 'GET' }
    );
    const dataPren = await resPren.json();

    if (!resPren.ok) {
      this.notifyService.showFallimentoOperazione(
        'Recupero informazioni per statistiche gestore'
      );
      console.error(dataPren.message + ' : ' + dataPren.details);
      return;
    }

    // calcolo statistiche gestore
    this.statsGestore.nStrutture = dataStruct.data.length;
    if (this.statsGestore.nStrutture == 0) return;

    let nLetti = 0;
    dataStruct.data.forEach((s: any) => {
      nLetti += s.nLetti;
    }); // calcolo numero letti totale
    this.statsGestore.nPostiLetto = nLetti;

    this.statsGestore.totPrenotazioni = dataPren.data.length;
    this.statsGestore.futurePrenotazioni = dataPren.data.filter((p: any) => {
      // filter delle prenotazioni per raccogliere solo le prenotazioni future
      const dataPrenotazione = new Date(p.dataAlloggio);
      dataPrenotazione.setHours(0, 0, 0, 0);
      return dataPrenotazione >= this.dOggi;
    }).length; // ritorna la lunghezza dell'array
  }

  logout() {
    this.authService.logout();
  }

  // funzione per eliminare l'account
  async eliminaAccount() {
    if (
      !confirm(
        'Sei sicuro di voler eliminare questo account? Tutte le informazioni andranno perse e le prenotazioni in corso verranno disdette'
      )
    )
      return;
    const res = await fetch(
      `${environment.apiUrl}/users/delete/${this.username}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: this.userInfo.type }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Eliminazione account');
      console.error(data.message + ' : ' + data.details);
      return;
    }
    this.notifyService.showSuccessoOperazione('Eliminazione account');
    this.logout();
  }

  // funzione per eliminare il viaggio
  async eliminaViaggio() {
    if (
      !confirm(
        'Sei sicuro di voler eliminare il viaggio corrente? Tutte le informazioni andranno perse e le prenotazioni in corso verranno disdette'
      )
    )
      return;
    const res = await fetch(
      `${environment.apiUrl}/viaggi/delete/${this.statsPellegrino.idViaggioAttivo}`,
      { method: 'DELETE' }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Eliminazione viaggio');
      console.error(data.message + ' : ' + data.details);
      return;
    }
    this.notifyService.showSuccessoOperazione('Eliminazione viaggio');
    this.router.navigate(['/pellegrino/home', this.username]); // dopo aver eliminato il viaggio redirect alla home del pellegrino
  }
}
