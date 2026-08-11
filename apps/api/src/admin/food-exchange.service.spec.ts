import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { FoodExchangeService } from "./food-exchange.service";
import { PrismaService } from "../prisma/prisma.service";

describe("FoodExchangeService", () => {
  const prisma = {
    foodExchangeItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  let service: FoodExchangeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [FoodExchangeService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(FoodExchangeService);
  });

  it("lists items filtered by exchange group", async () => {
    prisma.foodExchangeItem.findMany.mockResolvedValue([]);

    await service.list({ exchangeGroup: "LEGUMES" });

    expect(prisma.foodExchangeItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { exchangeGroup: "LEGUMES" } }),
    );
  });

  it("lists all items when no filter is given", async () => {
    prisma.foodExchangeItem.findMany.mockResolvedValue([]);

    await service.list({});

    expect(prisma.foodExchangeItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
  });

  it("creates an item", async () => {
    const dto = { foodName: "Beans", exchangeGroup: "LEGUMES" as const, portionSize: "1/2 cup cooked" };
    prisma.foodExchangeItem.create.mockResolvedValue({ id: "1", ...dto });

    const result = await service.create(dto);

    expect(prisma.foodExchangeItem.create).toHaveBeenCalledWith({ data: dto });
    expect(result).toMatchObject(dto);
  });

  it("throws NotFoundException updating a missing item", async () => {
    prisma.foodExchangeItem.findUnique.mockResolvedValue(null);

    await expect(service.update("missing", { foodName: "X" })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.foodExchangeItem.update).not.toHaveBeenCalled();
  });

  it("throws NotFoundException removing a missing item", async () => {
    prisma.foodExchangeItem.findUnique.mockResolvedValue(null);

    await expect(service.remove("missing")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.foodExchangeItem.delete).not.toHaveBeenCalled();
  });

  it("updates an existing item", async () => {
    prisma.foodExchangeItem.findUnique.mockResolvedValue({ id: "1" });
    prisma.foodExchangeItem.update.mockResolvedValue({ id: "1", foodName: "Updated" });

    const result = await service.update("1", { foodName: "Updated" });

    expect(prisma.foodExchangeItem.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { foodName: "Updated" },
    });
    expect(result.foodName).toBe("Updated");
  });
});
