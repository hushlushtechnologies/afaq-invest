import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangeStaffEmailDto {
  @ApiProperty({ example: 'new.address@afaq.ae' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email!: string;
}

export class TransferRolesDto {
  @ApiProperty({ description: 'Who receives the roles' })
  @IsUUID()
  toStaffUserId!: string;

  @ApiPropertyOptional({
    description: 'Also remove them from the original person',
    default: false,
  })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  removeFromSource?: boolean;
}
