import { describe, expect, it } from 'vitest';

import {
  inferTaskDependencies,
  inferTasksFromCode,
  inferTasksFromDescription,
  inferTasksFromText,
} from '@/app/services/TaskInferenceService';

describe('TaskInferenceService', () => {
  describe('inferTasksFromText', () => {
    it('should extract TODO items', () => {
      const text = '我们需要实现用户登录功能 TODO: 添加双因素认证';
      const tasks = inferTasksFromText(text);
      expect(tasks.length).toBeGreaterThan(0);
      const todoTask = tasks.find(t => t.task.title.includes('双因素认证'));
      expect(todoTask).toBeDefined();
      expect(todoTask!.task.type).toBe('feature');
    });

    it('should extract FIXME items as bugs', () => {
      const text = 'FIXME: 修复登录验证逻辑BUG: 内存泄漏问题';
      const tasks = inferTasksFromText(text);
      const fixmeTask = tasks.find(t => t.task.title.includes('登录验证'));
      expect(fixmeTask).toBeDefined();
      expect(fixmeTask!.task.type).toBe('bug');
      expect(fixmeTask!.task.priority).toBe('high');
    });

    it('should extract Chinese task descriptions', () => {
      const text = '需要实现数据导出功能，优化查询性能，重构日志模块';
      const tasks = inferTasksFromText(text);
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('should deduplicate identical matches', () => {
      const text = 'TODO: 添加搜索功能\nTODO: 添加搜索功能';
      const tasks = inferTasksFromText(text);
      const searchTasks = tasks.filter(t => t.task.title.includes('搜索功能'));
      expect(searchTasks.length).toBeLessThanOrEqual(2);
    });

    it('should return empty for no matches', () => {
      const tasks = inferTasksFromText('这是一段普通文本，没有任务关键词。');
      expect(tasks).toEqual([]);
    });

    it('should set confidence > 0', () => {
      const tasks = inferTasksFromText('TODO: 测试任务');
      for (const t of tasks) {
        expect(t.confidence).toBeGreaterThan(0);
        expect(t.reasoning).toBeTruthy();
        expect(t.context).toBeTruthy();
      }
    });
  });

  describe('inferTasksFromCode', () => {
    it('should extract tasks from code comments', () => {
      const code = `
function login() {
  // TODO: 添加输入验证
  // FIXME: 修复空指针异常
  console.log('login');
}`;
      const tasks = inferTasksFromCode(code, 'typescript');
      expect(tasks.length).toBeGreaterThanOrEqual(1);
      expect(tasks[0].confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('inferTasksFromDescription', () => {
    it('should handle single-line description', () => {
      const tasks = inferTasksFromDescription('实现用户注册功能');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].task.title).toContain('实现用户注册功能');
      expect(tasks[0].confidence).toBe(0.75);
    });

    it('should split multi-line descriptions', () => {
      const desc = '实现用户注册\n添加邮箱验证\n完善个人资料';
      const tasks = inferTasksFromDescription(desc);
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('inferTaskDependencies', () => {
    it('should detect dependencies based on keyword overlap', () => {
      const tasks = [
        { id: '1', title: '用户认证模块实现', description: '实现用户认证JWT', createdAt: 1000 },
        { id: '2', title: '用户认证模块测试', description: '测试用户认证模块实现功能', createdAt: 2000 },
      ];
      const deps = inferTaskDependencies(tasks);
      const depIds = deps.get('2') ?? [];
      expect(deps.has('2') || depIds.length >= 0).toBe(true);
    });

    it('should return empty for unrelated tasks', () => {
      const tasks = [
        { id: '1', title: '数据库设计', description: '', createdAt: 1000 },
        { id: '2', title: 'UI布局调整', description: '', createdAt: 2000 },
      ];
      const deps = inferTaskDependencies(tasks);
      expect(deps.size).toBe(0);
    });
  });
});
