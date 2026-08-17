import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DynamoBootstrapService } from './dynamodb/dynamo-bootstrap.service';

@Controller()
export class HealthController {
  constructor(private readonly dynamo: DynamoBootstrapService) {}

  @Get('health')
  health() {
    if (!this.dynamo.isReady()) {
      throw new ServiceUnavailableException({
        status: 'starting',
        dynamodb: 'not-ready',
      });
    }

    return {
      status: 'ok',
      websocket: '/chat',
      dynamodb: 'ready',
    };
  }
}
