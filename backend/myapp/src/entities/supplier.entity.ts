import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Purchase } from './purchase.entity';
@Entity()
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactNumber: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @OneToMany(() => Purchase, (purchase) => purchase.supplier)
  purchases: Purchase[];
}
