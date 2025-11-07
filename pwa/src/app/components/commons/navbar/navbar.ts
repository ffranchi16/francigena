import { Component, Input, OnInit } from '@angular/core';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'navbar',
  imports: [],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
  @Input() username: string = '';
  @Input() active: string = 'calendar';
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);
  tipo = '';

  ngOnInit() {
    const currentRoute = this.activatedRoute.snapshot.parent?.routeConfig?.path;
    console.log(currentRoute);
    this.tipo = currentRoute == 'pellegrino' ? 'pellegrino' : 'gestore';
  }

  isActive(section: string): boolean {
    return this.active === section;
  }

  // route comuni
  navigateToProfilo() {
    this.router.navigate(['/', this.tipo, 'profilo', this.username]);
  }

  // route pellegrino
  navigateToMappa() {
    this.router.navigate(['/pellegrino/home', this.username]);
  }

  navigateToChecklist() {
    this.router.navigate(['/pellegrino/checklist', this.username]);
  }

  // route gestore
  navigateToCalendar() {
    this.router.navigate(['/gestore/home', this.username]);
  }

  navigateToModify() {
    this.router.navigate(['/gestore/modify', this.username]);
  }
}
