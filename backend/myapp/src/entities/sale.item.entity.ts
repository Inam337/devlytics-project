import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Sale } from './sale.entity';
import { Product } from './product.entity';
@Entity()
export class SaleItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sale, (sale) => sale.items, {
    onDelete: 'CASCADE',
  })
  sale: Sale;

  @ManyToOne(() => Product)
  product: Product;

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;
}
