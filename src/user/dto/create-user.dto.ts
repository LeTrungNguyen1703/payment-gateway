import { IsEmail, IsOptional, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  keycloak_id?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  metadata?: any;
}
