import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '@prisma/client';
import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { CreateOrganizationDto } from './create-organization.dto';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @ApiPropertyOptional({
    description:
      'Setup-wizard progress. Each of the seven steps is persisted independently so the wizard is resumable.',
    example: { currentStep: 3, completedSteps: [1, 2], skipped: false },
  })
  @IsOptional()
  @IsObject()
  onboardingState?: Record<string, unknown>;
}
