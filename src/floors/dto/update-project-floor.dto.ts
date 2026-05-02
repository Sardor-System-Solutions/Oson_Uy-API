import { PartialType } from '@nestjs/swagger';
import { CreateProjectFloorDto } from './create-project-floor.dto';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProjectFloorDto extends PartialType(CreateProjectFloorDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  override floor?: number;
}
