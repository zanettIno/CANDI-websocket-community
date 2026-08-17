import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AuthDto } from './auth.dto';

export interface DemoUser {
  profile_id: string;
  profile_name: string;
  profile_nickname: string;
  profile_email: string;
  profile_password?: string;
  profile_status: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly tableName = process.env.DYNAMO_TABLE_PROFILE || 'CANDIProfile';

  constructor(
    private readonly jwtService: JwtService,
    @Inject('DYNAMO_CLIENT') private readonly db: DynamoDBDocumentClient,
  ) {}

  async register(data: any) {
    const email = String(data.email || '').trim().toLowerCase();
    if (!email || !data.password || !data.name) {
      throw new BadRequestException('name, email e password são obrigatórios');
    }

    const existing = await this.findByEmail(email);
    if (existing) throw new BadRequestException('E-mail já cadastrado');

    const user: DemoUser = {
      profile_id: randomUUID(),
      profile_name: data.name,
      profile_nickname: data.nickname || data.name,
      profile_email: email,
      profile_password: await bcrypt.hash(data.password, 10),
      profile_status: 'active',
      role: 'patient',
    };

    await this.db.send(new PutCommand({ TableName: this.tableName, Item: user }));
    const { profile_password, ...safe } = user;
    return { message: 'Usuário registrado com sucesso', user: safe };
  }

  async login(data: AuthDto) {
    const email = String(data.email || '').trim().toLowerCase();
    const user = await this.findByEmail(email);
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const ok = await bcrypt.compare(data.password, user.profile_password || '');
    if (!ok) throw new UnauthorizedException('Senha incorreta');

    const payload = { id: user.profile_id, email: user.profile_email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.ACCESS_TOKEN_SECRET || 'demo_access_secret_change_me',
      expiresIn: '12h',
    });

    return { message: 'Login bem-sucedido!', accessToken };
  }


  async demoResetPassword(data: any) {
    const email = String(data.email || '').trim().toLowerCase();
    const password = String(data.password || '');
    if (!email || !password) throw new BadRequestException('email e password são obrigatórios');

    const user = await this.findByEmail(email);
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const updated: DemoUser = {
      ...user,
      profile_password: await bcrypt.hash(password, 10),
    };

    await this.db.send(new PutCommand({ TableName: this.tableName, Item: updated }));
    return { message: 'Senha de demonstração redefinida com sucesso', email };
  }

  async getProfile(userId: string) {
    const result = await this.db.send(new GetCommand({
      TableName: this.tableName,
      Key: { profile_id: userId },
    }));
    if (!result.Item) throw new UnauthorizedException('Usuário não encontrado');
    const { profile_password, ...safe } = result.Item as DemoUser;
    return safe;
  }


  async updateProfile(userId: string, data: any) {
    // IMPORTANT: getProfile() intentionally removes profile_password from its
    // response. For a write/update operation we must fetch the raw item so a
    // profile rename does not accidentally erase the password.
    const raw = await this.db.send(new GetCommand({
      TableName: this.tableName,
      Key: { profile_id: userId },
    }));
    const current = raw.Item as DemoUser | undefined;
    if (!current) throw new UnauthorizedException('Usuário não encontrado');

    const email = String(data.email || current.profile_email).trim().toLowerCase();
    const name = String(data.name || current.profile_name).trim();
    const nickname = String(data.nickname || name).trim();

    if (!name || !email) throw new BadRequestException('name e email são obrigatórios');
    if (email !== current.profile_email) {
      const existing = await this.findByEmail(email);
      if (existing && existing.profile_id !== userId) {
        throw new BadRequestException('E-mail já cadastrado');
      }
    }

    const updated: DemoUser = {
      ...current,
      profile_email: email,
      profile_name: name,
      profile_nickname: nickname,
    };

    await this.db.send(new PutCommand({ TableName: this.tableName, Item: updated }));
    const { profile_password, ...safe } = updated;
    return safe;
  }

  private async findByEmail(email: string): Promise<DemoUser | null> {
    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'profile_email = :email',
      ExpressionAttributeValues: { ':email': email },
    }));
    return (result.Items?.[0] as DemoUser) || null;
  }
}
