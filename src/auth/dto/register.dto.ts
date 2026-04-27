import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Builder Group LLC' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'dev@builder.uz' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  @MinLength(8)
  password: string;
}
