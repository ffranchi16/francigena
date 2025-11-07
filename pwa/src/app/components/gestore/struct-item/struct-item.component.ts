import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Struttura } from '../../../../typings/custom-type.types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'struct-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './struct-item.component.html',
  styleUrl: './struct-item.component.scss',
})
export class StructItemComponent implements OnInit {
  @Input() struct: Struttura = {
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
  };
  @Output() openFormRequest = new EventEmitter<Struttura>();
  publicUrl: string = '';

  async ngOnInit() {
    if (!this.struct) return;

    // se l'api non ritorna nessun url l'anteprima non verrà caricata
    const res = await fetch(
      `${environment.apiUrl}/strutture/foto/${this.struct.url}`,
      { method: 'GET' }
    );
    const data = await res.json();
    this.publicUrl = data.data;
  }

  openForm() {
    this.openFormRequest.emit(this.struct);
  }
}
