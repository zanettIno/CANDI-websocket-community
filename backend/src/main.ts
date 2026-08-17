import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DynamoBootstrapService } from './dynamodb/dynamo-bootstrap.service';

async function bootstrap() {
  const port = Number(process.env.PORT || 3000);

  try {
    const app = await NestFactory.create(AppModule);
    app.enableCors({ origin: true, credentials: true });

    // O HTTP abre antes da preparação do DynamoDB.
    // O /health informa 503 durante a inicialização e 200 quando estiver pronto.
    await app.listen(port, '0.0.0.0');

    console.log('');
    console.log(`🚀 CANDI MVP API: http://0.0.0.0:${port}`);
    console.log(`⚡ Socket.IO: ws://0.0.0.0:${port}/chat`);
    console.log(`🩺 Health: http://0.0.0.0:${port}/health`);
    console.log('');

    const dynamo = app.get(DynamoBootstrapService);

    console.log('🔧 Preparando DynamoDB Local...');
    await dynamo.initialize();

    console.log('✅ CANDI MVP pronto para apresentação.');
  } catch (err: any) {
    console.error('');
    console.error('❌ CANDI MVP não conseguiu iniciar.');
    console.error(`   Motivo: ${err?.message || err}`);
    console.error('   Verifique: docker compose up -d');
    console.error('');

    // Se o Nest já tiver aberto a porta, encerra explicitamente para não
    // deixar um processo parcialmente funcional.
    process.exit(1);
  }
}

bootstrap();
