/**
 * @file src/app/modules/strategy/VisualBuilder.tsx
 * @description YYC3 可视化策略构建器，提供基于节点的拖拽式策略编辑器，纯 React + SVG 实现
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags strategy,react,typescript,visual,public
 * @depends @/app/components,@/app/constants
 */

/**
 * YYC-QATS Visual Strategy Builder — Phase 22B
 * ──────────────────────────────────────────────
 * Drag-and-drop node-based strategy editor.
 * No forwardRef, no radix-ui, no reactflow — pure React + SVG.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Card } from '@/app/components/ui/card';

// ═══════════════════════════════════════
// §1  Type Definitions
// ═══════════════════════════════════════

type NodeCategory = 'data' | 'indicator' | 'condition' | 'action' | 'risk';

interface StrategyNode {
  id: string;
  type: string;
  category: NodeCategory;
  label: string;
  x: number;
  y: number;
  params: Record<string, number | string | boolean>;
  outputPortIds: string[];
  inputPortIds: string[];
}

interface Connection {
  id: string;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
}

interface NodeTemplate {
  type: string;
  category: NodeCategory;
  label: string;
  icon: string;
  description: string;
  params: { key: string; label: string; type: 'number' | 'select' | 'boolean'; default: number | string | boolean; options?: string[]; min?: number; max?: number; step?: number }[];
  inputs: string[];
  outputs: string[];
}

// ═══════════════════════════════════════
// §2  Node Template Registry
// ═══════════════════════════════════════

const NODE_TEMPLATES: NodeTemplate[] = [
  // Data Sources
  {
    type: 'price_feed', category: 'data', label: '价格数据', icon: '📊', description: '实时/历史 OHLCV', params: [
      { key: 'symbol', label: '品种', type: 'select', default: 'BTC/USDT', options: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'] },
      { key: 'interval', label: '周期', type: 'select', default: '1h', options: ['1m', '5m', '15m', '1h', '4h', '1d'] },
    ], inputs: [], outputs: ['ohlcv']
  },

  {
    type: 'volume_feed', category: 'data', label: '量能数据', icon: '📈', description: '成交量与资金流', params: [
      { key: 'smoothing', label: '平滑周期', type: 'number', default: 5, min: 1, max: 50 },
    ], inputs: [], outputs: ['volume']
  },

  // Indicators
  {
    type: 'sma', category: 'indicator', label: 'SMA 均线', icon: '〰️', description: '简单移动平均', params: [
      { key: 'period', label: '周期', type: 'number', default: 20, min: 2, max: 200 },
    ], inputs: ['price'], outputs: ['value']
  },

  {
    type: 'ema', category: 'indicator', label: 'EMA 均线', icon: '📐', description: '指数移动平均', params: [
      { key: 'period', label: '周期', type: 'number', default: 12, min: 2, max: 200 },
    ], inputs: ['price'], outputs: ['value']
  },

  {
    type: 'rsi', category: 'indicator', label: 'RSI', icon: '🔄', description: '相对强弱指标', params: [
      { key: 'period', label: '周期', type: 'number', default: 14, min: 2, max: 100 },
    ], inputs: ['price'], outputs: ['value']
  },

  {
    type: 'macd', category: 'indicator', label: 'MACD', icon: '📉', description: '指数平滑异同', params: [
      { key: 'fast', label: '快线', type: 'number', default: 12, min: 2, max: 50 },
      { key: 'slow', label: '慢线', type: 'number', default: 26, min: 10, max: 100 },
      { key: 'signal', label: '信号线', type: 'number', default: 9, min: 2, max: 30 },
    ], inputs: ['price'], outputs: ['macd', 'signal', 'histogram']
  },

  {
    type: 'bollinger', category: 'indicator', label: 'BOLL', icon: '🔔', description: '布林带', params: [
      { key: 'period', label: '周期', type: 'number', default: 20, min: 5, max: 100 },
      { key: 'stdDev', label: '标准差', type: 'number', default: 2, min: 0.5, max: 4, step: 0.5 },
    ], inputs: ['price'], outputs: ['upper', 'middle', 'lower']
  },

  {
    type: 'atr', category: 'indicator', label: 'ATR', icon: '📏', description: '真实波动幅度', params: [
      { key: 'period', label: '周期', type: 'number', default: 14, min: 2, max: 100 },
    ], inputs: ['ohlcv'], outputs: ['value']
  },

  // Conditions
  { type: 'cross_above', category: 'condition', label: '上穿', icon: '⬆️', description: '值A上穿值B', params: [], inputs: ['a', 'b'], outputs: ['signal'] },
  { type: 'cross_below', category: 'condition', label: '下穿', icon: '⬇️', description: '值A下穿值B', params: [], inputs: ['a', 'b'], outputs: ['signal'] },
  {
    type: 'threshold', category: 'condition', label: '阈值判断', icon: '🎯', description: '大于/小于阈值', params: [
      { key: 'operator', label: '条件', type: 'select', default: '>', options: ['>', '<', '>=', '<='] },
      { key: 'value', label: '阈值', type: 'number', default: 70, min: 0, max: 10000 },
    ], inputs: ['value'], outputs: ['signal']
  },
  { type: 'and_gate', category: 'condition', label: 'AND 门', icon: '🔗', description: '所有信号同时满足', params: [], inputs: ['a', 'b'], outputs: ['signal'] },
  { type: 'or_gate', category: 'condition', label: 'OR 门', icon: '🔀', description: '任一信号满足', params: [], inputs: ['a', 'b'], outputs: ['signal'] },

  // Actions
  {
    type: 'buy', category: 'action', label: '买入', icon: '🟢', description: '开多/买入信号', params: [
      { key: 'positionSize', label: '仓位比例', type: 'number', default: 0.2, min: 0.01, max: 1, step: 0.05 },
      { key: 'orderType', label: '订单类型', type: 'select', default: 'market', options: ['market', 'limit'] },
    ], inputs: ['trigger'], outputs: []
  },
  {
    type: 'sell', category: 'action', label: '卖出', icon: '🔴', description: '平仓/卖出信号', params: [
      { key: 'positionSize', label: '仓位比例', type: 'number', default: 1.0, min: 0.01, max: 1, step: 0.05 },
      { key: 'orderType', label: '订单类型', type: 'select', default: 'market', options: ['market', 'limit'] },
    ], inputs: ['trigger'], outputs: []
  },

  // Risk Management
  {
    type: 'stop_loss', category: 'risk', label: '止损', icon: '🛡️', description: '固定止损', params: [
      { key: 'percent', label: '止损%', type: 'number', default: 2, min: 0.1, max: 50, step: 0.5 },
    ], inputs: ['position'], outputs: ['trigger']
  },
  {
    type: 'take_profit', category: 'risk', label: '止盈', icon: '🏆', description: '固定止盈', params: [
      { key: 'percent', label: '止盈%', type: 'number', default: 5, min: 0.1, max: 100, step: 0.5 },
    ], inputs: ['position'], outputs: ['trigger']
  },
  {
    type: 'trailing_stop', category: 'risk', label: '追踪止损', icon: '📍', description: '跟随最高价止损', params: [
      { key: 'percent', label: '回撤%', type: 'number', default: 3, min: 0.1, max: 50, step: 0.5 },
    ], inputs: ['position'], outputs: ['trigger']
  },
];

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  data: '#4299E1',
  indicator: '#ECC94B',
  condition: '#9F7AEA',
  action: '#38B2AC',
  risk: '#F56565',
};

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  data: '数据源',
  indicator: '指标',
  condition: '条件',
  action: '交易',
  risk: '风控',
};

// ═══════════════════════════════════════
// §3  SVG Connection Line
// ═══════════════════════════════════════

const ConnectionLine = ({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) => {
  const dx = Math.abs(x2 - x1) * 0.5;
  const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  return (
    <g>
      <path d={path} stroke={color} strokeWidth={2} fill="none" opacity={0.6} />
      <path d={path} stroke={color} strokeWidth={6} fill="none" opacity={0} className="cursor-pointer" />
    </g>
  );
};

// ═══════════════════════════════════════
// §4  Draggable Node Component
// ═══════════════════════════════════════

const NODE_WIDTH = 180;
const NODE_HEADER_H = 32;
const PORT_RADIUS = 5;
const PORT_SPACING = 22;

interface NodeViewProps {
  node: StrategyNode;
  template: NodeTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onPortMouseDown: (nodeId: string, portId: string, isOutput: boolean, x: number, y: number) => void;
}

const getPortY = (index: number) => NODE_HEADER_H + 14 + index * PORT_SPACING;

const NodeView = ({ node, template, isSelected, onSelect, onDragStart, onPortMouseDown }: NodeViewProps) => {
  const color = CATEGORY_COLORS[node.category];
  const maxPorts = Math.max(template.inputs.length, template.outputs.length);
  const nodeHeight = NODE_HEADER_H + 14 + maxPorts * PORT_SPACING + 10;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseDown={(e) => { e.stopPropagation(); onSelect(); onDragStart(e); }}
      className="cursor-grab active:cursor-grabbing"
    >
      {/* Shadow */}
      <rect x={2} y={2} width={NODE_WIDTH} height={nodeHeight} rx={8} fill="rgba(0,0,0,0.3)" />

      {/* Body */}
      <rect
        width={NODE_WIDTH} height={nodeHeight} rx={8}
        fill="#112240"
        stroke={isSelected ? color : '#233554'}
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Header */}
      <rect width={NODE_WIDTH} height={NODE_HEADER_H} rx={8} fill={color} opacity={0.15} />
      <rect y={NODE_HEADER_H - 1} width={NODE_WIDTH} height={10} fill={color} opacity={0.15} />
      <line x1={0} y1={NODE_HEADER_H} x2={NODE_WIDTH} y2={NODE_HEADER_H} stroke={color} opacity={0.3} />

      {/* Icon + Label */}
      <text x={10} y={21} fontSize={13}>{template.icon}</text>
      <text x={30} y={21} fill="#CCD6F6" fontSize={11} fontFamily="sans-serif">{node.label}</text>
      <text x={NODE_WIDTH - 8} y={21} fill={color} fontSize={9} textAnchor="end" fontFamily="monospace">{node.type}</text>

      {/* Input Ports */}
      {template.inputs.map((name, i) => {
        const py = getPortY(i);
        return (
          <g key={`in-${name}`}>
            <circle
              cx={0} cy={py} r={PORT_RADIUS}
              fill="#0A192F" stroke={color} strokeWidth={1.5}
              className="cursor-crosshair"
              onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(node.id, name, false, node.x, node.y + py); }}
            />
            <text x={12} y={py + 3} fill="#8892B0" fontSize={9} fontFamily="monospace">{name}</text>
          </g>
        );
      })}

      {/* Output Ports */}
      {template.outputs.map((name, i) => {
        const py = getPortY(i);
        return (
          <g key={`out-${name}`}>
            <circle
              cx={NODE_WIDTH} cy={py} r={PORT_RADIUS}
              fill={color} stroke={color} strokeWidth={1.5}
              className="cursor-crosshair"
              onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(node.id, name, true, node.x + NODE_WIDTH, node.y + py); }}
            />
            <text x={NODE_WIDTH - 12} y={py + 3} fill="#8892B0" fontSize={9} fontFamily="monospace" textAnchor="end">{name}</text>
          </g>
        );
      })}
    </g>
  );
};

// ═══════════════════════════════════════
// §5  Parameter Editor Panel
// ═══════════════════════════════════════

const ParamEditor = ({ node, template, onUpdate, onDelete }: {
  node: StrategyNode;
  template: NodeTemplate;
  onUpdate: (params: Record<string, number | string | boolean>) => void;
  onDelete: () => void;
}) => {
  const color = CATEGORY_COLORS[node.category];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
          <span className="text-xs text-white">{template.icon} {node.label}</span>
        </div>
        <button onClick={onDelete} className="text-[10px] px-2 py-0.5 bg-[#F56565]/10 text-[#F56565] rounded hover:bg-[#F56565]/20">删除</button>
      </div>
      <p className="text-[10px] text-[#8892B0]">{template.description}</p>

      {template.params.length === 0 ? (
        <p className="text-[10px] text-[#8892B0] italic">此节点无参数</p>
      ) : (
        <div className="space-y-2">
          {template.params.map(p => (
            <div key={p.key}>
              <label className="text-[10px] text-[#8892B0] block mb-0.5">{p.label}</label>
              {p.type === 'select' ? (
                <select
                  value={String(node.params[p.key] ?? p.default)}
                  onChange={e => onUpdate({ ...node.params, [p.key]: e.target.value })}
                  className="w-full bg-[#071425] border border-[#233554] rounded px-2 py-1 text-[10px] text-[#CCD6F6] focus:outline-none focus:border-[#4299E1]"
                >
                  {p.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : p.type === 'boolean' ? (
                <button
                  onClick={() => onUpdate({ ...node.params, [p.key]: !node.params[p.key] })}
                  className={`px-3 py-1 rounded text-[10px] ${node.params[p.key] ? 'bg-[#38B2AC]/20 text-[#38B2AC]' : 'bg-[#233554] text-[#8892B0]'}`}
                >
                  {node.params[p.key] ? '启用' : '禁用'}
                </button>
              ) : (
                <input
                  type="number"
                  value={Number(node.params[p.key] ?? p.default)}
                  min={p.min} max={p.max} step={p.step || 1}
                  onChange={e => onUpdate({ ...node.params, [p.key]: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#071425] border border-[#233554] rounded px-2 py-1 text-[10px] text-[#CCD6F6] font-mono focus:outline-none focus:border-[#4299E1]"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Port info */}
      <div className="pt-2 border-t border-[#233554]/50">
        <div className="flex gap-4">
          {template.inputs.length > 0 && (
            <div>
              <span className="text-[9px] text-[#8892B0]">输入:</span>
              <div className="flex gap-1 mt-0.5">{template.inputs.map(i => <span key={i} className="px-1.5 py-0.5 bg-[#233554] rounded text-[8px] font-mono text-[#CCD6F6]">{i}</span>)}</div>
            </div>
          )}
          {template.outputs.length > 0 && (
            <div>
              <span className="text-[9px] text-[#8892B0]">输出:</span>
              <div className="flex gap-1 mt-0.5">{template.outputs.map(o => <span key={o} className="px-1.5 py-0.5 rounded text-[8px] font-mono text-[#CCD6F6]" style={{ backgroundColor: `${color}20`, color }}>{o}</span>)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════
// §6  Code Generator
// ═══════════════════════════════════════

function generateCode(nodes: StrategyNode[], connections: Connection[]): string {
  if (nodes.length === 0) return '# 拖拽节点到画布开始构建策略';

  const lines: string[] = [
    '# ═══════════════════════════════════════',
    '# YYC-QATS 可视化策略 (自动生成)',
    '# ═══════════════════════════════════════',
    '',
    'from strategy_engine import Strategy, Signal',
    'import numpy as np',
    '',
    'class VisualStrategy(Strategy):',
    '    """由可视化构建器自动生成"""',
    '',
  ];

  // Collect params from data nodes
  const dataNodes = nodes.filter(n => n.category === 'data');
  const indicatorNodes = nodes.filter(n => n.category === 'indicator');
  const conditionNodes = nodes.filter(n => n.category === 'condition');
  const actionNodes = nodes.filter(n => n.category === 'action');
  const riskNodes = nodes.filter(n => n.category === 'risk');

  // Constructor
  lines.push('    def __init__(self):');
  if (dataNodes.length > 0) {
    const d = dataNodes[0];
    lines.push(`        self.symbol = "${d.params.symbol || 'BTC/USDT'}"`);
    lines.push(`        self.interval = "${d.params.interval || '1h'}"`);
  }
  indicatorNodes.forEach(n => {
    const t = NODE_TEMPLATES.find(t => t.type === n.type)!;
    t.params.forEach(p => {
      lines.push(`        self.${n.type}_${p.key} = ${JSON.stringify(n.params[p.key] ?? p.default)}`);
    });
  });
  riskNodes.forEach(n => {
    lines.push(`        self.${n.type} = ${(n.params.percent as number || 2) / 100}`);
  });
  actionNodes.forEach(n => {
    lines.push(`        self.${n.type}_size = ${n.params.positionSize || 0.2}`);
  });
  lines.push('');

  // on_bar
  lines.push('    def on_bar(self, bar):');
  indicatorNodes.forEach(n => {
    if (n.type === 'sma') lines.push(`        ${n.type}_val = self.sma(bar.close, self.sma_period)`);
    else if (n.type === 'ema') lines.push(`        ${n.type}_val = self.ema(bar.close, self.ema_period)`);
    else if (n.type === 'rsi') lines.push(`        ${n.type}_val = self.rsi(bar.close, self.rsi_period)`);
    else if (n.type === 'macd') lines.push(`        macd_line, signal_line, hist = self.macd(bar.close, self.macd_fast, self.macd_slow, self.macd_signal)`);
    else if (n.type === 'bollinger') lines.push(`        boll_upper, boll_mid, boll_lower = self.bollinger(bar.close, self.bollinger_period, self.bollinger_stdDev)`);
    else if (n.type === 'atr') lines.push(`        atr_val = self.atr(bar, self.atr_period)`);
  });
  lines.push('');

  // Conditions
  conditionNodes.forEach(n => {
    if (n.type === 'cross_above') {
      const inputConns = connections.filter(c => c.toNodeId === n.id);
      const aConn = inputConns.find(c => c.toPort === 'a');
      const bConn = inputConns.find(c => c.toPort === 'b');
      const aVar = aConn ? `${nodes.find(nn => nn.id === aConn.fromNodeId)?.type}_val` : 'fast_val';
      const bVar = bConn ? `${nodes.find(nn => nn.id === bConn.fromNodeId)?.type}_val` : 'slow_val';
      lines.push(`        # 上穿条件`);
      lines.push(`        cross_up = ${aVar} > ${bVar} and self.prev_${aVar.split('_')[0]} <= self.prev_${bVar.split('_')[0]}`);
    } else if (n.type === 'cross_below') {
      lines.push(`        # 下穿条件`);
      lines.push(`        cross_down = fast_val < slow_val and self.prev_fast >= self.prev_slow`);
    } else if (n.type === 'threshold') {
      const op = n.params.operator || '>';
      const val = n.params.value || 70;
      lines.push(`        threshold_hit = indicator_val ${op} ${val}`);
    } else if (n.type === 'and_gate') {
      lines.push(`        combined = signal_a and signal_b`);
    } else if (n.type === 'or_gate') {
      lines.push(`        combined = signal_a or signal_b`);
    }
  });

  // Actions
  if (actionNodes.length > 0) {
    lines.push('');
    const buyNode = actionNodes.find(n => n.type === 'buy');
    const sellNode = actionNodes.find(n => n.type === 'sell');
    if (buyNode) {
      lines.push(`        if buy_signal:`);
      lines.push(`            self.buy(price=bar.close, size=self.buy_size)`);
    }
    if (sellNode) {
      lines.push(`        if sell_signal:`);
      lines.push(`            self.sell(price=bar.close, size=self.sell_size)`);
    }
  }

  // Risk management
  if (riskNodes.length > 0) {
    lines.push('');
    lines.push('        # 风控管理');
    riskNodes.forEach(n => {
      if (n.type === 'stop_loss') lines.push(`        self.set_stop_loss(self.stop_loss)`);
      if (n.type === 'take_profit') lines.push(`        self.set_take_profit(self.take_profit)`);
      if (n.type === 'trailing_stop') lines.push(`        self.set_trailing_stop(self.trailing_stop)`);
    });
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════
// §7  Main Visual Builder Component
// ═══════════════════════════════════════

let nextNodeId = 1;

export const VisualBuilder = () => {
  const [nodes, setNodes] = useState<StrategyNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pendingConnection, setPendingConnection] = useState<{ nodeId: string; port: string; isOutput: boolean; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showCode, setShowCode] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NodeCategory>('data');
  const [viewOffset, _setViewOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedTemplate = selectedNode ? NODE_TEMPLATES.find(t => t.type === selectedNode.type) : null;

  // Add node to canvas
  const handleAddNode = useCallback((template: NodeTemplate) => {
    const id = `node_${nextNodeId++}`;
    const params: Record<string, number | string | boolean> = {};
    template.params.forEach(p => { params[p.key] = p.default; });
    const newNode: StrategyNode = {
      id, type: template.type, category: template.category, label: template.label,
      x: 250 + Math.random() * 200 - viewOffset.x, y: 80 + Math.random() * 200 - viewOffset.y,
      params,
      inputPortIds: template.inputs,
      outputPortIds: template.outputs,
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(id);
    toast.success(`已添加: ${template.label}`);
  }, [viewOffset]);

  // Node dragging
  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNodeId(nodeId);
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (svgRect) {
      setDragOffset({ x: e.clientX - svgRect.left - node.x - viewOffset.x, y: e.clientY - svgRect.top - node.y - viewOffset.y });
    }
  }, [nodes, viewOffset]);

  // Port connection handling
  const handlePortMouseDown = useCallback((nodeId: string, port: string, isOutput: boolean, x: number, y: number) => {
    setPendingConnection({ nodeId, port, isOutput, x, y });
  }, []);

  const handleSvgMouseMove = useCallback((e: React.MouseEvent) => {
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const mx = e.clientX - svgRect.left - viewOffset.x;
    const my = e.clientY - svgRect.top - viewOffset.y;
    setMousePos({ x: mx, y: my });

    if (draggingNodeId) {
      setNodes(prev => prev.map(n =>
        n.id === draggingNodeId ? { ...n, x: mx - dragOffset.x, y: my - dragOffset.y } : n
      ));
    }
  }, [draggingNodeId, dragOffset, viewOffset]);

  const handleSvgMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      return;
    }

    if (pendingConnection) {
      // Check if mouse is over a port on another node
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) { setPendingConnection(null); return; }
      const mx = e.clientX - svgRect.left - viewOffset.x;
      const my = e.clientY - svgRect.top - viewOffset.y;

      // Find closest port within snap distance
      let bestMatch: { nodeId: string; port: string; isOutput: boolean } | null = null;
      let bestDist = 20; // snap radius

      for (const node of nodes) {
        if (node.id === pendingConnection.nodeId) continue;
        const template = NODE_TEMPLATES.find(t => t.type === node.type);
        if (!template) continue;

        // Check input ports
        template.inputs.forEach((name, i) => {
          const px = node.x;
          const py = node.y + getPortY(i);
          const dist = Math.hypot(mx - px, my - py);
          if (dist < bestDist && !pendingConnection.isOutput === true) {
            // pending is output, this is input — valid
          }
          if (dist < bestDist) {
            bestDist = dist;
            bestMatch = { nodeId: node.id, port: name, isOutput: false };
          }
        });

        // Check output ports
        template.outputs.forEach((name, i) => {
          const px = node.x + NODE_WIDTH;
          const py = node.y + getPortY(i);
          const dist = Math.hypot(mx - px, my - py);
          if (dist < bestDist) {
            bestDist = dist;
            bestMatch = { nodeId: node.id, port: name, isOutput: true };
          }
        });
      }

      if (bestMatch && (bestMatch as { isOutput: boolean }).isOutput !== pendingConnection.isOutput) {
        const from = pendingConnection.isOutput ? pendingConnection : bestMatch as typeof pendingConnection;
        const to = pendingConnection.isOutput ? bestMatch as typeof pendingConnection : pendingConnection;

        // Check for duplicate
        const exists = connections.some(c => c.fromNodeId === from.nodeId && c.fromPort === from.port && c.toNodeId === to.nodeId && c.toPort === to.port);
        if (!exists) {
          setConnections(prev => [...prev, {
            id: `conn_${Date.now()}`,
            fromNodeId: from.nodeId, fromPort: from.port,
            toNodeId: to.nodeId, toPort: to.port,
          }]);
          toast.success('已连接');
        }
      }

      setPendingConnection(null);
    }
  }, [pendingConnection, draggingNodeId, nodes, connections, viewOffset]);

  // Get port positions for connection lines
  const getPortPosition = useCallback((nodeId: string, portName: string, isOutput: boolean): { x: number; y: number } => {
    const node = nodes.find(n => n.id === nodeId);
    const template = node ? NODE_TEMPLATES.find(t => t.type === node.type) : null;
    if (!node || !template) return { x: 0, y: 0 };

    const ports = isOutput ? template.outputs : template.inputs;
    const idx = ports.indexOf(portName);
    if (idx === -1) return { x: node.x, y: node.y };

    return {
      x: isOutput ? node.x + NODE_WIDTH : node.x,
      y: node.y + getPortY(idx),
    };
  }, [nodes]);

  // Update node params
  const handleUpdateParams = useCallback((params: Record<string, number | string | boolean>) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, params } : n));
  }, [selectedNodeId]);

  // Delete node
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    toast.success('节点已删除');
  }, [selectedNodeId]);

  // Clear all
  const handleClear = useCallback(() => {
    setNodes([]);
    setConnections([]);
    setSelectedNodeId(null);
    toast.success('画布已清空');
  }, []);

  // Load template strategy
  const handleLoadTemplate = useCallback((templateName: string) => {
    // MA Cross template
    if (templateName === 'ma_cross') {
      const priceNode: StrategyNode = { id: 'tpl_1', type: 'price_feed', category: 'data', label: '价格数据', x: 50, y: 100, params: { symbol: 'BTC/USDT', interval: '1h' }, inputPortIds: [], outputPortIds: ['ohlcv'] };
      const fastMA: StrategyNode = { id: 'tpl_2', type: 'sma', category: 'indicator', label: 'SMA 快线', x: 300, y: 50, params: { period: 10 }, inputPortIds: ['price'], outputPortIds: ['value'] };
      const slowMA: StrategyNode = { id: 'tpl_3', type: 'sma', category: 'indicator', label: 'SMA 慢线', x: 300, y: 180, params: { period: 30 }, inputPortIds: ['price'], outputPortIds: ['value'] };
      const crossUp: StrategyNode = { id: 'tpl_4', type: 'cross_above', category: 'condition', label: '金叉', x: 550, y: 50, params: {}, inputPortIds: ['a', 'b'], outputPortIds: ['signal'] };
      const crossDown: StrategyNode = { id: 'tpl_5', type: 'cross_below', category: 'condition', label: '死叉', x: 550, y: 180, params: {}, inputPortIds: ['a', 'b'], outputPortIds: ['signal'] };
      const buyAction: StrategyNode = { id: 'tpl_6', type: 'buy', category: 'action', label: '买入', x: 780, y: 50, params: { positionSize: 0.2, orderType: 'market' }, inputPortIds: ['trigger'], outputPortIds: [] };
      const sellAction: StrategyNode = { id: 'tpl_7', type: 'sell', category: 'action', label: '卖出', x: 780, y: 180, params: { positionSize: 1.0, orderType: 'market' }, inputPortIds: ['trigger'], outputPortIds: [] };
      const stopLoss: StrategyNode = { id: 'tpl_8', type: 'stop_loss', category: 'risk', label: '止损', x: 780, y: 310, params: { percent: 3 }, inputPortIds: ['position'], outputPortIds: ['trigger'] };

      setNodes([priceNode, fastMA, slowMA, crossUp, crossDown, buyAction, sellAction, stopLoss]);
      setConnections([
        { id: 'c1', fromNodeId: 'tpl_1', fromPort: 'ohlcv', toNodeId: 'tpl_2', toPort: 'price' },
        { id: 'c2', fromNodeId: 'tpl_1', fromPort: 'ohlcv', toNodeId: 'tpl_3', toPort: 'price' },
        { id: 'c3', fromNodeId: 'tpl_2', fromPort: 'value', toNodeId: 'tpl_4', toPort: 'a' },
        { id: 'c4', fromNodeId: 'tpl_3', fromPort: 'value', toNodeId: 'tpl_4', toPort: 'b' },
        { id: 'c5', fromNodeId: 'tpl_2', fromPort: 'value', toNodeId: 'tpl_5', toPort: 'a' },
        { id: 'c6', fromNodeId: 'tpl_3', fromPort: 'value', toNodeId: 'tpl_5', toPort: 'b' },
        { id: 'c7', fromNodeId: 'tpl_4', fromPort: 'signal', toNodeId: 'tpl_6', toPort: 'trigger' },
        { id: 'c8', fromNodeId: 'tpl_5', fromPort: 'signal', toNodeId: 'tpl_7', toPort: 'trigger' },
      ]);
      setSelectedNodeId(null);
      toast.success('已加载: 双均线交叉模板');
    }
  }, []);

  const generatedCode = useMemo(() => generateCode(nodes, connections), [nodes, connections]);

  const filteredTemplates = NODE_TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <Card className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#38B2AC] animate-pulse" />
            可视化策略构建器
          </span>
          <span className="text-[10px] text-[#8892B0]">
            {nodes.length} 节点 · {connections.length} 连接
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleLoadTemplate('ma_cross')} className="px-2 py-1 bg-[#112240] border border-[#233554] text-[10px] text-[#4299E1] rounded hover:bg-[#1A2B47]">
            加载模板
          </button>
          <button onClick={() => setShowCode(!showCode)} className="px-2 py-1 bg-[#112240] border border-[#233554] text-[10px] text-[#ECC94B] rounded hover:bg-[#1A2B47]">
            {showCode ? '隐藏代码' : '查看代码'}
          </button>
          <button onClick={handleClear} className="px-2 py-1 bg-[#F56565]/10 text-[10px] text-[#F56565] rounded hover:bg-[#F56565]/20">清空</button>
        </div>
      </Card>

      <div className="flex flex-1 gap-3 min-h-0">
        {/* Left: Node Palette */}
        <div className="w-48 shrink-0 flex flex-col gap-2">
          <Card className="p-2 flex-1 overflow-auto">
            <div className="flex flex-wrap gap-1 mb-2">
              {(Object.keys(CATEGORY_LABELS) as NodeCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[9px] transition-colors ${activeCategory === cat
                    ? `text-white`
                    : 'text-[#8892B0] hover:text-[#CCD6F6]'
                    }`}
                  style={activeCategory === cat ? { backgroundColor: `${CATEGORY_COLORS[cat]}30`, color: CATEGORY_COLORS[cat] } : {}}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              {filteredTemplates.map(t => (
                <button
                  key={t.type}
                  onClick={() => handleAddNode(t)}
                  className="w-full text-left p-2 rounded bg-[#0A192F] border border-[#233554]/30 hover:border-[#233554] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{t.icon}</span>
                    <span className="text-[10px] text-[#CCD6F6] group-hover:text-white">{t.label}</span>
                  </div>
                  <p className="text-[8px] text-[#8892B0] mt-0.5 pl-5">{t.description}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <Card className="flex-1 p-0 overflow-hidden relative bg-[#071425]">
            {/* Grid pattern background */}
            <svg
              ref={svgRef}
              className="w-full h-full"
              style={{ minHeight: 400 }}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onMouseLeave={() => { setDraggingNodeId(null); setPendingConnection(null); }}
              onClick={(e) => { if (e.target === svgRef.current) setSelectedNodeId(null); }}
            >
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="0.5" fill="#233554" opacity="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              <g transform={`translate(${viewOffset.x}, ${viewOffset.y})`}>
                {/* Connection lines */}
                {connections.map(conn => {
                  const from = getPortPosition(conn.fromNodeId, conn.fromPort, true);
                  const to = getPortPosition(conn.toNodeId, conn.toPort, false);
                  const fromNode = nodes.find(n => n.id === conn.fromNodeId);
                  const color = fromNode ? CATEGORY_COLORS[fromNode.category] : '#8892B0';
                  return <ConnectionLine key={conn.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} color={color} />;
                })}

                {/* Pending connection line */}
                {pendingConnection && (
                  <ConnectionLine
                    x1={pendingConnection.x} y1={pendingConnection.y}
                    x2={mousePos.x} y2={mousePos.y}
                    color="#8892B0"
                  />
                )}

                {/* Nodes */}
                {nodes.map(node => {
                  const template = NODE_TEMPLATES.find(t => t.type === node.type);
                  if (!template) return null;
                  return (
                    <NodeView
                      key={node.id}
                      node={node}
                      template={template}
                      isSelected={selectedNodeId === node.id}
                      onSelect={() => setSelectedNodeId(node.id)}
                      onDragStart={(e) => handleNodeDragStart(node.id, e)}
                      onPortMouseDown={handlePortMouseDown}
                    />
                  );
                })}
              </g>

              {/* Empty state */}
              {nodes.length === 0 && (
                <text x="50%" y="50%" textAnchor="middle" fill="#8892B0" fontSize={13} fontFamily="sans-serif">
                  从左侧面板选择节点添加到画布，或点击「加载模板」快速开始
                </text>
              )}
            </svg>
          </Card>

          {/* Code Preview */}
          {showCode && (
            <Card className="p-3 max-h-48 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[#ECC94B]">生成代码预览</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success('代码已复制'); }}
                  className="text-[9px] text-[#4299E1] hover:underline"
                >
                  复制
                </button>
              </div>
              <pre className="text-[9px] font-mono text-[#CCD6F6] whitespace-pre-wrap leading-relaxed">
                {generatedCode}
              </pre>
            </Card>
          )}
        </div>

        {/* Right: Property Panel */}
        <div className="w-52 shrink-0">
          <Card className="p-3 h-full overflow-auto">
            {selectedNode && selectedTemplate ? (
              <ParamEditor
                node={selectedNode}
                template={selectedTemplate}
                onUpdate={handleUpdateParams}
                onDelete={() => handleDeleteNode(selectedNode.id)}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-[10px] text-[#8892B0]">选择节点查看属性</p>
                <p className="text-[9px] text-[#233554] mt-1">点击画布节点或从左侧添加</p>
              </div>
            )}

            {/* Connection list */}
            {connections.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#233554]/50">
                <h4 className="text-[10px] text-[#8892B0] mb-2">连接 ({connections.length})</h4>
                <div className="space-y-1">
                  {connections.map(c => {
                    const fromNode = nodes.find(n => n.id === c.fromNodeId);
                    const toNode = nodes.find(n => n.id === c.toNodeId);
                    return (
                      <div key={c.id} className="flex items-center justify-between p-1.5 bg-[#0A192F] rounded text-[8px]">
                        <span className="text-[#CCD6F6]">{fromNode?.label}.{c.fromPort} → {toNode?.label}.{c.toPort}</span>
                        <button
                          onClick={() => setConnections(prev => prev.filter(cc => cc.id !== c.id))}
                          className="text-[#F56565] hover:underline"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
