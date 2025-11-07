import { TestBed } from '@angular/core/testing';

import { OpenCageService } from './open-cage-service';

describe('OpenCageService', () => {
  let service: OpenCageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpenCageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
