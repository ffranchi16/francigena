import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StructFormComponent } from './struct-form.component';

describe('StructFormComponent', () => {
  let component: StructFormComponent;
  let fixture: ComponentFixture<StructFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StructFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StructFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
