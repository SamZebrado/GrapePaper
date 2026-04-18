import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatPanel from './ChatPanel';
import type { ChatThread } from '../../types';

describe('ChatPanel', () => {
  let mockThread: ChatThread;
  let mockOnClose: Mock;
  let mockOnSendMessage: Mock;

  beforeEach(() => {
    mockThread = {
      id: 'thread-1',
      messages: [
        {
          id: 'msg-1',
          content: 'Hello',
          role: 'user',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          content: 'Hi there!',
          role: 'assistant',
          createdAt: Date.now()
        }
      ]
    };

    mockOnClose = vi.fn();
    mockOnSendMessage = vi.fn();
  });

  it('当 thread 为 null 时不渲染', () => {
    const { container } = render(
      <ChatPanel thread={null} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('应该渲染 ChatPanel 组件', () => {
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    expect(screen.getByText('AI Chat')).toBeInTheDocument();
    expect(screen.getByText('Discussion Thread')).toBeInTheDocument();
    expect(screen.getByText('mock')).toBeInTheDocument();
  });

  it('应该显示现有消息', () => {
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('当没有消息时应该显示空状态', () => {
    const emptyThread: ChatThread = {
      ...mockThread,
      messages: []
    };

    render(
      <ChatPanel thread={emptyThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    expect(screen.getByText('Ask a question about this annotation')).toBeInTheDocument();
  });

  it('点击关闭按钮应该调用 onClose', () => {
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    const closeButton = screen.getByText('x');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('点击遮罩层应该调用 onClose', async () => {
    const { container } = render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    // 等待遮罩层出现
    await waitFor(() => {
      const overlay = container.querySelector('[class*="overlay"]');
      expect(overlay).toBeInTheDocument();
    });
    
    const overlay = container.querySelector('[class*="overlay"]') as HTMLElement;
    fireEvent.click(overlay!);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('输入消息并点击发送按钮应该调用 onSendMessage', () => {
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    const input = screen.getByPlaceholderText('Ask about this annotation...') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByTitle('Send message');
    fireEvent.click(sendButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('按 Enter 键应该发送消息', () => {
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    const input = screen.getByPlaceholderText('Ask about this annotation...') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('按 Shift+Enter 键不应该发送消息', () => {
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    const input = screen.getByPlaceholderText('Ask about this annotation...') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('空消息不应该触发发送', () => {
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    const sendButton = screen.getByTitle('Send message');
    fireEvent.click(sendButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('发送消息后输入框应该清空', async () => {
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    const input = screen.getByPlaceholderText('Ask about this annotation...') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByTitle('Send message');
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });
});