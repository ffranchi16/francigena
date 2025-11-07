import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotifyService } from '../../../services/notifyService/notify-service';
import { environment } from '../../../../environments/environment';
import {
  Tappa,
  Luogo,
  TappaViaggioDb,
} from '../../../../typings/custom-type.types';

@Component({
  selector: 'app-viaggio-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './viaggio-form.html',
  styleUrl: './viaggio-form.scss',
})
export class ViaggioForm implements OnInit {
  username: string = '';
  showForm: boolean = false;
  errorMessage: string = '';
  dataAttuale: Date = new Date();
  currentStep = 1;
  listaTappe: Tappa[] = [];
  listaLuoghi: Luogo[] = [];

  tappaPartenza: string = '';
  tappaArrivo: string = '';
  textContainer = document.getElementsByClassName('text-container'); // serve per il form a più step
  @Output() formClosed = new EventEmitter<{
    loadMap: boolean;
    viaggioAttivo: any;
  }>();

  notifyService = inject(NotifyService);

  async ngOnInit() {
    await this.getListaTappe();
  }

  openForm(username: string) {
    this.username = username;
    this.showForm = true;
    this.dataAttuale = new Date();
    this.dataAttuale.setHours(0, 0, 0, 0); // reset dell'orario per confronto tra date
  }

  closeForm() {
    this.showForm = false;
    this.resetForm();
    this.formClosed.emit({ loadMap: false, viaggioAttivo: null }); // la mappa non va caricata perchè ho chiuso il form con la 'x'
  }

  private resetForm() {
    this.errorMessage = '';
    this.currentStep = 1;

    // reset del form
    (document.getElementById('dataPartenza') as HTMLInputElement).value = '';
    (document.getElementById('dataArrivo') as HTMLInputElement).value = '';
    (document.getElementById('nPersone') as HTMLInputElement).value = '1';
    (document.getElementById('maxOre') as HTMLInputElement).value = '1';

    this.tappaPartenza = '';
    this.tappaArrivo = '';
  }

  clickNext() {
    if (this.checkInput() && this.currentStep < this.textContainer.length) {
      this.currentStep++;
      this.errorMessage = '';
    }
  }

  clickPrev() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.errorMessage = '';
    }
  }

  async clickSubmit() {
    if (this.checkInput()) {
      // l'ordine classico è da Nord a Sud, quindi ordineInverso==true significa che sto risalendo il cammino da Sud a Nord
      const ordineInverso =
        this.listaLuoghi.find((luogo) => luogo.nome === this.tappaPartenza)!
          .id >
        this.listaLuoghi.find((luogo) => luogo.nome === this.tappaArrivo)!.id;
      const dataPartenza = (
        document.getElementById('dataPartenza') as HTMLInputElement
      ).value;
      const dataArrivo = (
        document.getElementById('dataArrivo') as HTMLInputElement
      ).value;
      const maxOre = parseFloat(
        (document.getElementById('maxOre') as HTMLInputElement).value
      );

      // utilizzo di formData per inviare l'array di tappe
      const formData = new FormData();
      formData.append('dataPartenza', dataPartenza);
      formData.append('dataArrivo', dataArrivo);
      formData.append(
        'nPersone',
        (document.getElementById('nPersone') as HTMLInputElement).value
      );
      formData.append('ordineInverso', ordineInverso.toString());
      formData.append('maxOre', maxOre.toString());

      let idTappaPartenza = 0;
      let idTappaArrivo = 0;
      if (!ordineInverso) {
        // ordine classico da Nord a Sud
        idTappaPartenza = this.listaTappe.find(
          (tappa) => tappa.luogo1 === this.tappaPartenza
        )!.id;
        idTappaArrivo = this.listaTappe.find(
          (tappa) => tappa.luogo2 === this.tappaArrivo
        )!.id;
      } else {
        // con l'ordine inverso, la tappa di partenza sarà quella che ha la tappa scelta dall'utente come tappa di arrivo, perchè risalgo il percorso e quindi le tappe le faccio al contrario
        idTappaPartenza = this.listaTappe.find(
          (tappa) => tappa.luogo2 === this.tappaPartenza
        )!.id;
        idTappaArrivo = this.listaTappe.find(
          (tappa) => tappa.luogo1 === this.tappaArrivo
        )!.id;
      }

      formData.append('idTappaPartenza', idTappaPartenza.toString());
      formData.append('idTappaArrivo', idTappaArrivo.toString());

      let tappeViaggio: Tappa[] = [];
      if (!ordineInverso)
        tappeViaggio = this.listaTappe.filter(
          (tappa: Tappa) =>
            tappa.id >= idTappaPartenza && tappa.id <= idTappaArrivo
        ); // tra tutte le tappe della via francigena selezione delle sole tappe interne al viaggio
      else
        tappeViaggio = this.listaTappe
          .filter(
            (tappa: Tappa) =>
              tappa.id <= idTappaPartenza && tappa.id >= idTappaArrivo
          )
          .reverse();

      const viaggio = this.createViaggio(
        tappeViaggio,
        dataPartenza,
        dataArrivo,
        ordineInverso,
        maxOre
      ); // creazione del viaggio diviso in tappe
      viaggio.forEach((tappa, index) => {
        formData.append(`tappe[${index}]`, JSON.stringify(tappa));
      });

      const res = await fetch(`${environment.apiUrl}/viaggi/${this.username}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        this.notifyService.showFallimentoOperazione('Inserimento viaggio');
        console.error(data.message + ' : ' + data.details);
        this.closeForm();
        return;
      }
      // viaggio inserito correttamente quindi è possibile caricare la mappa con il viaggio visibile
      this.notifyService.showSuccessoOperazione('Inserimento viaggio');
      this.showForm = false;
      this.resetForm();
      this.formClosed.emit({ loadMap: true, viaggioAttivo: data.data[0] });
    }
  }

  // funzione che controlla gli input inseriti
  private checkInput(): boolean {
    const inputs =
      this.textContainer[this.currentStep - 1].querySelectorAll('input'); // -1 perchè l'array parte da 0 e currentStep da 1
    let dataPartenza: Date;
    for (let input of inputs) {
      if (input.value === '') {
        this.errorMessage = 'Tutti i campi sono obbligatori';
        return false;
      }
      switch (input.id) {
        case 'dataPartenza':
          dataPartenza = new Date(input.value);
          dataPartenza.setHours(0, 0, 0, 0);
          if (this.dataAttuale >= dataPartenza) {
            this.errorMessage =
              'La data di partenza deve essere successiva alla data attuale';
            return false;
          }
          break;

        case 'dataArrivo':
          const dataArrivo = new Date(input.value);
          dataArrivo.setHours(0, 0, 0, 0);
          if (dataPartenza! > dataArrivo) {
            // posso mettere il ! in quanto sono sicuro che prima di analizzare dataArrivo ho analizzato dataPartenza
            this.errorMessage =
              'La data di arrivo deve essere successiva alla data attuale';
            return false;
          }
          break;
        case 'nPersone':
          const nPersone = parseInt(input.value, 10);
          if (nPersone < 1) {
            this.errorMessage = 'Il numero di persone deve essere almeno 1';
            return false;
          }
          break;
        case 'maxOre':
          const maxOre = parseFloat(input.value);
          if (maxOre < 1) {
            this.errorMessage =
              'Il numero di ore massime di cammino deve essere almeno 1';
            return false;
          }
          break;
        default:
          break; // per i campi che non hanno bisogno di controllo vado avanti
      }
    }

    // check tappe
    if (this.currentStep == 2) {
      if (this.tappaPartenza === '' || this.tappaArrivo === '') {
        this.errorMessage = 'Tutti i campi sono obbligatori';
        return false;
      }
      if (this.tappaPartenza === this.tappaArrivo) {
        this.errorMessage = "L'arrivo deve essere diverso dalla partenza";
        return false;
      }
    }
    return true;
  }

  // funzione che raccoglie dal db tutte le tappe della via francigena
  private async getListaTappe() {
    const resTappe = await fetch(`${environment.apiUrl}/tappe`, {
      method: 'GET',
    });
    const dataTappe = await resTappe.json();

    if (!resTappe.ok) {
      this.notifyService.showFallimentoOperazione('Recupero tappe');
      console.error(dataTappe.message + ' : ' + dataTappe.details);
      this.listaTappe = [];
      return;
    }

    dataTappe.data.forEach((tappa: any) =>
      this.listaTappe.push({
        id: tappa.id,
        km: tappa.km,
        durata: tappa.durata,
        luogo1: tappa.luogo1.nome,
        luogo2: tappa.luogo2.nome,
      })
    );

    const resLuoghi = await fetch(`${environment.apiUrl}/tappe/luoghi`, {
      method: 'GET',
    }); // prende la lista di tutti i luoghi presenti nel cammino della via francigena
    const dataLuoghi = await resLuoghi.json();
    if (!resLuoghi.ok) {
      this.notifyService.showFallimentoOperazione('Recupero luoghi');
      console.error(dataLuoghi.message + ' : ' + dataLuoghi.details);
      this.listaLuoghi = [];
      return;
    }

    this.listaLuoghi = [...dataLuoghi.data];
  }

  // crea il viaggio secondo l'ordine passato raggruppando se necessario più tappe nello stesso giorno
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
          // devo trasformare tutto in minuti altrimenti la somma viene errata, ad esempio la somma 6.3+5.3 verrebbe 11.6, anzichè 12h
          viaggio.push(
            this.createTappa(ordineInverso, tappe, tappaIndex, dataPercorrenza)
          );
          minutiCammino += this.oreToMinuti(tappe[tappaIndex].durata);
          tappaIndex++;
        }
      }
    }

    // per tutte le tappe rimanenti, se presenti, creo la tappa con dataPercorrenza null
    for (tappaIndex; tappaIndex < tappe.length; tappaIndex++)
      viaggio.push(this.createTappa(ordineInverso, tappe, tappaIndex, null));

    return viaggio;
  }

  // funzione per creare una tappa a seconda dell'ordine di viaggio
  private createTappa(
    ordineInverso: boolean,
    tappe: Tappa[],
    tappaIndex: number,
    dataPercorrenza: Date | null
  ): TappaViaggioDb {
    let nomeTappa = '';
    if (ordineInverso)
      nomeTappa = tappe[tappaIndex].luogo2 + ' - ' + tappe[tappaIndex].luogo1;
    else
      nomeTappa = tappe[tappaIndex].luogo1 + ' - ' + tappe[tappaIndex].luogo2;

    let data = null;
    if (dataPercorrenza != null)
      data = dataPercorrenza.toISOString().split('T')[0];
    const tappaViaggio: TappaViaggioDb = {
      idTappa: tappe[tappaIndex].id,
      dataPercorrenza: data,
      nomeTappa: nomeTappa,
    };
    return tappaViaggio;
  }

  // funzione ausiliaria per calcolare in modo corretto il tempo di cammino massimo giornaliero, dato che il formato delle ore h.mm
  private oreToMinuti(ore: number): number {
    // esempio 6.30
    const h = Math.floor(ore); // parte intera 6
    const min = (ore - h) * 100; // es. da 0.3 a 30 minuti
    return h * 60 + min; // minuti totali es. 390
  }
}
