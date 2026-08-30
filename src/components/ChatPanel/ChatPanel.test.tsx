import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatPanel from './ChatPanel';
import type { ChatThread } from '../../types';
import i18n from '../../i18n';

describe('ChatPanel', () => {
  let mockThread: ChatThread;
  let mockOnClose: Mock;
  let mockOnSendMessage: Mock;

  beforeEach(async () => {
    await i18n.changeLanguage('en');
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
    
    expect(screen.getByText('AI chat')).toBeInTheDocument();
    expect(screen.getByText('Discussion Thread')).toBeInTheDocument();
    expect(screen.getByText('mock')).toBeInTheDocument();
    expect(screen.getByText('MOCK · Simulated responses only')).toBeInTheDocument();
  });

  it('localizes the chat header and persistent mock boundary in zh-CN', async () => {
    await i18n.changeLanguage('zh-CN');
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );

    expect(screen.getByText('AI 对话')).toBeInTheDocument();
    expect(screen.getByText('讨论线程')).toBeInTheDocument();
    expect(screen.getByText('模拟 · 仅提供占位回复')).toBeInTheDocument();
    expect(screen.queryByText('AI chat')).not.toBeInTheDocument();
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
    
    const closeButton = screen.getByTestId('chat-close-btn');
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
    
    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByTitle('Send message');
    fireEvent.click(sendButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('按 Enter 键应该发送消息', () => {
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('按 Shift+Enter 键不应该发送消息', () => {
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    
    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
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
    
    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByTitle('Send message');
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('closes with Escape', () => {
    render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    fireEvent.keyDown(screen.getByTestId('chat-panel'), { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('uses a labelled modal, traps focus, and inerts the workspace at 900px', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const workspace = document.createElement('div');
    workspace.id = 'gp-workspace';
    document.body.appendChild(workspace);

    const { unmount } = render(
      <ChatPanel thread={mockThread} onClose={mockOnClose} onSendMessage={mockOnSendMessage} />
    );
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveAttribute('aria-modal', 'true');
    expect(workspace).toHaveAttribute('inert');
    const input = screen.getByTestId('chat-input');
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.getByTestId('chat-close-btn')).toHaveFocus();

    unmount();
    expect(workspace).not.toHaveAttribute('inert');
    workspace.remove();
    window.matchMedia = originalMatchMedia;
  });
});
