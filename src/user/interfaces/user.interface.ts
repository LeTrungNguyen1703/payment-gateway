import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export interface User {
  id: string;
  keycloak_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: string | null;
  kyc_verified: boolean | null;
  kyc_level: number | null;
  metadata: any | null;
  created_at: Date | null;
  updated_at: Date | null;
  last_login_at: Date | null;
}

export class UserResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  //Do not expose keycloak_id in response
  keycloak_id: string;

  @ApiProperty({ example: 'user@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ nullable: true, example: 'Nguyen Van A' })
  @Expose()
  full_name: string | null;

  @ApiProperty({ nullable: true, example: '+84123456789' })
  @Expose()
  phone: string | null;

  @ApiProperty({ nullable: true, example: 'active' })
  @Expose()
  status: string | null;

  @ApiProperty({ nullable: true, example: false })
  @Expose()
  kyc_verified: boolean | null;

  @ApiProperty({ nullable: true, example: 0 })
  @Expose()
  kyc_level: number | null;

  @ApiProperty({ nullable: true, example: { signup_source: 'web' } })
  @Expose()
  metadata: any | null;

  @ApiProperty({ nullable: true })
  @Expose()
  created_at: Date | null;

  @ApiProperty({ nullable: true })
  @Expose()
  updated_at: Date | null;

  @ApiProperty({ nullable: true })
  @Expose()
  last_login_at: Date | null;
}
