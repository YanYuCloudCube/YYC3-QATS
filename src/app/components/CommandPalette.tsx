/**
 * @file src/app/components/CommandPalette.tsx
 * @description YYC3 命令面板组件,提供快速访问的键盘驱动命令搜索功能
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags component,react,typescript,command,public
 * @depends react,@/app/data/navigation,@/app/utils/user-preferences,@/app/contexts/GlobalDataContext,@/app/constants/events
 */

/**
 * YYC-QATS Command Palette
 * ────────────────────────
 * Phase 20B: Quick access keyboard-driven command palette (Ctrl+K / Cmd+K)
 *
 * Features:
 *   - Fuzzy search across modules, sub-menus, tertiary pages
 *   - Recent navigation shortcuts
 *   - Favorite pairs quick jump
 *   - Action commands (toggle theme, open settings, export data, etc.)
 *   - Keyboard navigation (arrow keys, Enter, Escape)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { EVENTS } from '@/app/constants/events';
import { MODULES, MENUS } from '@/app/data/navigation';
import { preferenceManager } from '@/app/utils/user-preferences';

type IconProps = React.SVGProps<SVGSVGElement>;

const SearchIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const CornerDownLeft = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="9 10 4 15 9 20" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 4v7a4 4 0 01-4 4H4" /></svg>;
const Clock = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2} /><polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="12 6 12 12 16 14" /></svg>;
const StarIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
const CommandIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z" /></svg>;
const SettingsIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const SunMoon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const DownloadIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" strokeWidth={2} /></svg>;

// ── Command Item Types ──

export interface CommandItem {
  id: string;
  label: string;
  category: 'navigation' | 'recent' | 'favorite' | 'action';
  description?: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

// ── Fuzzy Match ──

function matchScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  // Fuzzy score
  let qi = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }
  return qi === q.length ? 20 + maxConsecutive * 10 : 0;
}

// ── Command Palette Component ──

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string, sub?: string, tertiary?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build all commands
  const allCommands = useMemo<CommandItem[]>(() => {
    const cmds: CommandItem[] = [];

    // Navigation commands - all module/sub/tertiary combinations
    MODULES.forEach(mod => {
      const menus = MENUS[mod.id] || [];
      // Top-level module
      cmds.push({
        id: `nav-${mod.id}`,
        label: mod.name,
        category: 'navigation',
        description: `${mod.name}`,
        keywords: [mod.id, mod.name],
        action: () => { onNavigate(mod.id); onClose(); },
      });
      // Sub-menus
      menus.forEach(menu => {
        cmds.push({
          id: `nav-${mod.id}-${menu.id}`,
          label: `${mod.name} > ${menu.name}`,
          category: 'navigation',
          description: menu.name,
          keywords: [mod.id, mod.name, menu.id, menu.name],
          action: () => { onNavigate(mod.id, menu.id); onClose(); },
        });
        // Tertiary pages
        menu.sub?.forEach(sub => {
          cmds.push({
            id: `nav-${mod.id}-${menu.id}-${sub}`,
            label: `${mod.name} > ${menu.name} > ${sub}`,
            category: 'navigation',
            description: sub,
            keywords: [mod.id, mod.name, menu.id, menu.name, sub],
            action: () => { onNavigate(mod.id, menu.id, sub); onClose(); },
          });
        });
      });
    });

    // Recent navigation
    const recent = preferenceManager.getRecentNav(5);
    recent.forEach((r, i) => {
      cmds.push({
        id: `recent-${i}`,
        label: r.label,
        category: 'recent',
        description: `${r.module} > ${r.sub}${r.tertiary ? ' > ' + r.tertiary : ''}`,
        icon: <Clock className="w-3.5 h-3.5" />,
        keywords: [r.module, r.sub, r.tertiary || '', r.label],
        action: () => { onNavigate(r.module, r.sub, r.tertiary); onClose(); },
      });
    });

    // Favorite pairs
    const favPairs = preferenceManager.prefs.favoritePairs;
    favPairs.forEach(pair => {
      cmds.push({
        id: `fav-${pair.symbol}`,
        label: `${pair.symbol} (${pair.name})`,
        category: 'favorite',
        description: pair.symbol,
        icon: <StarIcon className="w-3.5 h-3.5 text-yellow-400" />,
        keywords: [pair.symbol, pair.name],
        action: () => {
          // Navigate to K-line analysis with this pair
          onNavigate('market', 'live', 'K线分析');
          onClose();
        },
      });
    });

    // Action commands
    cmds.push({
      id: 'action-theme',
      label: '切换主题 (深色/浅色)',
      category: 'action',
      description: 'Toggle Theme',
      icon: <SunMoon className="w-3.5 h-3.5" />,
      keywords: ['theme', 'dark', 'light', '主题', '深色', '浅色'],
      action: () => {
        window.dispatchEvent(new CustomEvent(EVENTS.TOGGLE_THEME));
        onClose();
      },
    });
    cmds.push({
      id: 'action-settings',
      label: '打开设置',
      category: 'action',
      description: 'Open Settings',
      icon: <SettingsIcon className="w-3.5 h-3.5" />,
      keywords: ['settings', '设置', '配置'],
      action: () => {
        document.dispatchEvent(new CustomEvent('showSettings'));
        onClose();
      },
    });
    cmds.push({
      id: 'action-export',
      label: '数据导出',
      category: 'action',
      description: 'Export Data',
      icon: <DownloadIcon className="w-3.5 h-3.5" />,
      keywords: ['export', '导出', 'CSV', 'JSON'],
      action: () => {
        document.dispatchEvent(new CustomEvent('toggleExportPanel'));
        onClose();
      },
    });
    cmds.push({
      id: 'action-notifications',
      label: '通知中心',
      category: 'action',
      description: 'Notification Center',
      icon: <CommandIcon className="w-3.5 h-3.5" />,
      keywords: ['notification', '通知', '消息'],
      action: () => {
        document.dispatchEvent(new CustomEvent('toggleNotificationCenter'));
        onClose();
      },
    });
    cmds.push({
      id: 'action-ai',
      label: 'AI 交易助手',
      category: 'action',
      description: 'AI Trader Assistant',
      keywords: ['AI', '助手', 'assistant', '交易'],
      action: () => {
        document.dispatchEvent(new CustomEvent('toggleAIAssistant'));
        onClose();
      },
    });
    cmds.push({
      id: 'action-reset-prefs',
      label: '重置用户偏好',
      category: 'action',
      description: 'Reset Preferences',
      keywords: ['reset', '重置', '偏好', 'preferences'],
      action: () => {
        preferenceManager.reset();
        onClose();
      },
    });

    return cmds;
  }, [onNavigate, onClose]);

  // Filtered & sorted results
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show recent + actions when empty
      const recent = allCommands.filter(c => c.category === 'recent').slice(0, 5);
      const favorites = allCommands.filter(c => c.category === 'favorite').slice(0, 5);
      const actions = allCommands.filter(c => c.category === 'action');
      return [...recent, ...favorites, ...actions];
    }
    return allCommands
      .map(cmd => ({
        cmd,
        score: Math.max(
          matchScore(query, cmd.label),
          ...(cmd.keywords?.map(kw => matchScore(query, kw)) || [0]),
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ cmd }) => cmd);
  }, [query, allCommands]);

  // Reset active index when filtered changes
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length, query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[activeIndex]) {
          filtered[activeIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filtered, activeIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]');
      if (active) {
        active.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    recent: '最近访问',
    favorite: '收藏',
    navigation: '导航',
    action: '操作',
  };

  // Group by category
  const grouped: { category: string; items: CommandItem[] }[] = [];
  const seen = new Set<string>();
  filtered.forEach(item => {
    if (!seen.has(item.category)) {
      seen.add(item.category);
      grouped.push({ category: item.category, items: [] });
    }
    grouped.find(g => g.category === item.category)!.items.push(item);
  });

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl bg-[#0D1B2A] border border-[#233554] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#233554]">
          <SearchIcon className="w-5 h-5 text-[#4299E1] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入命令或搜索页面..."
            className="flex-1 bg-transparent text-[#CCD6F6] placeholder-[#8892B0] outline-none text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-[#112240] border border-[#233554] rounded text-[10px] text-[#8892B0]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#8892B0] text-sm">
              没有找到匹配的命令或页面
            </div>
          ) : (
            grouped.map(group => {
              return (
                <div key={group.category}>
                  <div className="px-4 py-1.5 text-[10px] text-[#8892B0] uppercase tracking-wider">
                    {categoryLabels[group.category] || group.category}
                  </div>
                  {group.items.map(item => {
                    const idx = globalIndex++;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        data-active={isActive}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                          isActive
                            ? 'bg-[#4299E1]/20 text-[#CCD6F6]'
                            : 'text-[#8892B0] hover:bg-[#112240] hover:text-[#CCD6F6]'
                        }`}
                        onClick={() => item.action()}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                          {item.icon || (
                            item.category === 'navigation' ? (
                              <CornerDownLeft className="w-3.5 h-3.5" />
                            ) : (
                              <CommandIcon className="w-3.5 h-3.5" />
                            )
                          )}
                        </span>
                        <span className="flex-1 text-sm truncate">{item.label}</span>
                        {isActive && (
                          <CornerDownLeft className="w-3.5 h-3.5 text-[#4299E1] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[#233554] text-[10px] text-[#8892B0]">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#112240] border border-[#233554] rounded text-[9px]">↑↓</kbd>
            导航
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#112240] border border-[#233554] rounded text-[9px]">Enter</kbd>
            确认
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#112240] border border-[#233554] rounded text-[9px]">Esc</kbd>
            关闭
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Global Keyboard Shortcut Hook ──

export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}