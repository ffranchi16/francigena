import { CommonModule } from '@angular/common';
import { Component, inject, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NotifyService } from '../../../services/notifyService/notify-service';
import { OpenCageService } from '../../../services/openCage/open-cage-service';
import {
  StructForm,
  Luogo,
  Via,
  Struttura,
} from '../../../../typings/custom-type.types';

@Component({
  selector: 'struct-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './struct-form.component.html',
  styleUrl: './struct-form.component.scss',
})
export class StructFormComponent {
  showForm = false;
  username: string = '';
  struct: StructForm = {
    nome: '',
    citta: '',
    via: '',
    viaLat: 0,
    viaLon: 0,
    civico: 0,
    nLetti: 0,
    altreInfo: '',
    colore: '',
  };
  uploadedImage: any = null;
  luogo: Luogo = { nome: '', id: 0 };
  error = '';

  coloriDisponibili: any[] = [];
  editMode: boolean = false; // per distinguere tra aggiunta e modifica
  structIdModify: number = -1; // per tenere traccia dell'id della struttura in modifica
  originalImageUrl: string = ''; // per tenere traccia dell'immagine originale in caso di modifica

  notifyService = inject(NotifyService);
  openCageService = inject(OpenCageService);
  @Output() struttureAggiornate = new EventEmitter<void>();

  // variabili necessarie al suggerimento delle vie tramite il servizio di openCage
  vieSuggerite: Via[] = [];
  viaValida: boolean = false;
  private searchTerms = new Subject<string>();
  luoghi: Luogo[] = [];

  tuttiColori: any[] = [
    { value: '#4caf50', name: 'Verde', disabled: false },
    { value: '#2196f3', name: 'Blu', disabled: false },
    { value: '#ff9800', name: 'Arancione', disabled: false },
    { value: '#f44336', name: 'Rosso', disabled: false },
    { value: '#9c27b0', name: 'Viola', disabled: false },
    { value: '#ffeb3b', name: 'Giallo', disabled: false },
    { value: '#607d8b', name: 'Grigio', disabled: false },
    { value: '#795548', name: 'Marrone', disabled: false },
    { value: '#00bcd4', name: 'Ciano', disabled: false },
    { value: '#e884edff', name: 'Rosa', disabled: false },
  ];

  constructor() {
    // setup servizio openCage
    this.searchTerms
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((term) =>
          this.openCageService.searchStreet(this.struct.citta, term)
        )
      )
      .subscribe((results) => (this.vieSuggerite = results));
  }

  async openAddForm(username: string) {
    this.showForm = true;
    this.username = username;
    this.editMode = false;
    await this.caricaColoriDisponibili();
    await this.caricaLuoghi();
  }

  async openModifyForm(struct: Struttura) {
    this.showForm = true;
    this.editMode = true;
    this.username = struct.proprietario;
    this.viaValida = true;
    await this.caricaLuoghi();
    this.luogo = this.luoghi.find((luogo) => luogo.id === struct.idLuogo)!;
    if (this.luogo.nome) this.struct.citta = this.luogo.nome;

    // aggiornare la struttura senza cambiare il riferimento, ma solo aggiornando le proprietà, permette a ngModel di vedere i cambiamenti
    this.struct.nome = struct.nome;
    this.struct.via = struct.via;
    (this.struct.viaLat = struct.viaLat),
      (this.struct.viaLon = struct.viaLon),
      (this.struct.civico = struct.civico),
      (this.struct.nLetti = struct.nLetti),
      (this.struct.altreInfo = struct?.altreInfo || ''),
      (this.struct.colore = struct.colore);

    await this.caricaColoriDisponibili();

    const res = await fetch(
      `${environment.apiUrl}/strutture/foto/${struct.url}`,
      { method: 'GET' }
    );
    const data = await res.json(); // nessun controllo sull'esistenza dell'immagine, in caso non ci sia non verrà caricata la preview

    this.uploadedImage = {
      file: null,
      name: 'Immagine esistente',
      preview: data.data,
    };
    this.originalImageUrl = struct.url; // salvo l'url dell'immagine originale
    this.structIdModify = struct.id;
  }

  closeForm() {
    this.showForm = false;
    this.username = '';
    this.struct = {
      nome: '',
      citta: '',
      via: '',
      viaLat: 0,
      viaLon: 0,
      civico: 0,
      nLetti: 0,
      altreInfo: '',
      colore: '',
    };
    this.uploadedImage = null;
  }

  // funzione per caricare tutti i luoghi della via francigena
  private async caricaLuoghi() {
    const res = await fetch(`${environment.apiUrl}/tappe/luoghi/`, {
      method: 'GET',
    });
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Recupero luoghi tappe');
      console.error(data.message + ' : ' + data.details);
      this.luoghi = [];
      return;
    }

    this.luoghi = [...data.data];
  }

  // sezione gestione autocompletamento della via nel form
  onViaInput(value: string) {
    this.viaValida = false;
    if (value.length > 2 && this.struct.citta)
      this.searchTerms.next(
        value
      ); // inizia la ricerca quando si inseriscono almeno due caratteri
    else this.vieSuggerite = [];
  }

  selezionaVia(via: Via) {
    this.struct.via = via.name;
    this.struct.viaLat = via.lat;
    this.struct.viaLon = via.lng;
    this.vieSuggerite = [];
    this.viaValida = true; // per dire al form che la via è stata selezionata dall'elenco, così da garantire che sia una via appartenente alla città selezionata
  }

  // sezione gestione dell'immagine
  async triggerFileInput() {
    document.getElementById('fotoStruttura')?.click();
  }

  // gestione selezione file
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.handleFile(file);
  }

  private handleFile(file: File) {
    if (!file.type.match('image/jpeg|image/png|image/webp')) {
      // controllo sul tipo di file
      alert('Formato file non supportato. Usa JPG, PNG o WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // controllo sulla dimensione massima del file
      alert('Il file è troppo grande. Dimensione massima: 5MB.');
      return;
    }

    // creazione della preview dell'immagine
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.uploadedImage = {
        file: file,
        name: file.name,
        preview: e.target.result,
      };
    };
    reader.readAsDataURL(file);
  }

  removeImage(event: Event) {
    event.stopPropagation();
    this.uploadedImage = null;
    const fileInput = document.getElementById(
      'fotoStruttura'
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // sezione gestione colori
  async caricaColoriDisponibili() {
    const res = await fetch(
      `${environment.apiUrl}/strutture/coloriUsati/${this.username}`,
      { method: 'GET' }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Recupero colori usati');
      console.error(data.message + ' : ' + data.details);
      this.coloriDisponibili = [...this.tuttiColori];
      return;
    }

    // aggiornamento dell'array dei colori modificando la proprietà disabled per dire quali colori sono usati e quali no
    this.coloriDisponibili = this.tuttiColori.map((colore) => {
      const isUsato = data.data?.includes(colore.value);
      return {
        ...colore,
        disabled: isUsato,
        disabledReason: isUsato ? 'Colore già in uso' : '',
      };
    });
  }

  selezionaColore(colore: string) {
    if (this.coloreDisabilitato(colore)) return;
    this.struct.colore = colore;
  }

  private coloreDisabilitato(colore: string): boolean {
    // cerca il colore nella lista dei colori disponibili
    const coloreObj = this.coloriDisponibili.find((c) => c.value === colore);
    return coloreObj ? coloreObj.disabled : false;
  }

  async addStruct() {
    if (!this.validateForm()) return;

    // utilizzo di formData visto il file da inviare all'api
    const formData = new FormData();
    formData.append('nome', this.struct.nome);
    formData.append('viaNome', this.struct.via);
    formData.append('viaLat', this.struct.viaLat.toString()); // trasformazione dei valori numerici in stringhe
    formData.append('viaLon', this.struct.viaLon.toString());
    formData.append('civico', this.struct.civico.toString());
    formData.append('nLetti', this.struct.nLetti.toString());
    formData.append('altreInfo', this.struct.altreInfo);
    formData.append('colore', this.struct.colore);
    formData.append('proprietario', this.username);
    formData.append('foto', this.uploadedImage.file);

    const idLuogo = this.luoghi.find(
      (luogo) => luogo.nome === this.struct.citta
    )!.id;
    formData.append('idLuogo', idLuogo.toString());

    const res = await fetch(`${environment.apiUrl}/strutture`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Inserimento struttura');
      console.error(data.message + ' : ' + data.details);
      return;
    }

    this.notifyService.showSuccessoOperazione('Inserimento struttura');
    this.notifyService.notifyPellegrini('inserimento', data.data.id);
    this.struttureAggiornate.emit(); // Notifica alla pagina principale che le strutture sono state aggiornate per aggiornare l'UI
    this.closeForm();
  }

  async modifyStruct() {
    if (!this.validateForm()) return;

    var changeImg = false;
    if (this.uploadedImage.name !== 'Immagine esistente') changeImg = true; // se l'immagine è stata cambiata allora il nome non sarà "immagine esistente"

    // utilizzo di formData per inviare l'immagine all'API
    const formData = new FormData();
    formData.append('changeImg', changeImg.toString());
    formData.append('originalImgUrl', this.originalImageUrl);
    formData.append('nome', this.struct.nome);
    formData.append('viaNome', this.struct.via);
    formData.append('viaLat', this.struct.viaLat.toString());
    formData.append('viaLon', this.struct.viaLon.toString());
    formData.append('civico', this.struct.civico.toString());
    formData.append('nLetti', this.struct.nLetti.toString());
    formData.append('altreInfo', this.struct.altreInfo);
    formData.append('colore', this.struct.colore);
    formData.append('proprietario', this.username);
    formData.append('foto', this.uploadedImage.file);

    const idLuogo = this.luoghi.find(
      (luogo) => luogo.nome === this.struct.citta
    )!.id;
    formData.append('idLuogo', idLuogo.toString());

    const res = await fetch(
      `${environment.apiUrl}/strutture/${this.structIdModify}`,
      {
        method: 'PUT',
        body: formData, // l'header non serve perchè lo imposta in automatico
      }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Modifica struttura');
      console.error(data.message + ' : ' + data.details);
      return;
    }

    this.notifyService.showSuccessoOperazione('Modifica struttura');
    this.struttureAggiornate.emit(); // Notifica alla pagina principale che le strutture sono state aggiornate per aggiornare l'UI
    this.closeForm();
  }

  // funzione per controllare i dati inseriti nel form
  private validateForm(): boolean {
    if (
      !this.struct.nome ||
      !this.struct.citta ||
      !this.struct.civico ||
      !this.struct.nLetti ||
      !this.struct.colore
    ) {
      this.error = 'Tutti i campi sono obbligatori!!!';
      return false;
    }

    if (!this.uploadedImage) {
      this.error = 'Carica una foto della struttura!!!';
      return false;
    }

    if (this.struct.nLetti < 1) {
      this.error = 'Numero di letti non valido';
      return false;
    }

    if (this.struct.civico < 0) {
      this.error = 'Civico non valido';
      return false;
    }

    if (!this.viaValida) {
      this.error = "La via deve essere selezionata dall'elenco";
      return false;
    }

    return true;
  }

  async eliminaStruttura() {
    if (
      !confirm(
        'Sei sicuro di voler eliminare questa struttura? Se la elimini cancellerai anche tutte le prenotazioni fatte dai pellegrini per questa struttura'
      )
    )
      return;
    await this.notifyService.notifyPellegrini(
      'cancellazione',
      this.structIdModify
    ); // prima avviene l'invio della notifica, altrimenti poi il db non trova la struttura per recuperare le info

    const res = await fetch(
      `${environment.apiUrl}/strutture/${this.structIdModify}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fotoUrl: this.originalImageUrl }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      this.notifyService.showFallimentoOperazione('Eliminazione struttura');
      console.error(data.message + ' : ' + data.details);
      return;
    }

    this.notifyService.showSuccessoOperazione('Eliminazione struttura');
    this.struttureAggiornate.emit(); // Notifica alla pagina principale che le strutture sono state aggiornate per aggiornare l'interfaccia grafica
    this.closeForm();
  }
}
