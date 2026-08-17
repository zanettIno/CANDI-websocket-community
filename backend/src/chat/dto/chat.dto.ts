export class SendMessageDto {
  messageContent!: string;
}

export class StartConversationDto {
  otherUserEmail!: string;
}

export class CreateGroupDto {
  groupName!: string;
  memberIds!: string[];
}
