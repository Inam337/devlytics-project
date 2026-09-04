import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true, default: '' })
  description: string;

  @OneToMany(() => Product, (product) => product.category, {
    cascade: true,
    eager: false,
  })
  products: Product[];
}
