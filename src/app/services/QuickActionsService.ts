/**
 * @file src/app/services/QuickActionsService.ts
 * @description 智能一键操作服务 — 代码/文档/文本/AI辅助操作的统一执行引擎
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-05-22
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags service, quick-actions, code, document, text, ai, clipboard
 */

export interface ActionContext {
  text: string;
  language?: string;
  filePath?: string;
}

export type ActionType =
  | 'copy' | 'copy-markdown' | 'copy-html' | 'format'
  | 'refactor' | 'optimize' | 'explain' | 'comment'
  | 'find-issues' | 'test-generate' | 'document-generate'
  | 'translate' | 'rewrite' | 'expand' | 'correct'
  | 'summarize';

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

function escapeHTML(text: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (c) => entities[c]);
}

async function simulateAIResponse(systemPrompt: string, userPrompt: string, delayMs = 600): Promise<string> {
  await new Promise((r) => setTimeout(r, delayMs + Math.random() * 300));
  return `[AI Response]\n\n${userPrompt.slice(0, 80)}...\n\n---\n\n> _模拟响应。接入真实 AI Provider 后将返回实际结果。_\n> System: ${systemPrompt.slice(0, 50)}...`;
}

export async function copyCode(ctx: ActionContext): Promise<void> {
  if (!ctx.text) throw new Error('No code selected');
  await copyToClipboard(ctx.text);
}

export async function copyCodeAsMarkdown(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No code selected');
  const lang = ctx.language || 'text';
  const md = `\`\`\`${lang}\n${ctx.text}\n\`\`\``;
  await copyToClipboard(md);
  return md;
}

export async function copyCodeAsHTML(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No code selected');
  const lang = ctx.language || 'text';
  const html = `<pre><code class="language-${lang}">${escapeHTML(ctx.text)}</code></pre>`;
  await copyToClipboard(html);
  return html;
}

export async function formatCode(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No code selected');
  return ctx.text.split('\n').map((line) => line.trimEnd()).join('\n');
}

export async function refactorCode(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No code selected');
  return simulateAIResponse('Expert code refactoring specialist.', ctx.text);
}

export async function optimizeCode(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No code selected');
  return simulateAIResponse('Expert code optimizer.', ctx.text);
}

export async function explainCode(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No code selected');
  return simulateAIResponse('Expert code educator.', ctx.text);
}

export async function generateComments(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No code selected');
  return simulateAIResponse('Expert code commenter.', ctx.text);
}

export async function findIssues(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No code selected');
  return simulateAIResponse('Expert code reviewer.', ctx.text);
}

export async function generateTests(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No code selected');
  return simulateAIResponse('Expert test engineer. Use Vitest.', ctx.text);
}

export async function generateDocumentation(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No code selected');
  return simulateAIResponse('Expert technical writer.', ctx.text);
}

export async function translateText(ctx: ActionContext, targetLang = 'en'): Promise<string> {
  if (!ctx.text) throw new Error('No text selected');
  return simulateAIResponse(`Expert translator. Target: ${targetLang}.`, ctx.text);
}

export async function rewriteText(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No text selected');
  return simulateAIResponse('Expert writer.', ctx.text);
}

export async function summarizeDocument(ctx: ActionContext): Promise<string> {
  if (!ctx.text) throw new Error('No text selected');
  return simulateAIResponse('Expert document summarizer.', ctx.text);
}

export async function executeAction(
  actionType: ActionType,
  ctx: ActionContext,
  params?: Record<string, string>,
): Promise<string> {
  switch (actionType) {
    case 'copy': await copyCode(ctx); return ctx.text;
    case 'copy-markdown': return copyCodeAsMarkdown(ctx);
    case 'copy-html': return copyCodeAsHTML(ctx);
    case 'format': return formatCode(ctx);
    case 'refactor': return refactorCode(ctx);
    case 'optimize': return optimizeCode(ctx);
    case 'explain': return explainCode(ctx);
    case 'comment': return generateComments(ctx);
    case 'find-issues': return findIssues(ctx);
    case 'test-generate': return generateTests(ctx);
    case 'document-generate': return generateDocumentation(ctx);
    case 'translate': return translateText(ctx, params?.targetLang);
    case 'rewrite': return rewriteText(ctx);
    case 'summarize': return summarizeDocument(ctx);
    default: throw new Error(`Unknown action type: ${actionType}`);
  }
}
