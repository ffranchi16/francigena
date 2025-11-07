import { CommonModule } from '@angular/common';
import { Component, inject, Output, EventEmitter, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotifyService } from '../../../services/notifyService/notify-service';
import { environment } from '../../../../environments/environment';
import {
  TappaViaggio,
  Luogo,
  Tappa,
  TipoModifica,
  Viaggio,
  TappaViaggioDb,
} from '../../../../typings/custom-type.types';

@Component({
  selector: 'modifica-viaggio-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './modifica-viaggio-form.html',
  styleUrl: './modifica-viaggio-form.scss',
})
export class ModificaViaggioForm {
  visibility = false;
  listaTappe: Tappa[] = [];
  newViaggio: Viaggio | undefined;
  notifyService = inject(NotifyService);

  @Input() viaggioAttivo: Viaggio | undefined;
  @Input() tappeViaggio: TappaViaggio[] = [];
  @Input() listaLuoghi: Luogo[] = [];

  @Output() aggiornaViaggio = new EventEmitter<any>();

  // variabili utilizzate per il form
  tipo: TipoModifica = '';
  luogoPartenza: string = '';
  luogoArrivo: string = '';

  // Per sezione date
  dataOggi: string = '';
  dataPartenza: string = '';
  dataArrivo: string = '';
  dataMin: string = '';
  dataMax: string = '';

  // Per sezione tappe
  radioTappe: string = '';
  giorniViaggio: number = 0;

  giorniMin: number = 0;
  giorniMax: number = 0;

  luoghiDisponibiliPerArrivo: string[] = [];
  luoghiDisponibiliPerPartenza: string[] = [];

  luogoArrivoSelezionato: string = '';
  luogoPartenzaSelezionato: string = '';

  error = '';

  constructor() {
    this.loadTappe();
  }

  // funzione per caricare tutte le tappe della via francigena, anche quelle non incluse nel viaggio
  private async loadTappe() {
    const res = await fetch(`${environment.apiUrl}/tappe/`, { method: 'GET' });
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Recupero tappe');
      console.error(data.message + ' : ' + data.details);
      this.listaTappe = [];
      return;
    }

    data.data.forEach((tappa: any) =>
      this.listaTappe.push({
        id: tappa.id,
        km: tappa.km,
        durata: tappa.durata,
        luogo1: tappa.luogo1.nome,
        luogo2: tappa.luogo2.nome,
      })
    );
  }

  open() {
    this.visibility = true;
    this.luogoPartenza = this.tappeViaggio[0].partenza.nome;
    this.luogoArrivo =
      this.tappeViaggio[this.tappeViaggio.length - 1].arrivo.nome;
    this.giorniViaggio = this.countTotGiorni();
    this.dataOggi = new Date().toISOString().split('T')[0];

    this.calcInfo();
  }

  // funzione chiamato dal form quando l'utente cambia la scelta sul radio button
  onTipoModificaChange(tipoModifica: TipoModifica) {
    this.tipo = tipoModifica;
    this.resetForm();
    if (tipoModifica == 'date') {
      // se la scelta è di modificare le date, vanno calcolate tutte le possibili date
      this.dataPartenza = this.viaggioAttivo!.dataPartenza;
      this.dataArrivo = this.sommaGiorni(this.dataPartenza, this.giorniMin); // possibile data di arrivo camminando il minimo di giorni possibile
      this.dataMin = this.sommaGiorni(this.dataPartenza, this.giorniMin); // data minima di arrivo
      this.dataMax = this.sommaGiorni(this.dataPartenza, this.giorniMax); // data massima di arrivo
    }
  }

  // funzione chiamato dal form quando cambia la data di partenza, di conseguenza devono cambiare anche le date minime e massime selezionabili
  onDataPartenzaChange() {
    this.dataArrivo = '';
    this.dataMin = this.sommaGiorni(this.dataPartenza, this.giorniMin);
    this.dataMax = this.sommaGiorni(this.dataPartenza, this.giorniMax);
  }

  onAnnulla() {
    this.tipo = '';
    this.visibility = false;
    this.resetForm();
  }

  private resetForm() {
    this.dataPartenza = '';
    this.dataArrivo = '';
    this.luogoArrivoSelezionato = '';
    this.luogoPartenzaSelezionato = '';
    this.error = '';
  }

  // funzione per creare il nuovo viaggio in base alle scelte dell'utente su cosa cambiare
  async onSalva() {
    if (!this.isFormValido) return;

    let dataPNew = this.viaggioAttivo!.dataPartenza;
    let dataANew = this.viaggioAttivo!.dataArrivo;
    let tappaPNew = this.viaggioAttivo!.idTappaPartenza;
    let tappaANew = this.viaggioAttivo!.idTappaArrivo;

    if (this.tipo == 'date') {
      // se il tipo del radio button è date, vuol dire che le date di partenza e arrivo sono cambiate e le tappe sono rimaste invariate
      dataPNew = this.dataPartenza;
      dataANew = this.dataArrivo;

      if (!this.checkDate(new Date(dataPNew), new Date(dataANew))) {
        // controllo sulle date inserite
        this.error = 'Le nuove date inseriti non sono corrette';
        return;
      }
    } else {
      if (!this.viaggioAttivo!.ordineInverso) {
        // ordine classico da Nord a Sud
        if (this.radioTappe == 'tappaP')
          tappaPNew = this.listaTappe.find(
            (tappa) => tappa.luogo1 === this.luogoPartenzaSelezionato
          )!.id;
        else
          tappaANew = this.listaTappe.find(
            (tappa) => tappa.luogo2 === this.luogoArrivoSelezionato
          )!.id;
      } else {
        // con l'ordine inverso, la tappa di partenza sarà quella che ha la tappa scelta dall'utente come tappa di arrivo, perchè risalgo il percorso e quindi le tappe le faccio al contrario
        if (this.radioTappe == 'tappaP')
          tappaPNew = this.listaTappe.find(
            (tappa) => tappa.luogo2 === this.luogoPartenzaSelezionato
          )!.id;
        else
          tappaANew = this.listaTappe.find(
            (tappa) => tappa.luogo1 === this.luogoArrivoSelezionato
          )!.id;
      }
    }

    const formData = new FormData();
    formData.append('dataPartenza', dataPNew);
    formData.append('dataArrivo', dataANew);
    formData.append('idTappaPartenza', tappaPNew.toString());
    formData.append('idTappaArrivo', tappaANew.toString());
    let tappe: Tappa[] = [];
    if (!this.viaggioAttivo!.ordineInverso)
      tappe = this.listaTappe.filter(
        (tappa: Tappa) => tappa.id >= tappaPNew && tappa.id <= tappaANew
      ); // seleziono le tappe del nuovo viaggio
    else
      tappe = this.listaTappe
        .filter(
          (tappa: Tappa) => tappa.id <= tappaPNew && tappa.id >= tappaANew
        )
        .reverse(); // se l'ordine è al contrario allora le tappe vanno prese al contrario, ovvero la tappa con id più grande sarà la partenza invece che l'arrivo

    // creazione del viaggio diviso in tappe
    const viaggio = this.createViaggio(
      tappe,
      dataPNew,
      dataANew,
      this.viaggioAttivo!.ordineInverso,
      this.viaggioAttivo!.maxOre
    );
    viaggio.forEach((tappa, index) => {
      formData.append(`tappe[${index}]`, JSON.stringify(tappa));
    }); // invio di ogni tappa all'api

    const res = await fetch(
      `${environment.apiUrl}/viaggi/update/${this.viaggioAttivo!.idViaggio}`,
      {
        method: 'PUT',
        body: formData,
      }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Aggiornamento viaggio');
      console.error(data.message + ' : ' + data.details);
      this.onAnnulla();
      return;
    }
    const newViaggio: Viaggio = data.data;
    this.aggiornaViaggio.emit(newViaggio);
    this.onAnnulla();
  }

  get isFormValido(): boolean {
    if (this.tipo == 'date')
      return (
        Boolean(this.dataPartenza) && Boolean(this.dataArrivo)
      ); // per la data devono essere state selezionate entrambe
    else {
      if (this.radioTappe == 'tappaP')
        return Boolean(this.luogoPartenzaSelezionato);
      else if (this.radioTappe == 'tappaA')
        return Boolean(this.luogoArrivoSelezionato);
    }
    return false;
  }

  // funzione per calcolare tutte le informazioni necessarie per rendere il nuovo viaggio perfetto
  private calcInfo() {
    this.giorniMax = this.tappeViaggio.length; // il numero massimo di giorni del cammino è quando sosto in tutte le tappe, quindi un giorno per ogni tappa
    this.giorniMin = this.calcGiorniMin();
    this.calcLuoghiPerArrivo();
    this.calcLuoghiPerPartenza();
  }

  // il numero giorno minimo è quando accorpo più tappe possibili
  private calcGiorniMin(): number {
    let tappaIndex = this.viaggioAttivo!.idTappaPartenza;
    let giorni = 0;
    let minutiMax = this.oreToMinuti(this.viaggioAttivo!.maxOre);

    if (!this.viaggioAttivo!.ordineInverso) {
      // idTappaPartenza < idTappaArrivo
      while (tappaIndex <= this.viaggioAttivo!.idTappaArrivo) {
        let minutiCammino = 0;
        let t = this.listaTappe.find((ta) => {
          return ta.id == tappaIndex;
        });
        while (
          tappaIndex <= this.viaggioAttivo!.idTappaArrivo &&
          minutiCammino + this.oreToMinuti(t!.durata) <= minutiMax
        ) {
          // devo trasformare tutto in minuti altrimenti la somma viene errata, ad esempio la somma 6.3+5.3 verrebbe 11.6, anzichè 12h
          minutiCammino += this.oreToMinuti(t!.durata);
          tappaIndex++;
          t = this.listaTappe.find((ta) => {
            return ta.id == tappaIndex;
          });
        }
        giorni++;
      }
    } else {
      // idTappaPartenza > idTappaArrivo
      while (tappaIndex >= this.viaggioAttivo!.idTappaArrivo) {
        let minutiCammino = 0;
        let t = this.listaTappe.find((ta) => {
          return ta.id == tappaIndex;
        });
        while (
          tappaIndex >= this.viaggioAttivo!.idTappaArrivo &&
          minutiCammino + this.oreToMinuti(t!.durata) <= minutiMax
        ) {
          // devo trasformare tutto in minuti altrimenti la somma viene errata, ad esempio la somma 6.3+5.3 verrebbe 11.6, anzichè 12h
          minutiCammino += this.oreToMinuti(t!.durata);
          tappaIndex--;
          t = this.listaTappe.find((ta) => {
            return ta.id == tappaIndex;
          });
        }
        giorni++;
      }
    }
    return giorni;
  }

  // i luoghi per l'arrivo sono tutti quei luoghi che il pellegrino può raggiungere partendo da una partenza fissata, dal massimo accorpamento di tappe a 0 accorpamento
  private calcLuoghiPerArrivo() {
    let tappaIndex = this.viaggioAttivo!.idTappaPartenza;
    let giorni = 0;
    let minutiMax = this.oreToMinuti(this.viaggioAttivo!.maxOre);

    if (!this.viaggioAttivo!.ordineInverso) {
      while (giorni < this.giorniViaggio) {
        let minutiCammino = 0;
        let t = this.listaTappe.find((ta) => {
          return ta.id == tappaIndex;
        }); // t potrebbe essere undefined nel caso in cui idTappa < 1
        while (t && minutiCammino + this.oreToMinuti(t!.durata) <= minutiMax) {
          // devo trasformare tutto in minuti altrimenti la somma viene errata, ad esempio la somma 6.3+5.3 verrebbe 11.6, anzichè 12h
          minutiCammino += this.oreToMinuti(t!.durata);
          tappaIndex++;
          t = this.listaTappe.find((ta) => {
            return ta.id == tappaIndex;
          });
        }
        giorni++;
      }
      let idMin = this.viaggioAttivo!.idTappaPartenza + this.giorniViaggio - 1; // il minimo di id di tappa di arrivo è l'id di partenza + il numero di giorni di viaggio - 1 per l'ultimo giorno che è l'arrivo
      for (let i = idMin; i < tappaIndex; i++)
        this.luoghiDisponibiliPerArrivo.push(
          this.listaTappe.find((ta) => {
            return ta.id == i;
          })!.luogo2
        ); // tappaIndex rappresenta la tappa più lontana che il pellegrino può raggiungere accorpando al massimo, quindi i luoghi disponibili sono tutti quelli da idMin a tappaIndex
    } else {
      while (giorni < this.giorniViaggio) {
        let minutiCammino = 0;
        let t = this.listaTappe.find((ta) => {
          return ta.id == tappaIndex;
        });
        while (t && minutiCammino + this.oreToMinuti(t!.durata) <= minutiMax) {
          // devo trasformare tutto in minuti altrimenti la somma viene errata, ad esempio la somma 6.3+5.3 verrebbe 11.6, anzichè 12h
          console.log(t);
          minutiCammino += this.oreToMinuti(t!.durata);
          tappaIndex--;
          t = this.listaTappe.find((ta) => {
            return ta.id == tappaIndex;
          });
        }
        giorni++;
      }
      let idMax = this.viaggioAttivo!.idTappaPartenza - this.giorniViaggio + 1; // il massimo di id di tappa di arrivo è l'id di partenza + il numero di giorni di viaggio - 1 per l'ultimo giorno che è l'arrivo
      for (let i = idMax; i > tappaIndex; i--)
        this.luoghiDisponibiliPerArrivo.push(
          this.listaTappe.find((ta) => {
            return ta.id == i;
          })!.luogo1
        ); // rispetto a sopra cambia che l'id va a diminuire dato che l'ordine è inverso
    }
  }

  // per calcolare le possibili tappe di partenza fissata la tappa di arrivo, viene fatto un test su tutte le possibili tappe di partenza, partendo da quella senza raggruppamento
  private calcLuoghiPerPartenza() {
    if (!this.viaggioAttivo!.ordineInverso) {
      const idMin = this.viaggioAttivo!.idTappaArrivo - this.giorniViaggio + 1; // id della tappa di partenza senza nessun raggruppamento
      this.luoghiDisponibiliPerPartenza.push(
        this.listaTappe.find((ta) => {
          return ta.id == idMin;
        })!.luogo1
      );

      let idTappa = idMin - 1; // inizio a testare dalla tappa precedente
      while (true) {
        if (this.testViaggio(idTappa, this.viaggioAttivo!.ordineInverso)) {
          this.luoghiDisponibiliPerPartenza.push(
            this.listaTappe.find((ta) => {
              return ta.id == idTappa;
            })!.luogo1
          );
          idTappa--;
        } else break; // break quando il test da false, da lì in poi tutte le altre tappe darebbero sicuramente false
      }
    } else {
      const idMax = this.viaggioAttivo!.idTappaArrivo + this.giorniViaggio - 1; // id della tappa di partenza senza nessun raggruppamento

      this.luoghiDisponibiliPerPartenza.push(
        this.listaTappe.find((ta) => {
          return ta.id == idMax;
        })!.luogo2
      );

      let idTappa = idMax + 1; // inizio a testare dalla tappa successiva perchè l'ordine è inverso
      while (true) {
        if (this.testViaggio(idTappa, this.viaggioAttivo!.ordineInverso)) {
          this.luoghiDisponibiliPerPartenza.push(
            this.listaTappe.find((ta) => {
              return ta.id == idTappa;
            })!.luogo2
          );
          idTappa++;
        } else break;
      }
    }
  }

  // funzione per testare il viaggio da una tappa di partenza passata come parametro ad una tappa di arrivo fissata. Se ritorna true vuol dire che accorpando alcune tappe è possibile arrivare all'arrivo
  private testViaggio(idTappa: number, ordineInverso: boolean) {
    let giorni = 0;
    let minutiMax = this.oreToMinuti(this.viaggioAttivo!.maxOre);

    while (giorni < this.giorniViaggio) {
      if (idTappa == this.viaggioAttivo!.idTappaArrivo) return true;
      let minutiCammino = 0;
      let t = this.listaTappe.find((ta) => {
        return ta.id == idTappa;
      }); // t potrebbe essere undefined nel caso in cui idTappa > dell'ultima tappa
      while (t && minutiCammino + this.oreToMinuti(t!.durata) <= minutiMax) {
        // devo trasformare tutto in minuti altrimenti la somma viene errata, ad esempio la somma 6.3+5.3 verrebbe 11.6, anzichè 12h
        if (idTappa == this.viaggioAttivo!.idTappaArrivo) return true;
        minutiCammino += this.oreToMinuti(t!.durata);
        !ordineInverso ? idTappa++ : idTappa--;
        t = this.listaTappe.find((ta) => {
          return ta.id == idTappa;
        });
      }
      giorni++;
    }
    return false;
  }

  // funzione ausiliaria per eseguire calcoli sulle ore in modo corretto. I tempi di percorrenza sono nel formato h.mm
  private oreToMinuti(ore: number): number {
    const h = Math.floor(ore);
    const min = (ore - h) * 100;
    return h * 60 + min;
  }

  private sommaGiorni(dataStr: string, giorni: number): string {
    const data = new Date(dataStr);
    data.setDate(data.getDate() + giorni);
    return data.toISOString().split('T')[0];
  }

  // funzione che conta il numero di giorni totali di viaggio
  private countTotGiorni(): number {
    const partenza = new Date(this.viaggioAttivo!.dataPartenza);
    const arrivo = new Date(this.viaggioAttivo!.dataArrivo);
    return (
      Math.ceil(
        (arrivo.getTime() - partenza.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    ); // +1 per includere il primo giorno
  }

  private checkDate(dataP: Date, dataA: Date): boolean {
    // controlla se sono dopo la data di oggi
    const dOggi = new Date(this.dataOggi);
    dOggi.setHours(0, 0, 0, 0); // reset dell'orario per confrontare solo le date
    dataP.setHours(0, 0, 0, 0);
    dataA.setHours(0, 0, 0, 0);

    if (dOggi > dataP || dOggi > dataA) return false; // la data di partenza e di arrivo devono essere successive alla data odierna

    const dataMin = new Date(this.dataPartenza);
    dataMin.setDate(dataMin.getDate() + this.giorniMin);
    dataMin.setHours(0, 0, 0, 0);
    const dataMax = new Date(this.dataPartenza);
    dataMax.setDate(dataMax.getDate() + this.giorniMax);
    dataMax.setHours(0, 0, 0, 0);
    if (dataA >= dataMin && dataA <= dataMax) return true; // la data di arrivo deve essere inclusa tra il minimo e il massimo di date individuato
    return false;
  }

  // funzione per creare il nuovo viaggio utilizzando le scelte dell'utente
  private createViaggio(
    tappe: Tappa[],
    dataPartenza: string,
    dataArrivo: string,
    ordineInverso: boolean,
    maxOre: number
  ): TappaViaggioDb[] {
    const partenza = new Date(dataPartenza);
    const arrivo = new Date(dataArrivo);
    const totGiorni =
      Math.ceil(
        (arrivo.getTime() - partenza.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1; // +1 per includere il primo giorno

    const viaggio: TappaViaggioDb[] = [];
    let tappaIndex = 0;
    let giorniIndex = 0;
    for (
      giorniIndex;
      giorniIndex < totGiorni && giorniIndex < tappe.length;
      giorniIndex++
    ) {
      const dataPercorrenza = new Date(partenza);
      dataPercorrenza.setDate(partenza.getDate() + giorniIndex);

      // se il numero di tappe è minore o uguale rispetto al numero di giorni di viaggio, allora l'accorpamento non è necessario e per ogni giorno assegno una tappa
      if (tappe.length - tappaIndex <= totGiorni - giorniIndex) {
        viaggio.push(
          this.createTappa(ordineInverso, tappe, tappaIndex, dataPercorrenza)
        );
        tappaIndex++;
      } else {
        // accorpamento nello stesso giorno di più tappe, fino ad un massimo di maxOre ore di camminata giornalieri
        let minutiCammino = 0;
        let minutiMax = this.oreToMinuti(maxOre);
        while (
          minutiCammino + this.oreToMinuti(tappe[tappaIndex].durata) <=
          minutiMax
        ) {
          viaggio.push(
            this.createTappa(ordineInverso, tappe, tappaIndex, dataPercorrenza)
          );
          minutiCammino += this.oreToMinuti(tappe[tappaIndex].durata);
          tappaIndex++;
        }
      }
    }

    return viaggio;
  }

  // funzione per creare la tappa del viaggio a seconda dell'ordine scelto
  private createTappa(
    ordineInverso: boolean,
    tappe: Tappa[],
    tappaIndex: number,
    dataPercorrenza: Date
  ): TappaViaggioDb {
    let nomeTappa = '';
    if (ordineInverso)
      nomeTappa = tappe[tappaIndex].luogo2 + ' - ' + tappe[tappaIndex].luogo1;
    else
      nomeTappa = tappe[tappaIndex].luogo1 + ' - ' + tappe[tappaIndex].luogo2;

    let data = dataPercorrenza.toISOString().split('T')[0];
    const tappaViaggio = {
      idTappa: tappe[tappaIndex].id,
      dataPercorrenza: data,
      nomeTappa: nomeTappa,
    };
    return tappaViaggio;
  }
}
