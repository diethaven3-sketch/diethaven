import { Injectable, NotFoundException } from "@nestjs/common";
import type { FoodExchangeItemCreateInput, FoodExchangeItemUpdateInput, FoodExchangeQuery } from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FoodExchangeService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: FoodExchangeQuery) {
    return this.prisma.foodExchangeItem.findMany({
      where: query.exchangeGroup ? { exchangeGroup: query.exchangeGroup } : undefined,
      orderBy: { foodName: "asc" },
    });
  }

  create(dto: FoodExchangeItemCreateInput) {
    return this.prisma.foodExchangeItem.create({ data: dto });
  }

  async update(id: string, dto: FoodExchangeItemUpdateInput) {
    await this.assertExists(id);
    return this.prisma.foodExchangeItem.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.foodExchangeItem.delete({ where: { id } });
  }

  private async assertExists(id: string) {
    const item = await this.prisma.foodExchangeItem.findUnique({ where: { id }, select: { id: true } });
    if (!item) {
      throw new NotFoundException("Food exchange item not found");
    }
  }
}
