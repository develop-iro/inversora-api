import { ProductFeedbackRepository } from './product-feedback.repository';
import { PrismaService } from '../../../shared/database/prisma.service';

describe('ProductFeedbackRepository', () => {
  let repository: ProductFeedbackRepository;
  let prisma: {
    productFeedback: {
      create: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      productFeedback: {
        create: jest.fn().mockResolvedValue({ id: 'fb-1' }),
      },
    };

    repository = new ProductFeedbackRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('should persist feedback with optional metadata', async () => {
    await repository.create({
      clarity: 'somewhat',
      wouldReturn: 'maybe',
      message: 'Más ejemplos en la calculadora.',
      surface: 'feedback',
      deviceId: 'device-1',
      appEnv: 'qa',
      appVersion: '1.0.0',
    });

    expect(prisma.productFeedback.create).toHaveBeenCalledWith({
      data: {
        clarity: 'somewhat',
        wouldReturn: 'maybe',
        message: 'Más ejemplos en la calculadora.',
        surface: 'feedback',
        deviceId: 'device-1',
        appEnv: 'qa',
        appVersion: '1.0.0',
      },
    });
  });

  it('should omit empty messages', async () => {
    await repository.create({
      clarity: 'yes',
      wouldReturn: 'yes',
      message: '   ',
      surface: 'feedback',
    });

    expect(prisma.productFeedback.create).toHaveBeenCalledWith({
      data: {
        clarity: 'yes',
        wouldReturn: 'yes',
        message: undefined,
        surface: 'feedback',
        deviceId: undefined,
        appEnv: undefined,
        appVersion: undefined,
      },
    });
  });
});
