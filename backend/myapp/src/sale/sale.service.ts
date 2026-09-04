import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale.item.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleLineDto } from './dto/sale-line.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SaleRepository } from './sale.repository';

@Injectable()
export class SaleService {
  constructor(
    private readonly saleRepository: SaleRepository,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepo: Repository<SaleItem>,
  ) {}

  private async buildItems(lines: SaleLineDto[]): Promise<SaleItem[]> {
    if (!lines.length) {
      throw new BadRequestException('Sale requires at least one item');
    }

    const items: SaleItem[] = [];
    for (const line of lines) {
      const product = await this.productRepo.findOne({
        where: { id: line.productId, isActive: true },
      });
      if (!product) {
        throw new BadRequestException(`Product ${line.productId} not found`);
      }
      items.push(
        this.saleItemRepo.create({
          product,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        }),
      );
    }
    return items;
  }

  private calculateTotal(items: SaleItem[]): number {
    return items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );
  }

  async create(dto: CreateSaleDto): Promise<Sale> {
    const items = await this.buildItems(dto.items);
    const sale = this.saleRepository.create({
      items,
      totalAmount: this.calculateTotal(items),
    });
    const saved = await this.saleRepository.save(sale);
    return this.findOne(saved.id);
  }

  findAll(): Promise<Sale[]> {
    return this.saleRepository.findAllWithRelations();
  }

  async findOne(id: number): Promise<Sale> {
    const sale = await this.saleRepository.findByIdWithRelations(id);
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async update(id: number, dto: UpdateSaleDto): Promise<Sale> {
    const sale = await this.findOne(id);
    if (dto.items !== undefined) {
      sale.items = await this.buildItems(dto.items);
      sale.totalAmount = this.calculateTotal(sale.items);
    }
    await this.saleRepository.save(sale);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const sale = await this.findOne(id);
    await this.saleRepository.remove(sale);
  }
}
