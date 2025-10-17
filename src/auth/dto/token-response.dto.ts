import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TokenResponseDto {


  @ApiProperty({
    description: 'Access token for authentication',
  })
  @Expose()
  access_token: string;

  @ApiProperty({
    description: 'Refresh token for getting new access token',
  })
  @Expose()

  refresh_token: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
  })
  @Expose()
  expires_in: number;

  @ApiProperty({
    description: 'Refresh token expiration time in seconds',
  })
  @Expose()
  refresh_expires_in: number;

  @ApiProperty({
    description: 'Token type (Bearer)',
  })
  @Expose()
  token_type: string;
}

