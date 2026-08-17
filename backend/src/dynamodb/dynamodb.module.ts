import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoBootstrapService } from './dynamo-bootstrap.service';

@Module({
  providers: [
    {
      provide: 'DYNAMO_RAW_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const endpoint =
          config.get<string>('AWS_ENDPOINT_URL_DYNAMODB') ||
          'http://127.0.0.1:8000';

        console.log(`🔌 DynamoDB endpoint: ${endpoint}`);

        return new DynamoDBClient({
          region: config.get<string>('AWS_REGION') || 'us-east-1',
          credentials: {
            accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID') || 'local',
            secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY') || 'local',
          },
          endpoint,
        });
      },
    },
    {
      provide: 'DYNAMO_CLIENT',
      inject: ['DYNAMO_RAW_CLIENT'],
      useFactory: (raw: DynamoDBClient) => DynamoDBDocumentClient.from(raw),
    },
    DynamoBootstrapService,
  ],
  exports: ['DYNAMO_CLIENT', 'DYNAMO_RAW_CLIENT', DynamoBootstrapService],
})
export class DynamoDBModule {}
