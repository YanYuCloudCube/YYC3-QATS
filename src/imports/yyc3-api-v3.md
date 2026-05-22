---
file: src/imports/yyc3-api-v3.md
description: YYC3 API v3.0 全功能完整版文档，包含 LLM API 集成、WebSocket 实时推送、REST 设备管理和系统接口的完整说明
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-03-20
updated: 2026-03-20
status: stable
tags: api,documentation,websocket,rest,public
category: api
language: zh-CN
---

# YYC³ API v3.0 全功能完整版

**日期**: 2026-03-02  
**版本**: 3.0.0-FULL  
**状态**: ✅ 生产就绪

---

## 🎉 核心功能

### 1. LLM API 集成 ✅

**支持供应商**:
- ✅ Qwen (通义千问 - 灵积) - 已配置
- ✅ Zhipu Plan (Z.ai 国际平台) - 已配置
- ✅ Zhipu AI (Z.ai 国内平台) - 占位符
- ✅ Ollama (本地部署) - 自动识别
- ✅ OpenAI (统一认证) - 占位符
- ✅ DeepSeek (深度求索) - 占位符
- ✅ 百度文心一言 - 占位符

### 2. WebSocket 实时推送 ✅

**端点**: `ws://localhost:10086/ws`

**功能**:
- ✅ 实时连接管理
- ✅ 频道订阅
- ✅ AI 响应广播
- ✅ 设备控制广播
- ✅ 心跳检测

### 3. REST 设备管理 ✅

**端点**:
- `GET /api/v1/devices` - 设备列表
- `GET /api/v1/devices/:id` - 设备详情
- `POST /api/v1/devices/:id/control` - 设备控制
- `GET /api/v1/devices/:id/status` - 设备状态

### 4. 系统接口 ✅

- `GET /health` - 健康检查
- `GET /api/v1/status` - 系统状态
- `GET /api/v1/ws/clients` - WebSocket 客户端

---

## ✅ 测试结果

### 健康检查 ✅

```bash
curl http://localhost:10086/health
```

**响应**:
```json
{
  "status": "ok",
  "service": "yyc3_aify",
  "server": "yyc3-33",
  "version": "3.0.0-full",
  "port": "10086",
  "websocket": "enabled",
  "email": "admin@0379.email"
}
```

### 设备列表 ✅

```bash
curl http://localhost:10086/api/v1/devices
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "nas-45",
      "name": "YanYuCloud NAS",
      "type": "storage",
      "host": "192.168.3.45",
      "port": 9557,
      "status": "online"
    },
    {
      "id": "yyc3-33",
      "name": "Aliyun ECS-33",
      "type": "compute",
      "host": "8.152.195.33",
      "port": 22,
      "status": "online"
    },
    {
      "id": "yyc3-125",
      "name": "Aliyun ECS-125",
      "type": "compute",
      "host": "123.56.43.125",
      "port": 22,
      "status": "online"
    }
  ]
}
```

### WebSocket 客户端 ✅

```bash
curl http://localhost:10086/api/v1/ws/clients
```

**响应**:
```json
{"success":true,"count":0,"clients":[]}
```

---

## 🔧 使用示例

### LLM API 调用

```bash
# Qwen
curl -X POST http://localhost:10086/api/v1/llm/qwen/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'

# Zhipu Plan
curl -X POST http://localhost:10086/api/v1/llm/zhipu_plan/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'

# Ollama (自动识别模型)
curl -X POST http://localhost:10086/api/v1/llm/ollama/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
```

### 设备控制

```bash
# 控制设备
curl -X POST http://localhost:10086/api/v1/devices/yyc3-33/control \
  -H "Content-Type: application/json" \
  -d '{"action":"restart","params":{}}'

# WebSocket 会收到广播:
# {"type":"broadcast","channel":"device","data":{"type":"control","deviceId":"yyc3-33","action":"restart","params":{},"result":{...}}}
```

### WebSocket 连接

```javascript
const ws = new WebSocket('ws://localhost:10086/ws');

ws.onopen = () => {
  console.log('Connected!');
  // 订阅频道
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'ai' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// 心跳
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);
```

---

## 📋 完整 API 端点

### LLM API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/llm/providers` | GET | 获取所有供应商 |
| `/api/v1/llm/ollama/models` | GET | 获取 Ollama 可用模型 |
| `/api/v1/llm/:provider/chat` | POST | 对话接口 |

### 设备管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/devices` | GET | 设备列表 |
| `/api/v1/devices/:id` | GET | 设备详情 |
| `/api/v1/devices/:id/control` | POST | 设备控制 |
| `/api/v1/devices/:id/status` | GET | 设备状态 |

### WebSocket

| 端点 | 说明 |
|------|------|
| `ws://:10086/ws` | WebSocket 主端点 |
| `/api/v1/ws/clients` | 获取 WebSocket 客户端列表 |

### 系统

| 端点 | 说明 |
|------|------|
| `/health` | 健康检查 |
| `/api/v1/status` | 系统状态 |
| `/api/v1/models` | 模型列表 |

---

## 🎯 配置信息

### 端口：10086

您的电话尾号，易记且专属！

### 邮箱：admin@0379.email

系统联系邮箱

### 服务器：yyc3-33

阿里云 ECS (8.152.195.33)

---

## 📚 保留文档

当前目录保留以下核心文档：

1. `README.md` - 项目总览
2. `API 多功能集成完成报告.md` - 功能集成报告
3. `API v3.0 全功能完整版.md` - 本文档

其他历史文档已归档到 `_archive/` 目录

---

<div align="center">

**YYC³ API v3.0 全功能完整版**

*言启象限 | 语枢未来*

**版本**: 3.0.0-FULL  
**端口**: 10086  
**邮箱**: admin@0379.email  
**WebSocket**: ✅ 已启用  
**设备管理**: ✅ 已启用  
**LLM API**: ✅ 7 家供应商

**日期**: 2026-03-02

✅ 生产就绪

</div>
