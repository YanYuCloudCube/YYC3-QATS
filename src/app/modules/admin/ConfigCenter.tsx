/**
 * @file src/app/modules/admin/ConfigCenter.tsx
 * @description YYC3 配置中心，提供查看、编辑、添加和删除所有硬编码值的管理界面
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags admin,react,typescript,config,public
 * @depends @/app/components,@/app/constants
 */

/**
 * YYC-QATS ConfigCenter — Phase 21
 * ──────────────────────────────────
 * Admin UI for viewing, editing, adding, and deleting ALL hardcoded values.
 * 7 tabs: Storage Keys | GlobalThis Keys | Events | Theme Colors |
 *         Symbols | Magic Numbers | Runtime Config
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Card } from '@/app/components/ui/card';

// Constants
import { getAllEvents } from '@/app/constants/events';
import { getAllGlobalKeys } from '@/app/constants/global-keys';
import { runtimeConfig, MAGIC_NUMBERS, getMagicNumber, type MagicNumber } from '@/app/constants/runtime-config';
import { getAllStorageKeys } from '@/app/constants/storage-keys';
import { DEFAULT_SYMBOLS, DEFAULT_FAVORITES } from '@/app/constants/symbols';
import {
  DARK_THEME, COLOR_DESCRIPTIONS, getThemeColors,
  type ThemeColorPalette,
} from '@/app/constants/theme-colors';

type IconProps = React.SVGProps<SVGSVGElement>;
const SaveIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>;
const TrashIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PlusIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const RefreshIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
const DownloadIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" strokeWidth={2} /></svg>;
const UploadIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" strokeWidth={2} /></svg>;
const LockIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11V7a5 5 0 0110 0v4" /></svg>;

type TabId = 'storage' | 'global' | 'events' | 'colors' | 'symbols' | 'magic' | 'runtime';

const TABS: { id: TabId; label: string }[] = [
  { id: 'storage', label: '存储键名' },
  { id: 'global', label: 'globalThis' },
  { id: 'events', label: '事件名' },
  { id: 'colors', label: '主题色' },
  { id: 'symbols', label: '交易对' },
  { id: 'magic', label: '魔术数字' },
  { id: 'runtime', label: '运行时配置' },
];

// ── Storage Keys Tab ──
const StorageKeysTab = () => {
  const keys = getAllStorageKeys();
  const [values, setValues] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const v: Record<string, string | null> = {};
    keys.forEach(k => {
      try { v[k.key] = localStorage.getItem(k.key); } catch { v[k.key] = null; }
    });
    setValues(v);
  }, []);

  const getSize = (val: string | null) => {
    if (!val) return '—';
    const bytes = new Blob([val]).size;
    return bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
  };

  const handleClear = (key: string) => {
    try { localStorage.removeItem(key); setValues(v => ({ ...v, [key]: null })); toast.success(`已清除 ${key}`); }
    catch { toast.error('清除失败'); }
  };

  const handleView = (key: string) => {
    const val = values[key];
    if (!val) { toast.info('该键无数据'); return; }
    try {
      const parsed = JSON.parse(val);
      console.log(`[ConfigCenter] ${key}:`, parsed);
      toast.success(`${key} 已输出到控制台`, { description: `${getSize(val)} · 查看 Console` });
    } catch {
      console.log(`[ConfigCenter] ${key}:`, val);
      toast.success(`${key} 已输出到控制台`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-xs">localStorage 键名注册表 ({keys.length} 项)</h3>
        <span className="text-[9px] text-[#8892B0]">Phase 21 · 常量化管理</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[#8892B0] border-b border-[#233554]">
            <tr>
              <th className="py-2 px-2 text-left">常量名</th>
              <th className="py-2 px-2 text-left">键值</th>
              <th className="py-2 px-2 text-left">描述</th>
              <th className="py-2 px-2 text-right">大小</th>
              <th className="py-2 px-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.name} className="border-t border-[#233554]/50 hover:bg-[#112240]/50">
                <td className="py-1.5 px-2 font-mono text-[#38B2AC] text-[10px]">{k.name}</td>
                <td className="py-1.5 px-2 font-mono text-[#CCD6F6] text-[10px]">{k.key}</td>
                <td className="py-1.5 px-2 text-[#8892B0] text-[10px]">{k.description}</td>
                <td className="py-1.5 px-2 text-right font-mono text-[10px] text-[#8892B0]">{getSize(values[k.key])}</td>
                <td className="py-1.5 px-2 text-center">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => handleView(k.key)} className="px-1.5 py-0.5 bg-[#233554] text-[#CCD6F6] rounded text-[9px] hover:bg-[#2D4466]">查看</button>
                    <button onClick={() => handleClear(k.key)} className="px-1.5 py-0.5 bg-[#F56565]/10 text-[#F56565] rounded text-[9px] hover:bg-[#F56565]/20">清除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── GlobalThis Keys Tab ──
const GlobalKeysTab = () => {
  const keys = getAllGlobalKeys();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-xs">globalThis 单例键注册表 ({keys.length} 项)</h3>
        <span className="text-[9px] text-[#8892B0] flex items-center gap-1"><LockIcon className="w-3 h-3" /> 只读 · HMR 安全缓存</span>
      </div>
      <div className="grid gap-2">
        {keys.map(k => (
          <div key={k.name} className="flex items-center justify-between p-2.5 bg-[#0A192F] rounded border border-[#233554]/30">
            <div>
              <span className="font-mono text-[#38B2AC] text-[10px]">{k.name}</span>
              <p className="text-[#8892B0] text-[10px] mt-0.5">{k.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-[9px] font-mono text-[#CCD6F6] bg-[#112240] px-2 py-0.5 rounded">{k.key}</code>
              <span className={`w-2 h-2 rounded-full ${(globalThis as any)[k.key] ? 'bg-[#38B2AC]' : 'bg-[#F56565]'}`} title={(globalThis as any)[k.key] ? '已挂载' : '未挂载'} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Events Tab ──
const EventsTab = () => {
  const events = getAllEvents();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-xs">CustomEvent 事件注册表 ({events.length} 项)</h3>
        <span className="text-[9px] text-[#8892B0] flex items-center gap-1"><LockIcon className="w-3 h-3" /> 只读 · 事件名不可运行时修改</span>
      </div>
      <div className="grid gap-2">
        {events.map(e => (
          <div key={e.name} className="flex items-center justify-between p-2.5 bg-[#0A192F] rounded border border-[#233554]/30">
            <div>
              <span className="font-mono text-[#ECC94B] text-[10px]">{e.name}</span>
              <p className="text-[#8892B0] text-[10px] mt-0.5">{e.description}</p>
            </div>
            <code className="text-[9px] font-mono text-[#CCD6F6] bg-[#112240] px-2 py-0.5 rounded">{e.event}</code>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Theme Colors Tab ──
const ThemeColorsTab = () => {
  const currentColors = getThemeColors();
  const colorKeys = Object.keys(COLOR_DESCRIPTIONS) as (keyof ThemeColorPalette)[];
  const [overrides, setOverrides] = useState<Partial<ThemeColorPalette>>(() => {
    const stored = runtimeConfig.get('themeOverrides');
    return (stored && typeof stored === 'object' ? stored : {}) as Partial<ThemeColorPalette>;
  });

  const handleColorChange = (key: keyof ThemeColorPalette, value: string) => {
    setOverrides(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const cleanOverrides: Partial<ThemeColorPalette> = {};
    Object.entries(overrides).forEach(([k, v]) => {
      if (v && v !== DARK_THEME[k as keyof ThemeColorPalette]) {
        cleanOverrides[k as keyof ThemeColorPalette] = v;
      }
    });
    if (Object.keys(cleanOverrides).length > 0) {
      runtimeConfig.set('themeOverrides', cleanOverrides as any);
    } else {
      runtimeConfig.remove('themeOverrides');
    }
    toast.success('主题色覆盖已保存', { description: `${Object.keys(cleanOverrides).length} 项自定义` });
  };

  const handleReset = () => {
    runtimeConfig.remove('themeOverrides');
    setOverrides({});
    toast.success('已恢复默认主题色');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-xs">主题色常量 ({colorKeys.length} 项)</h3>
        <div className="flex gap-2">
          <button onClick={handleReset} className="px-2 py-1 bg-[#233554] text-[#CCD6F6] rounded text-[10px] hover:bg-[#2D4466] flex items-center gap-1">
            <RefreshIcon className="w-3 h-3" /> 恢复默认
          </button>
          <button onClick={handleSave} className="px-2 py-1 bg-[#38B2AC] text-white rounded text-[10px] hover:brightness-110 flex items-center gap-1">
            <SaveIcon className="w-3 h-3" /> 保存覆盖
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {colorKeys.map(key => {
          const defaultVal = DARK_THEME[key];
          const overrideVal = overrides[key];
          const displayVal = overrideVal || currentColors[key];
          const isOverridden = !!overrideVal && overrideVal !== defaultVal;
          return (
            <div key={key} className={`flex items-center gap-2 p-2 rounded border ${isOverridden ? 'border-[#ECC94B]/30 bg-[#ECC94B]/5' : 'border-[#233554]/30 bg-[#0A192F]'}`}>
              <input
                type="color"
                value={displayVal.slice(0, 7)}
                onChange={e => handleColorChange(key, e.target.value)}
                className="w-6 h-6 rounded border border-[#233554] cursor-pointer bg-transparent"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] text-[#CCD6F6]">{key}</span>
                  {isOverridden && <span className="text-[8px] px-1 py-0.5 bg-[#ECC94B]/20 text-[#ECC94B] rounded">覆盖</span>}
                </div>
                <span className="text-[9px] text-[#8892B0]">{COLOR_DESCRIPTIONS[key]}</span>
              </div>
              <code className="text-[9px] font-mono text-[#8892B0]">{displayVal}</code>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Symbols Tab ──
const SymbolsTab = () => {
  const [symbols, setSymbols] = useState<string[]>(() => {
    const stored = runtimeConfig.get('symbols');
    return (stored && Array.isArray(stored) ? stored : [...DEFAULT_SYMBOLS]) as string[];
  });
  const [newSymbol, setNewSymbol] = useState('');

  const handleAdd = () => {
    const sym = newSymbol.trim().toUpperCase();
    if (!sym) return;
    if (symbols.includes(sym)) { toast.error(`${sym} 已存在`); return; }
    const next = [...symbols, sym];
    setSymbols(next);
    runtimeConfig.set('symbols', next);
    setNewSymbol('');
    toast.success(`已添加 ${sym}`);
  };

  const handleRemove = (sym: string) => {
    const next = symbols.filter(s => s !== sym);
    setSymbols(next);
    runtimeConfig.set('symbols', next);
    toast.success(`已移除 ${sym}`);
  };

  const handleReset = () => {
    runtimeConfig.remove('symbols');
    setSymbols([...DEFAULT_SYMBOLS]);
    toast.success('已恢复默认交易对');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-xs">交易对符号注册表 ({symbols.length} 项)</h3>
        <button onClick={handleReset} className="px-2 py-1 bg-[#233554] text-[#CCD6F6] rounded text-[10px] hover:bg-[#2D4466] flex items-center gap-1">
          <RefreshIcon className="w-3 h-3" /> 恢复默认
        </button>
      </div>

      {/* Add new symbol */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newSymbol}
          onChange={e => setNewSymbol(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="输入交易对 (如 DOGE/USDT)"
          className="flex-1 bg-[#0A192F] border border-[#233554] rounded px-3 py-1.5 text-xs text-[#CCD6F6] focus:outline-none focus:border-[#4299E1] placeholder-[#8892B0]/50"
        />
        <button onClick={handleAdd} className="px-3 py-1.5 bg-[#38B2AC] text-white rounded text-xs hover:brightness-110 flex items-center gap-1">
          <PlusIcon className="w-3 h-3" /> 添加
        </button>
      </div>

      {/* Symbol list */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {symbols.map(sym => {
          const isDefault = (DEFAULT_SYMBOLS as readonly string[]).includes(sym);
          return (
            <div key={sym} className="flex items-center justify-between p-2 bg-[#0A192F] rounded border border-[#233554]/30">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#38B2AC]" />
                <span className="font-mono text-[11px] text-[#CCD6F6]">{sym}</span>
                {isDefault && <span className="text-[8px] px-1 py-0.5 bg-[#4299E1]/20 text-[#4299E1] rounded">默认</span>}
              </div>
              <button onClick={() => handleRemove(sym)} className="p-0.5 text-[#8892B0] hover:text-[#F56565] transition-colors">
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Favorites */}
      <Card className="p-3">
        <h4 className="text-[#8892B0] text-[10px] mb-2">默认自选 (新用户)</h4>
        <div className="flex gap-2 flex-wrap">
          {(DEFAULT_FAVORITES as readonly string[]).map(s => (
            <span key={s} className="px-2 py-0.5 bg-[#ECC94B]/10 text-[#ECC94B] rounded text-[10px] font-mono">{s}</span>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ── Magic Numbers Tab ──
const MagicNumbersTab = () => {
  const categories = ['timeout', 'interval', 'retry', 'cache', 'threshold', 'limit'] as const;
  const [activeCategory, setActiveCategory] = useState<string>('timeout');
  const [values, setValues] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    MAGIC_NUMBERS.forEach(m => { v[m.key] = getMagicNumber(m.key); });
    return v;
  });

  const filtered = MAGIC_NUMBERS.filter(m => m.category === activeCategory);

  const handleChange = (key: string, val: number) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = (mn: MagicNumber) => {
    const val = values[mn.key];
    if (val === mn.defaultValue) {
      runtimeConfig.remove(mn.key);
    } else {
      runtimeConfig.set(mn.key, val);
    }
    toast.success(`${mn.label} = ${val}${mn.unit}`);
  };

  const handleResetAll = () => {
    MAGIC_NUMBERS.forEach(m => runtimeConfig.remove(m.key));
    const v: Record<string, number> = {};
    MAGIC_NUMBERS.forEach(m => { v[m.key] = m.defaultValue; });
    setValues(v);
    toast.success('所有魔术数字已恢复默认');
  };

  const categoryLabels: Record<string, string> = {
    timeout: '超时', interval: '间隔', retry: '重试', cache: '缓存', threshold: '阈值', limit: '上限',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-xs">魔术数字注册表 ({MAGIC_NUMBERS.length} 项)</h3>
        <button onClick={handleResetAll} className="px-2 py-1 bg-[#233554] text-[#CCD6F6] rounded text-[10px] hover:bg-[#2D4466] flex items-center gap-1">
          <RefreshIcon className="w-3 h-3" /> 全部恢复默认
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-2.5 py-1 rounded text-[10px] transition-colors ${activeCategory === c ? 'bg-[#38B2AC]/20 text-[#38B2AC]' : 'bg-[#112240] text-[#8892B0] hover:text-[#CCD6F6]'}`}
          >
            {categoryLabels[c]} ({MAGIC_NUMBERS.filter(m => m.category === c).length})
          </button>
        ))}
      </div>

      {/* Number editors */}
      <div className="space-y-2">
        {filtered.map(mn => {
          const isOverridden = values[mn.key] !== mn.defaultValue;
          return (
            <div key={mn.key} className={`flex items-center gap-3 p-2.5 rounded border ${isOverridden ? 'border-[#ECC94B]/30 bg-[#ECC94B]/5' : 'border-[#233554]/30 bg-[#0A192F]'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#CCD6F6]">{mn.label}</span>
                  {isOverridden && <span className="text-[8px] px-1 py-0.5 bg-[#ECC94B]/20 text-[#ECC94B] rounded">自定义</span>}
                </div>
                <p className="text-[9px] text-[#8892B0] mt-0.5">{mn.description}</p>
                <code className="text-[8px] text-[#4A5568] font-mono">{mn.key} · 默认: {mn.defaultValue}{mn.unit}</code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  value={values[mn.key]}
                  onChange={e => handleChange(mn.key, Number(e.target.value))}
                  min={mn.min}
                  max={mn.max}
                  className="w-24 bg-[#112240] border border-[#233554] rounded px-2 py-1 text-xs text-[#CCD6F6] text-right font-mono focus:outline-none focus:border-[#4299E1]"
                />
                <span className="text-[9px] text-[#8892B0] w-6">{mn.unit}</span>
                <button onClick={() => handleSave(mn)} className="px-2 py-1 bg-[#38B2AC]/20 text-[#38B2AC] rounded text-[9px] hover:bg-[#38B2AC]/30">
                  保存
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Runtime Config Tab (raw JSON editor) ──
const RuntimeConfigTab = () => {
  const [json, setJson] = useState(() => runtimeConfig.exportJSON());
  const [error, setError] = useState('');

  useEffect(() => {
    return runtimeConfig.subscribe(() => setJson(runtimeConfig.exportJSON()));
  }, []);

  const handleSave = () => {
    try {
      JSON.parse(json);
      runtimeConfig.importJSON(json);
      setError('');
      toast.success('运行时配置已保存');
    } catch (_e) {
      setError('JSON 格式错误');
      toast.error('JSON 解析失败');
    }
  };

  const handleReset = () => {
    runtimeConfig.reset();
    setJson('{}');
    setError('');
    toast.success('所有运行时配置已清除');
  };

  const handleExport = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yyc-runtime-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('配置已导出');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        JSON.parse(text);
        setJson(text);
        runtimeConfig.importJSON(text);
        setError('');
        toast.success(`已导入 ${file.name}`);
      } catch {
        toast.error('文件解析失败');
      }
    };
    input.click();
  };

  const configKeys = Object.keys(runtimeConfig.getAll());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-xs">运行时覆盖配置 ({configKeys.length} 项)</h3>
        <div className="flex gap-2">
          <button onClick={handleImport} className="px-2 py-1 bg-[#233554] text-[#CCD6F6] rounded text-[10px] hover:bg-[#2D4466] flex items-center gap-1">
            <UploadIcon className="w-3 h-3" /> 导入
          </button>
          <button onClick={handleExport} className="px-2 py-1 bg-[#233554] text-[#CCD6F6] rounded text-[10px] hover:bg-[#2D4466] flex items-center gap-1">
            <DownloadIcon className="w-3 h-3" /> 导出
          </button>
          <button onClick={handleReset} className="px-2 py-1 bg-[#F56565]/10 text-[#F56565] rounded text-[10px] hover:bg-[#F56565]/20 flex items-center gap-1">
            <TrashIcon className="w-3 h-3" /> 全部清除
          </button>
          <button onClick={handleSave} className="px-2 py-1 bg-[#38B2AC] text-white rounded text-[10px] hover:brightness-110 flex items-center gap-1">
            <SaveIcon className="w-3 h-3" /> 保存
          </button>
        </div>
      </div>

      <div className="text-[9px] text-[#8892B0] flex items-center gap-2">
        <LockIcon className="w-3 h-3 text-[#ECC94B]" />
        <span>env() 保护: 编译期环境变量 (VITE_YYC_*) 优先级高于运行时覆盖</span>
      </div>

      <textarea
        value={json}
        onChange={e => { setJson(e.target.value); setError(''); }}
        className={`w-full h-64 bg-[#0A192F] border ${error ? 'border-[#F56565]' : 'border-[#233554]'} rounded p-3 text-xs font-mono text-[#CCD6F6] focus:outline-none focus:border-[#4299E1] resize-y`}
        spellCheck={false}
      />
      {error && <p className="text-[10px] text-[#F56565]">{error}</p>}

      {configKeys.length > 0 && (
        <Card className="p-3">
          <h4 className="text-[#8892B0] text-[10px] mb-2">活跃覆盖项</h4>
          <div className="flex flex-wrap gap-1.5">
            {configKeys.map(k => (
              <span key={k} className="px-2 py-0.5 bg-[#ECC94B]/10 text-[#ECC94B] rounded text-[9px] font-mono">{k}</span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// ═══════════════════════════════════════
// Main ConfigCenter Component
// ═══════════════════════════════════════

export const ConfigCenter = () => {
  const [activeTab, setActiveTab] = useState<TabId>('storage');

  const renderTab = () => {
    switch (activeTab) {
      case 'storage': return <StorageKeysTab />;
      case 'global': return <GlobalKeysTab />;
      case 'events': return <EventsTab />;
      case 'colors': return <ThemeColorsTab />;
      case 'symbols': return <SymbolsTab />;
      case 'magic': return <MagicNumbersTab />;
      case 'runtime': return <RuntimeConfigTab />;
      default: return <StorageKeysTab />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-white text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#38B2AC] animate-pulse" />
              系统配置中心
            </h2>
            <p className="text-[10px] text-[#8892B0] mt-1">Phase 21 · 所有硬编码内容统一管理 · 支持运行时编辑/增删/导入导出</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#8892B0]">常量文件: 6 · 消费方: 20+</div>
            <div className="text-[10px] text-[#38B2AC]">env() 保护 · 不可逆内容安全</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#38B2AC]/20 text-[#38B2AC] border border-[#38B2AC]/30'
                  : 'bg-[#112240] text-[#8892B0] border border-transparent hover:text-[#CCD6F6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Active Tab Content */}
      <Card className="p-4">
        {renderTab()}
      </Card>
    </div>
  );
};
