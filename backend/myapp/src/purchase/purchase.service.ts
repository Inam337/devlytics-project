import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Purchase } from '../entities/purchase.entity';
import { PurchaseItem } from '../entities/purchase.item.entity';
import { Supplier } from '../entities/supplier.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseLineDto } from './dto/purchase-line.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseRepository } from './purchase.repository';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly purchaseRepository: PurchaseRepository,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(PurchaseItem)
    private readonly purchaseItemRepo: Repository<PurchaseItem>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  private async resolveSupplier(supplierId?: number): Promise<Supplier | null> {
    if (supplierId == null) {
      return null;
    }
    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier) {
      throw new BadRequestException(`Supplier ${supplierId} not found`);
    }
    return supplier;
  }

  private async buildItems(lines: PurchaseLineDto[]): Promise<PurchaseItem[]> {
    if (!lines.length) {
      throw new BadRequestException('Purchase requires at least one item');
    }

    const items: PurchaseItem[] = [];
    for (const line of lines) {
      const product = await this.productRepo.findOne({
        where: { id: line.productId, isActive: true },
      });
      if (!product) {
        throw new BadRequestException(`Product ${line.productId} not found`);
      }
      items.push(
        this.purchaseItemRepo.create({
          product,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        }),
      );
    }
    return items;
  }

  private calculateTotal(items: PurchaseItem[]): number {
    return items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );
  }

  async create(dto: CreatePurchaseDto): Promise<Purchase> {
    const items = await this.buildItems(dto.items);
    const purchase = this.purchaseRepository.create({
      supplier: (await this.resolveSupplier(dto.supplierId)) ?? undefined,
      items,
      totalAmount: this.calculateTotal(items),
    });
    const saved = await this.purchaseRepository.save(purchase);
    return this.findOne(saved.id);
  }

  findAll(): Promise<Purchase[]> {
    return this.purchaseRepository.findAllWithRelations();
  }

  async findOne(id: number): Promise<Purchase> {
    const purchase = await this.purchaseRepository.findByIdWithRelations(id);
    if (!purchase) throw new NotFoundException('Purchase not found');
    return purchase;
  }

  async update(id: number, dto: UpdatePurchaseDto): Promise<Purchase> {
    const purchase = await this.findOne(id);

    if (dto.supplierId !== undefined) {
      purchase.supplier = (await this.resolveSupplier(dto.supplierId)) as Supplier;
    }
    if (dto.items !== undefined) {
      purchase.items = await this.buildItems(dto.items);
      purchase.totalAmount = this.calculateTotal(purchase.items);
    }

    await this.purchaseRepository.save(purchase);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const purchase = await this.findOne(id);
    await this.purchaseRepository.remove(purchase);
  }
}
