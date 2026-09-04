import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

import { Product } from './product.entity';
import { Purchase } from './purchase.entity';

@Entity()
export class PurchaseItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Purchase, (purchase) => purchase.items, {
    onDelete: 'CASCADE',
  })
  purchase: Purchase;

  @ManyToOne(() => Product)
  product: Product;

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;
}
