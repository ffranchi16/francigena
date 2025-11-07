import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StructItemComponent } from './struct-item.component';

describe('StructItemComponent', () => {
  let component: StructItemComponent;
  let fixture: ComponentFixture<StructItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StructItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StructItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
