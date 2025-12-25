import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
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

    it('/ (GET)', () => {
        return request(app.getHttpServer())
            .get('/')
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('message');
                expect(res.body.message).toBe('Salary Calculator API');
            });
    });

    it('/api/common/cities (GET)', () => {
        return request(app.getHttpServer())
            .get('/api/common/cities')
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('cities');
                expect(Array.isArray(res.body.cities)).toBe(true);
            });
    });

    it('/api/common/companies (GET)', () => {
        return request(app.getHttpServer())
            .get('/api/common/companies')
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('companies');
                expect(Array.isArray(res.body.companies)).toBe(true);
            });
    });

    it('/api/salary/calculate (POST) - should require authentication', () => {
        return request(app.getHttpServer())
            .post('/api/salary/calculate')
            .send({
                ctc: 1000000,
                city: 'Mumbai',
            })
            .expect(401);
    });
});

