import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale.item.entity';
import { CreateSaleItemDto } from './dto/create-sale-item.dto';
import { UpdateSaleItemDto } from './dto/update-sale-item.dto';
import { SaleItemRepository } from './sale.item.repository';

@Injectable()
export class SaleItemService {
  constructor(
    private readonly saleItemRepository: SaleItemRepository,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  private async resolveSale(saleId: number): Promise<Sale> {
    const sale = await this.saleRepo.findOne({ where: { id: saleId } });
    if (!sale) {
      throw new BadRequestException(`Sale ${saleId} not found`);
    }
    return sale;
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

  async create(dto: CreateSaleItemDto): Promise<SaleItem> {
    const item = this.saleItemRepository.create({
      sale: await this.resolveSale(dto.saleId),
      product: await this.resolveProduct(dto.productId),
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
    });
    return this.saleItemRepository.save(item);
  }

  findAll(): Promise<SaleItem[]> {
    return this.saleItemRepository.findAllWithRelations();
  }

  async findOne(id: number): Promise<SaleItem> {
    const item = await this.saleItemRepository.findByIdWithRelations(id);
    if (!item) throw new NotFoundException('Sale item not found');
    return item;
  }

  async update(id: number, dto: UpdateSaleItemDto): Promise<SaleItem> {
    const item = await this.findOne(id);
    const next: Partial<SaleItem> = {};

    if (dto.saleId !== undefined) {
      next.sale = await this.resolveSale(dto.saleId);
    }
    if (dto.productId !== undefined) {
      next.product = await this.resolveProduct(dto.productId);
    }
    if (dto.quantity !== undefined) next.quantity = dto.quantity;
    if (dto.unitPrice !== undefined) next.unitPrice = dto.unitPrice;

    return this.saleItemRepository.mergeAndSave(item, next);
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await this.saleItemRepository.remove(item);
  }
}
