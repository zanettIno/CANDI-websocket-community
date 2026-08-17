import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { CreateGroupDto, SendMessageDto, StartConversationDto } from './dto/chat.dto';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('users')
  users(@Req() req: any) {
    return this.chatService.getUsers(req.user.profile_id);
  }

  @Post('sync-profile-name')
  syncProfileName(@Req() req: any, @Body() body: { displayName: string }) {
    return this.chatService.syncConversationDisplayName(req.user.profile_id, body.displayName || req.user.profile_nickname || req.user.profile_name);
  }

  @Get('inbox')
  getInbox(@Req() req: any) {
    return this.chatService.getInbox(req.user.profile_id);
  }

  @Get('groups')
  groups(@Req() req: any) {
    return this.chatService.getGroups(req.user.profile_id);
  }

  @Post('groups')
  async createGroup(@Req() req: any, @Body() body: CreateGroupDto) {
    const group = await this.chatService.createGroup(req.user, body.groupName, body.memberIds || []);
    this.chatGateway.broadcastGroupCreated(group);
    return group;
  }

  @Get('groups/:groupId')
  group(@Req() req: any, @Param('groupId') groupId: string) {
    return this.chatService.getGroup(req.user.profile_id, decodeURIComponent(groupId));
  }

  @Post('start')
  start(@Req() req: any, @Body() body: StartConversationDto) {
    if (req.user.profile_email === body.otherUserEmail) {
      throw new BadRequestException('Você não pode conversar consigo mesmo.');
    }
    return this.chatService.findOrCreateConversationByEmail(req.user, body.otherUserEmail);
  }

  @Get('read-status/:conversationId')
  readStatus(@Req() req: any, @Param('conversationId') conversationId: string) {
    return this.chatService.getReadStatus(req.user.profile_id, decodeURIComponent(conversationId));
  }

  @Get('messages/:conversationId')
  async messages(@Req() req: any, @Param('conversationId') conversationId: string) {
    const id = decodeURIComponent(conversationId);
    const messages = await this.chatService.getMessages(req.user.profile_id, id);
    this.chatGateway.notifyMessagesRead(id, req.user.profile_id);
    return messages;
  }

  @Post('messages/:conversationId')
  send(@Req() req: any, @Param('conversationId') conversationId: string, @Body() body: SendMessageDto) {
    return this.chatService.sendMessage(req.user, decodeURIComponent(conversationId), body.messageContent);
  }
}
