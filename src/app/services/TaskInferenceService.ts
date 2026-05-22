/**
 * @file src/app/services/TaskInferenceService.ts
 * @description AI 任务推理引擎 — 从对话/代码/描述中智能提取任务、推理依赖关系、优先级评估
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-05-22
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags service, ai, task-inference, nlp, extraction
 */

export type TaskType = 'feature' | 'bug' | 'refactor' | 'test' | 'documentation' | 'other';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface InferredTask {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  relatedFiles?: string[];
}

export interface TaskInference {
  task: InferredTask;
  confidence: number;
  reasoning: string;
  context: string;
}

const KEYWORD_PATTERNS: { pattern: RegExp; type: TaskType; priority: TaskPriority }[] = [
  { pattern: /TODO:?\s*(.+)/gi, type: 'feature', priority: 'medium' },
  { pattern: /FIXME:?\s*(.+)/gi, type: 'bug', priority: 'high' },
  { pattern: /BUG:?\s*(.+)/gi, type: 'bug', priority: 'high' },
  { pattern: /HACK:?\s*(.+)/gi, type: 'refactor', priority: 'medium' },
  { pattern: /OPTIMIZE:?\s*(.+)/gi, type: 'refactor', priority: 'low' },
  { pattern: /NOTE:?\s*(.+)/gi, type: 'documentation', priority: 'low' },
  { pattern: /需要实现(.+)/g, type: 'feature', priority: 'medium' },
  { pattern: /修复(.+)问题/g, type: 'bug', priority: 'high' },
  { pattern: /重构(.+)/g, type: 'refactor', priority: 'medium' },
  { pattern: /添加(.+)功能/g, type: 'feature', priority: 'medium' },
  { pattern: /完善(.+)/g, type: 'feature', priority: 'low' },
  { pattern: /优化(.+)/g, type: 'refactor', priority: 'low' },
  { pattern: /测试(.+)/g, type: 'test', priority: 'medium' },
  { pattern: /编写(.+)文档/g, type: 'documentation', priority: 'low' },
];

export function inferTasksFromText(text: string): TaskInference[] {
  const results: TaskInference[] = [];
  const seen = new Set<string>();

  for (const { pattern, type, priority } of KEYWORD_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const title = match[1]?.trim();
      if (!title || title.length < 3 || seen.has(title.toLowerCase())) continue;
      seen.add(title.toLowerCase());

      results.push({
        task: {
          title,
          description: `从文本中自动提取: "${match[0].trim()}"`,
          status: 'todo',
          priority,
          type,
        },
        confidence: 0.7,
        reasoning: `匹配关键词模式: ${pattern.source}`,
        context: text.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50),
      });
    }
  }

  return results;
}

export function inferTasksFromCode(code: string, language: string): TaskInference[] {
  return inferTasksFromText(code).map((inf) => ({
    ...inf,
    task: {
      ...inf.task,
      relatedFiles: [language],
      description: `从 ${language} 代码注释中提取: ${inf.task.description}`,
    },
    confidence: 0.85,
  }));
}

export function inferTasksFromConversation(
  messages: Array<{ role: string; content: string }>,
): TaskInference[] {
  const fullText = messages.map((m) => m.content).join('\n\n');
  return inferTasksFromText(fullText).map((inf) => ({
    ...inf,
    task: {
      ...inf.task,
      description: `从 AI 对话中提取: ${inf.task.description}`,
    },
  }));
}

export function inferTasksFromDescription(description: string): TaskInference[] {
  const lines = description
    .split(/[\n;；。]/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3);

  if (lines.length <= 1) {
    return [{
      task: {
        title: description.slice(0, 80),
        description,
        status: 'todo',
        priority: 'medium',
        type: 'feature',
      },
      confidence: 0.75,
      reasoning: '用户直接描述',
      context: description,
    }];
  }

  return lines.map((line, i) => ({
    task: {
      title: line.slice(0, 80),
      description: line,
      status: 'todo' as const,
      priority: 'medium' as TaskPriority,
      type: 'feature' as TaskType,
    },
    confidence: 0.65,
    reasoning: `用户描述第 ${i + 1} 项`,
    context: line,
  }));
}

export function inferTaskDependencies(
  tasks: Array<{ id: string; title: string; description?: string; createdAt: number }>,
): Map<string, string[]> {
  const deps = new Map<string, string[]>();

  for (const task of tasks) {
    const taskDeps: string[] = [];
    const titleLower = (task.title + ' ' + (task.description || '')).toLowerCase();

    for (const other of tasks) {
      if (other.id === task.id) continue;
      const otherWords = other.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const matchCount = otherWords.filter((w) => titleLower.includes(w)).length;
      if (matchCount >= 2 && other.createdAt < task.createdAt) {
        taskDeps.push(other.id);
      }
    }

    if (taskDeps.length > 0) deps.set(task.id, taskDeps);
  }

  return deps;
}
