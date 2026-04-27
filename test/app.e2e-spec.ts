import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('App smoke (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api should be available', async () => {
    await request(app.getHttpServer()).get('/api').expect(200);
  });

  it('GET /auth/me should require auth', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
