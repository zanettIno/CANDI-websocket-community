import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';

@Injectable()
export class DynamoBootstrapService {
  private readonly logger = new Logger(DynamoBootstrapService.name);
  private ready = false;
  private initializing: Promise<void> | null = null;

  constructor(@Inject('DYNAMO_RAW_CLIENT') private readonly client: DynamoDBClient) {}

  isReady() {
    return this.ready;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;
    if (this.initializing) return this.initializing;

    this.initializing = this.initializeInternal()
      .then(() => {
        this.ready = true;
        this.logger.log('DynamoDB Local pronto para o MVP WebSocket.');
      })
      .catch((err) => {
        this.ready = false;
        this.logger.error(`Falha ao preparar DynamoDB: ${err?.message || err}`);
        throw err;
      })
      .finally(() => {
        this.initializing = null;
      });

    return this.initializing;
  }

  private async initializeInternal() {
    const tables: any[] = [
      {
        TableName: 'CANDIProfile',
        KeySchema: [{ AttributeName: 'profile_id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'profile_id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
      },
      {
        TableName: 'CANDIMessages',
        KeySchema: [
          { AttributeName: 'conversation_id', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'conversation_id', AttributeType: 'S' },
          { AttributeName: 'timestamp', AttributeType: 'S' },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      },
      {
        TableName: 'CANDIUserConversations',
        KeySchema: [
          { AttributeName: 'profile_id', KeyType: 'HASH' },
          { AttributeName: 'conversation_id', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'profile_id', AttributeType: 'S' },
          { AttributeName: 'conversation_id', AttributeType: 'S' },
          { AttributeName: 'last_message_timestamp', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'InboxSortGSI',
            KeySchema: [
              { AttributeName: 'profile_id', KeyType: 'HASH' },
              { AttributeName: 'last_message_timestamp', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      },
      {
        TableName: 'CANDIGroups',
        KeySchema: [{ AttributeName: 'group_id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'group_id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
      },
    ];

    for (const table of tables) await this.ensureTable(table);
  }

  private async ensureTable(table: any) {
    const name = table.TableName;
    try {
      await this.client.send(new CreateTableCommand(table));
      this.logger.log(`Tabela criada: ${name}`);
    } catch (err: any) {
      if (err instanceof ResourceInUseException || err?.name === 'ResourceInUseException') {
        this.logger.log(`Tabela já existe: ${name}`);
      } else {
        throw new Error(`Não foi possível criar ${name}: ${err?.message || err}`);
      }
    }

    await this.waitForActive(name);
    this.logger.log(`✓ ${name} ACTIVE`);
  }

  private async waitForActive(tableName: string) {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      try {
        const result = await this.client.send(new DescribeTableCommand({ TableName: tableName }));
        const status = result.Table?.TableStatus;
        if (status === 'ACTIVE') return;
        if (status) this.logger.log(`  ${tableName}: ${status}...`);
      } catch (err: any) {
        if (err?.name !== 'ResourceNotFoundException') throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Timeout aguardando ${tableName} ficar ACTIVE.`);
  }
}
