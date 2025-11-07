import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NotifyService } from '../../../services/notifyService/notify-service';
import { Navbar } from '../../commons/navbar/navbar';
import { StructFormComponent } from '../struct-form/struct-form.component';
import { StructItemComponent } from '../struct-item/struct-item.component';
import { Struttura } from '../../../../typings/custom-type.types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'gestore-modify',
  imports: [CommonModule, Navbar, StructFormComponent, StructItemComponent],
  templateUrl: './gestore-modify.component.html',
  styleUrl: './gestore-modify.component.scss',
})
export class GestoreModify implements OnInit {
  username: string = '';
  strutture: Struttura[] = [];
  @ViewChild('structForm') structForm!: StructFormComponent; // il ! serve per non avere un'inizializzazione immediata
  notifyService = inject(NotifyService);
  activatedRoute = inject(ActivatedRoute);

  async ngOnInit() {
    this.username = this.activatedRoute.snapshot.params?.['username'] || '';
    await this.getStrutture();
  }

  openAddStruct() {
    this.structForm.openAddForm(this.username);
  }

  private async getStrutture() {
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
    this.strutture = [...data.data];
  }

  async struttureAggiornate() {
    await this.getStrutture();
  }
}
