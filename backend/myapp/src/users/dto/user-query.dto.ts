import { ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipStatus, RoleKey } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MembershipStatus })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @ApiPropertyOptional({ enum: RoleKey })
  @IsOptional()
  @IsEnum(RoleKey)
  roleKey?: RoleKey;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  teamId?: string;
}
