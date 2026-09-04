import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Stock } from './stock.entity';
import { ProductType } from './product-type.enum';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ type: 'int' })
  reorderLevel: number;

  @Column({
    type: 'enum',
    enum: ProductType,
    default: ProductType.GOODS,
  })
  type: ProductType;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Stock, (stock) => stock.product)
  stockEntries: Stock[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
