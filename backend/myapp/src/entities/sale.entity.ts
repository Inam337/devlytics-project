import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { SaleItem } from './sale.item.entity';
@Entity()
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @CreateDateColumn()
  soldAt: Date;
}
