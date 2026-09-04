import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StockRepository } from './stock.repository';

@Injectable()
export class StockService {
  constructor(
    private readonly stockRepository: StockRepository,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  private async resolveProduct(productId: number): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      throw new BadRequestException(`Product ${productId} not found`);
    }
    return product;
  }

  async create(dto: CreateStockDto): Promise<Stock> {
    const stock = this.stockRepository.create({
      product: await this.resolveProduct(dto.productId),
      quantity: dto.quantity,
      location: dto.location,
    });
    return this.stockRepository.save(stock);
  }

  findAll(): Promise<Stock[]> {
    return this.stockRepository.findAllWithRelations();
  }

  async findOne(id: number): Promise<Stock> {
    const stock = await this.stockRepository.findByIdWithRelations(id);
    if (!stock) throw new NotFoundException('Stock not found');
    return stock;
  }

  async update(id: number, dto: UpdateStockDto): Promise<Stock> {
    const stock = await this.findOne(id);
    const next: Partial<Stock> = {};

    if (dto.productId !== undefined) {
      next.product = await this.resolveProduct(dto.productId);
    }
    if (dto.quantity !== undefined) next.quantity = dto.quantity;
    if (dto.location !== undefined) next.location = dto.location;

    return this.stockRepository.mergeAndSave(stock, next);
  }

  async remove(id: number): Promise<void> {
    const stock = await this.findOne(id);
    await this.stockRepository.remove(stock);
  }
}
