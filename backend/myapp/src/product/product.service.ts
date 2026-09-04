import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductRepository } from './product.repository';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  private async resolveCategory(
    categoryId?: number,
  ): Promise<Category | undefined> {
    if (categoryId == null) {
      return undefined;
    }
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new BadRequestException(`Category ${categoryId} not found`);
    }
    return category;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const category = await this.resolveCategory(dto.categoryId);
    const product = this.productRepository.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      reorderLevel: dto.reorderLevel,
      unit: dto.unit,
      sku: dto.sku,
      type: dto.type,
      category,
      isActive: true,
    });
    return this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.findAllActiveWithRelations();
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findActiveByIdWithRelations(
      id,
    );
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  async findOneIncludingInactive(id: number): Promise<Product> {
    const product = await this.productRepository.findByIdWithRelations(id);
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const existing = await this.findOneIncludingInactive(id);
    const next: Partial<Product> = {};

    if (dto.name !== undefined) next.name = dto.name;
    if (dto.description !== undefined) next.description = dto.description;
    if (dto.price !== undefined) next.price = dto.price;
    if (dto.reorderLevel !== undefined) next.reorderLevel = dto.reorderLevel;
    if (dto.unit !== undefined) next.unit = dto.unit;
    if (dto.sku !== undefined) next.sku = dto.sku;
    if (dto.type !== undefined) next.type = dto.type;
    if (dto.categoryId !== undefined) {
      next.category = await this.resolveCategory(dto.categoryId);
    }

    return this.productRepository.mergeAndSave(existing, next);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOneIncludingInactive(id);
    if (!product.isActive) {
      return;
    }
    product.isActive = false;
    await this.productRepository.save(product);
  }
}
