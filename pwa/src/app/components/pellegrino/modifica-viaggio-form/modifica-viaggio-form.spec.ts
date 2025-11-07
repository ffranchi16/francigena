import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModificaViaggioForm } from './modifica-viaggio-form';

describe('ModificaViaggioForm', () => {
  let component: ModificaViaggioForm;
  let fixture: ComponentFixture<ModificaViaggioForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModificaViaggioForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModificaViaggioForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
