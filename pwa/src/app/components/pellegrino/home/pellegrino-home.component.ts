import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MappaComponent } from '../mappa/mappa.component';
import { Navbar } from '../../commons/navbar/navbar';
import { NotifyService } from '../../../services/notifyService/notify-service';

@Component({
  selector: 'pellegrino-home',
  imports: [MappaComponent, Navbar],
  templateUrl: './pellegrino-home.component.html',
  styleUrl: './pellegrino-home.component.scss',
})
export class PellegrinoHome implements OnInit {
  username: string = '';
  activatedRoute = inject(ActivatedRoute);
  notifyService = inject(NotifyService);

  async ngOnInit() {
    this.username = this.activatedRoute.snapshot.params?.['username'] || '';
    await this.notifyService.registerPush(this.username); // registrazione dell'utente al sistema di notifiche
  }
}
