import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PellegrinoChecklist } from './checklist';

describe('Checklist', () => {
  let component: PellegrinoChecklist;
  let fixture: ComponentFixture<PellegrinoChecklist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PellegrinoChecklist]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PellegrinoChecklist);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
