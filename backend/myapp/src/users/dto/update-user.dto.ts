import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { MembershipStatus, UserStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

/** Email is immutable — it is the identity key across organizations. */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email'] as const),
) {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: MembershipStatus })
  @IsOptional()
  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;

  @ApiPropertyOptional({
    description: 'Reason recorded on the audit entry for this change',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
