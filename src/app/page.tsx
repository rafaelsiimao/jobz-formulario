'use client';

import React from 'react';
import ChatWindow, { formatMessageHtml } from '../components/ChatWindow';
import { escapeHtml } from '../hooks/useChatState';

export { escapeHtml, formatMessageHtml };

export default function ChatPage() {
  return <ChatWindow />;
}
