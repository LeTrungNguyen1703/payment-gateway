import {Controller, Inject, Post, Req, UseGuards} from '@nestjs/common';
import * as Ably from 'ably';
import {TokenParams} from 'ably';
import {ABLY_CLIENT} from "./constant.ably";
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@Controller('ably')
export class AblyController {
    constructor(
        @Inject(ABLY_CLIENT) private readonly ablyClient: Ably.Realtime,
    ) {
    }

    /**
     * Token endpoint cho clients
     * Frontend sẽ gọi endpoint này để lấy token
     */
    @Post('auth')
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Create Ably token request for authenticated user' })
    async createToken(@Req() req: any) {
        const userId = req.user.userId; // From JWT payload

        // Create token với capability (permissions)
        const tokenParams: TokenParams = {
            clientId: `user-${userId}`,

            // Capability: Quyền của user
            capability: {
                // User chỉ subscribe được, không publish
                'expenses': ['subscribe', 'presence'],
                'notifications': ['subscribe'],

                // User có thể publish/subscribe channel riêng của mình
                [`user:${userId}`]: ['subscribe', 'publish', 'presence'],
            },

            // Token expiry
            ttl: 3600000, // 1 hour in milliseconds
        };

        try {
            // Request token từ Ably
            return await this.ablyClient.auth.createTokenRequest(tokenParams);
        } catch (error) {
            throw new Error(`Failed to create Ably token: ${error.message}`);
        }
    }
}