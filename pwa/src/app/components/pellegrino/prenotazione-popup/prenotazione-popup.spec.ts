import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrenotazionePopup } from './prenotazione-popup';

describe('PrenotazionePopup', () => {
  let component: PrenotazionePopup;
  let fixture: ComponentFixture<PrenotazionePopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrenotazionePopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrenotazionePopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
