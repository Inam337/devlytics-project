import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Purchase } from '../entities/purchase.entity';
import { PurchaseItem } from '../entities/purchase.item.entity';
import { CreatePurchaseItemDto } from './dto/create-purchase-item.dto';
import { UpdatePurchaseItemDto } from './dto/update-purchase-item.dto';
import { PurchaseItemRepository } from './purchase.item.repository';

@Injectable()
export class PurchaseItemService {
  constructor(
    private readonly purchaseItemRepository: PurchaseItemRepository,
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  private async resolvePurchase(purchaseId: number): Promise<Purchase> {
    const purchase = await this.purchaseRepo.findOne({ where: { id: purchaseId } });
    if (!purchase) {
      throw new BadRequestException(`Purchase ${purchaseId} not found`);
    }
    return purchase;
  }

  private async resolveProduct(productId: number): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      throw new BadRequestException(`Product ${productId} not found`);
    }
    return product;
  }

  async create(dto: CreatePurchaseItemDto): Promise<PurchaseItem> {
    const item = this.purchaseItemRepository.create({
      purchase: await this.resolvePurchase(dto.purchaseId),
      product: await this.resolveProduct(dto.productId),
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
    });
    return this.purchaseItemRepository.save(item);
  }

  findAll(): Promise<PurchaseItem[]> {
    return this.purchaseItemRepository.findAllWithRelations();
  }

  async findOne(id: number): Promise<PurchaseItem> {
    const item = await this.purchaseItemRepository.findByIdWithRelations(id);
    if (!item) throw new NotFoundException('Purchase item not found');
    return item;
  }

  async update(
    id: number,
    dto: UpdatePurchaseItemDto,
  ): Promise<PurchaseItem> {
    const item = await this.findOne(id);
    const next: Partial<PurchaseItem> = {};

    if (dto.purchaseId !== undefined) {
      next.purchase = await this.resolvePurchase(dto.purchaseId);
    }
    if (dto.productId !== undefined) {
      next.product = await this.resolveProduct(dto.productId);
    }
    if (dto.quantity !== undefined) next.quantity = dto.quantity;
    if (dto.unitPrice !== undefined) next.unitPrice = dto.unitPrice;

    return this.purchaseItemRepository.mergeAndSave(item, next);
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await this.purchaseItemRepository.remove(item);
  }
}
