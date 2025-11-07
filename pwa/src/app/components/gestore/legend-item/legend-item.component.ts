import { Component, Input } from '@angular/core';

@Component({
  selector: 'legend-item',
  imports: [],
  templateUrl: './legend-item.component.html',
  styleUrl: './legend-item.component.scss',
})
export class LegendItemComponent {
  @Input() name: string = '';
  @Input() color: string = '';
}
