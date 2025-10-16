import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { CacheableMemory, Keyv } from 'cacheable';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        // Railway provides REDIS_PRIVATE_URL for internal connections
        // Fallback to REDIS_URL for local/public connections
        const redisUrl =
          config.get<string | undefined>('REDIS_PRIVATE_URL') ||
          config.get<string | undefined>('REDIS_URL');

        // Fallback to memory-only cache if Redis is not available
        if (!redisUrl) {
          console.warn(
            '[Cache] No Redis URL configured. Using memory-only cache.',
          );
          return {
            stores: [
              new Keyv({
                store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
              }),
            ],
          };
        }
        try {
          console.log(
            '[Cache] Connecting to Redis:',
            redisUrl.replace(/:[^:@]+@/, ':***@'),
          ); // Hide password in logs

          // Add family=0 for dual stack DNS lookup (fixes Railway redis.railway.internal)
          const redisUrlWithFamily = redisUrl.includes('?')
            ? `${redisUrl}&family=0`
            : `${redisUrl}?family=0`;

          return {
            stores: [
              new Keyv({
                store: new CacheableMemory({ ttl: 6000000, lruSize: 5000 }),
              }),
              new KeyvRedis(redisUrlWithFamily),
            ],
          };
        } catch (error) {
          console.error(
            '[Cache] Failed to connect to Redis, falling back to memory cache:',
            error.message,
          );
          return {
            stores: [
              new Keyv({
                store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
              }),
            ],
          };
        }
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
