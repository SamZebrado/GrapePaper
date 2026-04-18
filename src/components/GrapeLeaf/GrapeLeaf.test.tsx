import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GrapeLeaf from './GrapeLeaf';
import { useDocumentStore } from '../../stores/documentStore';
import { UIProvider } from '../../contexts/UIContext';
import type { Annotation } from '../../types';

vi.mock('../../stores/documentStore');

const mockUseDocumentStore = useDocumentStore as any;

describe('GrapeLeaf', () => {
  let mockAnnotation: Annotation;
  let mockOnOpenChat: Mock;
  let mockEditAnnotation: Mock;
  let mockDeleteAnnotation: Mock;

  beforeEach(() => {
    mockAnnotation = {
      id: 'annot-1',
      paragraphId: 'para-1',
      content: 'Test annotation content',
      createdAt: Date.now(),
      chatThreads: [],
    };

    mockOnOpenChat = vi.fn();
    mockEditAnnotation = vi.fn();
    mockDeleteAnnotation = vi.fn();

    mockUseDocumentStore.mockReturnValue({
      editAnnotation: mockEditAnnotation,
      deleteAnnotation: mockDeleteAnnotation,
    } as any);
  });

  it('应该渲染折叠状态的 leaf', () => {
    render(
      <UIProvider>
        <GrapeLeaf annotation={mockAnnotation} onOpenChat={mockOnOpenChat} />
      </UIProvider>
    );
    
    expect(screen.getByText('Test annotation content')).toBeInTheDocument();
  });

  it('点击折叠状态的 leaf 应该展开', async () => {
    render(
      <UIProvider>
        <GrapeLeaf annotation={mockAnnotation} onOpenChat={mockOnOpenChat} />
      </UIProvider>
    );
    
    // 点击内容区域来展开
    const content = screen.getByText('Test annotation content');
    fireEvent.click(content);
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('展开状态下点击内容应该调用 onOpenChat', async () => {
    render(
      <UIProvider>
        <GrapeLeaf annotation={mockAnnotation} onOpenChat={mockOnOpenChat} />
      </UIProvider>
    );
    
    // 先展开 leaf
    const content = screen.getByText('Test annotation content');
    fireEvent.click(content);
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    
    // 再次点击内容区域
    const expandedContent = screen.getByText('Test annotation content');
    fireEvent.click(expandedContent);
    
    expect(mockOnOpenChat).toHaveBeenCalled();
  });

  it('点击 Edit 按钮应该进入编辑状态', async () => {
    render(
      <UIProvider>
        <GrapeLeaf annotation={mockAnnotation} onOpenChat={mockOnOpenChat} />
      </UIProvider>
    );
    
    // 先展开 leaf
    const content = screen.getByText('Test annotation content');
    fireEvent.click(content);
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    
    // 点击 Edit 按钮
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('编辑状态下点击 Save 应该更新内容', async () => {
    render(
      <UIProvider>
        <GrapeLeaf annotation={mockAnnotation} onOpenChat={mockOnOpenChat} />
      </UIProvider>
    );
    
    // 进入编辑状态
    const content = screen.getByText('Test annotation content');
    fireEvent.click(content);
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
    
    // 修改内容并保存
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Updated annotation content' } });
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockEditAnnotation).toHaveBeenCalledWith('annot-1', 'Updated annotation content');
    });
  });

  it('编辑状态下点击 Cancel 应该取消编辑', async () => {
    render(
      <UIProvider>
        <GrapeLeaf annotation={mockAnnotation} onOpenChat={mockOnOpenChat} />
      </UIProvider>
    );
    
    // 进入编辑状态
    const content = screen.getByText('Test annotation content');
    fireEvent.click(content);
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
    
    // 点击 Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test annotation content')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('点击 Delete 按钮应该删除 annotation', async () => {
    render(
      <UIProvider>
        <GrapeLeaf annotation={mockAnnotation} onOpenChat={mockOnOpenChat} />
      </UIProvider>
    );
    
    // 展开 leaf
    const content = screen.getByText('Test annotation content');
    fireEvent.click(content);
    
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
    
    // 点击 Delete 按钮
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    expect(mockDeleteAnnotation).toHaveBeenCalledWith('annot-1');
  });

  it('编辑/删除按钮不应该触发 onOpenChat', async () => {
    render(
      <UIProvider>
        <GrapeLeaf annotation={mockAnnotation} onOpenChat={mockOnOpenChat} />
      </UIProvider>
    );
    
    // 展开 leaf
    const content = screen.getByText('Test annotation content');
    fireEvent.click(content);
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
    
    // 点击 Edit 按钮
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    expect(mockOnOpenChat).not.toHaveBeenCalled();
    
    // 重新展开 leaf 以测试 Delete 按钮
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
    
    // 点击 Delete 按钮
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    expect(mockOnOpenChat).not.toHaveBeenCalled();
  });
});
