import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { Navbar } from '../../commons/navbar/navbar';
import { NotifyService } from '../../../services/notifyService/notify-service';
import { Categoria, Item } from '../../../../typings/custom-type.types';

@Component({
  selector: 'checklist',
  imports: [Navbar, FormsModule, CommonModule],
  templateUrl: './checklist.html',
  styleUrl: './checklist.scss',
})
export class PellegrinoChecklist implements OnInit {
  username: string = '';
  idViaggioAttivo: number = -1;
  checkList: Categoria[] = [];
  inputNewCat = '';
  activatedRoute = inject(ActivatedRoute);
  notifyService = inject(NotifyService);

  async ngOnInit() {
    this.username = this.activatedRoute.snapshot.params?.['username'] || '';

    // dallo username ricavo l'id del viaggio, perchè la checklist è relativa al viaggio e non all'utente
    const resViaggio = await fetch(
      `${environment.apiUrl}/viaggi/attivo/${this.username}`,
      { method: 'GET' }
    );
    const dataViaggio = await resViaggio.json();

    if (!resViaggio.ok) {
      console.error(dataViaggio.message + ' : ' + dataViaggio.details);
      this.notifyService.showFallimentoOperazione('Recupero viaggio attivo');
      this.idViaggioAttivo = -1;
      return;
    }

    if (dataViaggio.data.length == 0) return;
    this.idViaggioAttivo = dataViaggio.data[0].idViaggio;

    // raccolta della checklist da id viaggio
    const resCheck = await fetch(
      `${environment.apiUrl}/checklist/${this.idViaggioAttivo}`,
      { method: 'GET' }
    );
    const dataCheck = await resCheck.json();

    if (!resCheck.ok) {
      console.error(dataCheck.message + ' : ' + dataCheck.details);
      this.notifyService.showFallimentoOperazione('Recupero checklist');
      this.checkList = [];
      return;
    }

    dataCheck.data.forEach((categoria: any) => {
      this.checkList.push({
        idViaggio: categoria.idViaggio,
        idCategoria: categoria.idCategoria,
        nome: categoria.nome,
        item: categoria.check_item, // la tabella nel db si chiama check_item, quindi il join ritorna l'array check-item:Item
        inputNewItem: '',
      });
    });
  }

  // funzione per gestire il check/uncheck di un item della checklist
  async toggleItem(item: Item) {
    item.checked = !item.checked; // prima aggiorno la UI
    const res = await fetch(
      `${environment.apiUrl}/checklist/item/check/${item.idItem}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: item.checked }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      console.error(data.message + ' : ' + data.details);
      this.notifyService.showFallimentoOperazione('Check item');
      return;
    }
  }

  async removeItem(categoria: Categoria, idItem: number) {
    // prima aggiorno la UI e poi il db
    categoria.item = categoria.item.filter((item: Item) => {
      return item.idItem !== idItem;
    });

    const res = await fetch(`${environment.apiUrl}/checklist/item/${idItem}`, {
      method: 'DELETE',
    });
    const data = await res.json();

    if (!res.ok) {
      console.error(data.message + ' : ' + data.details);
      this.notifyService.showFallimentoOperazione(
        'Rimozione elemento dalla checklist'
      );
      return;
    }
  }

  async addItem(categoria: Categoria) {
    if (!categoria.inputNewItem) return;
    // prima di aggiornare la UI è necessaria la chiamata al db perchè l'id dell'item viene assegnato in modo sequenziale e univoco direttamente da Supabase
    const res = await fetch(
      `${environment.apiUrl}/checklist/item/${categoria.idCategoria}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testo: categoria.inputNewItem }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      console.error(data.message + ' : ' + data.details);
      this.notifyService.showFallimentoOperazione('Inserimento nuovo item');
      return;
    }

    // aggiornamento della UI con l'item appena ritornato dal db
    const newItem: Item = data.data;
    categoria.item.push(newItem);
    categoria.inputNewItem = '';
  }

  async addCategory() {
    if (!this.inputNewCat) return;

    // prima di aggiornare la UI è necessaria la chiamata al db perchè l'id della categoria viene assegnato in modo sequenziale e univoco direttamente da Supabase
    const res = await fetch(
      `${environment.apiUrl}/checklist/category/${this.idViaggioAttivo}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: this.inputNewCat }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      console.error(data.message + ' : ' + data.details);
      this.notifyService.showFallimentoOperazione('Inserimento nuovo item');
      return;
    }

    // aggiornamento della UI con l'item appena ritornato dal db
    this.checkList.push({
      idViaggio: data.data.idViaggio,
      idCategoria: data.data.idCategoria,
      nome: data.data.nome,
      item: [], // categoria nuova quindi lista item vuota
      inputNewItem: '',
    });
    this.inputNewCat = '';
  }
}
