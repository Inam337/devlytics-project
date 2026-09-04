import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CartRepository } from './cart.repository';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async getUserCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepository.findByUserIdWithItems(userId);
    if (!cart) {
      cart = this.cartRepository.create({
        user: { id: userId } as Cart['user'],
        items: [],
      });
      await this.cartRepository.save(cart);
      cart = await this.cartRepository.findByUserIdWithItems(userId);
    }
    if (!cart) {
      throw new NotFoundException('Unable to load cart');
    }
    return cart;
  }

  async addToCart(userId: number, dto: AddToCartDto): Promise<Cart> {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    let cart = await this.cartRepository.findByUserIdWithItems(userId);
    if (!cart) {
      cart = this.cartRepository.create({
        user: { id: userId } as Cart['user'],
        items: [],
      });
      await this.cartRepository.save(cart);
      cart = await this.cartRepository.findByUserIdWithItems(userId);
    }
    if (!cart) {
      throw new NotFoundException('Unable to load cart');
    }

    const existing = cart.items?.find((i) => i.product.id === dto.productId);
    if (existing) {
      existing.quantity += dto.quantity;
      await this.cartItemRepo.save(existing);
    } else {
      const line = this.cartItemRepo.create({
        cart,
        product,
        quantity: dto.quantity,
      });
      await this.cartItemRepo.save(line);
    }

    const refreshed = await this.cartRepository.findByUserIdWithItems(userId);
    if (!refreshed) {
      throw new NotFoundException('Unable to load cart');
    }
    return refreshed;
  }

  async clearCart(userId: number): Promise<Cart> {
    const cart = await this.getUserCart(userId);
    if (cart.items?.length) {
      await this.cartItemRepo.delete({ cart: { id: cart.id } });
    }
    return this.getUserCart(userId);
  }
}
