export type MessageSender = 'bot' | 'user';

export interface ChatOption {
  label: string;
  value: string;
}

export interface ChatAttachment {
  name: string;
  url?: string;
  size?: number;
  type?: string;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
  options?: ChatOption[];
  isTyping?: boolean;
  attachments?: ChatAttachment[];
}

export type IntakeStep = 
  | 'IDENTIFY_CLIENT' 
  | 'NEW_CLIENT_REGISTER' 
  | 'SELECT_VACANCY_TYPE' 
  | 'VACANCY_METHOD' 
  | 'JOB_PROFILE_INPUT' 
  | 'CONFIRMATION';

export interface ClientData {
  cnpj?: string;
  email?: string;
  name?: string;
  agendorId?: string;
  [key: string]: any;
}
