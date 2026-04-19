import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { createHttpValidationPipe } from '../src/common/validation/http-validation.pipe';
import { PrismaService } from '../src/database/prisma.service';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        enableShutdownHooks: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(createHttpValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/health/liveness (GET)', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server).get('/health/liveness').expect(200).expect({
      status: 'ok',
      service: 'user-activity-tracking',
    });
  });

  it('returns the custom validation error payload for invalid activity query', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get(
        '/users/550e8400-e29b-41d4-a716-446655440000/activity?from=2026-04-01&to=2026-06-17T23:59:59.999Z&type=sleeping&limit=101&cursor=bad-cursor',
      )
      .expect(400)
      .expect((response: { body: Record<string, unknown> }) => {
        expect(response.body).toEqual({
          code: 'VALIDATION_FAILED',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'from',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              constraints: expect.arrayContaining([
                expect.stringContaining(
                  'must be an ISO-8601 datetime with explicit timezone',
                ),
              ]),
            }),
            expect.objectContaining({
              field: 'type',
              constraints: [
                'type must be one of the following values: walking, running, workout',
              ],
            }),
            expect.objectContaining({
              field: 'from',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              constraints: expect.arrayContaining([
                'period must not exceed 31 days',
              ]),
            }),
            expect.objectContaining({
              field: 'limit',
              constraints: ['limit must not be greater than 100'],
            }),
            expect.objectContaining({
              field: 'cursor',
              constraints: ['cursor must be a valid activity page cursor'],
            }),
          ]),
        });
      });
  });
});
