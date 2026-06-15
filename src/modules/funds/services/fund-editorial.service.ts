import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Fund } from '../entities/fund.schema';
import type { UpdateFundEditorialInput } from '../entities/fund-editorial.schema';
import { updateFundEditorialInputSchema } from '../entities/fund-editorial.schema';
import { FundsRepository } from '../repositories/funds.repository';

/** Input for admin editorial updates. */
export type UpdateFundEditorialServiceInput = {
  fundId: string;
  editorial: UpdateFundEditorialInput;
};

/**
 * Manages persisted editorial product copy on fund records.
 */
@Injectable()
export class FundEditorialService {
  constructor(private readonly fundsRepository: FundsRepository) {}

  /**
   * Updates editorial fields for a fund.
   *
   * @param input - Fund id and partial editorial payload.
   * @returns Updated fund entity.
   */
  async updateEditorial(input: UpdateFundEditorialServiceInput): Promise<Fund> {
    const editorial = updateFundEditorialInputSchema.parse(input.editorial);

    if (
      editorial.badge === undefined &&
      editorial.themeLabel === undefined &&
      editorial.idealForBeginners === undefined
    ) {
      throw new BadRequestException('At least one editorial field is required');
    }

    const existing = await this.fundsRepository.findById(input.fundId);

    if (existing === null) {
      throw new NotFoundException(`Fund ${input.fundId} was not found`);
    }

    return this.fundsRepository.updateEditorial(input.fundId, editorial);
  }
}
