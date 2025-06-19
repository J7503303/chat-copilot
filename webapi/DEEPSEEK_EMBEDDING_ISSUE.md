# DeepSeek API Embedding 问题说明

## 问题描述

在使用 Chat Copilot 时遇到以下错误：
```
Microsoft.SemanticKernel.HttpOperationException: Service request failed.
Status: 404 (Not Found)
```

## 根本原因

**DeepSeek API 目前不支持 embedding 功能**。

根据 DeepSeek 官方文档和社区反馈：
- DeepSeek API 目前只支持 chat completion 功能
- Embedding 功能在开发计划中，但尚未发布
- 错误的 404 状态码表明 `text-embedding-3-small` 模型在 DeepSeek API 上不存在

## 解决方案

### 方案1：使用 OpenAI API 处理 Embedding（推荐）

修改 `appsettings.json` 中的配置：

```json
"OpenAI": {
  "TextModel": "deepseek-chat",
  "EmbeddingModel": "text-embedding-ada-002",
  "EmbeddingModelMaxTokenTotal": 8191,
  "APIKey": "your-openai-api-key-here", // 使用 OpenAI API Key
  "Endpoint": "https://api.openai.com/v1", // 使用 OpenAI 端点
  "OrgId": "",
  "MaxRetries": 10,
  "MaxEmbeddingBatchSize": 100
}
```

**注意**：这种方案需要：
1. 申请 OpenAI API Key
2. Text completion 使用 DeepSeek，embedding 使用 OpenAI
3. 会产生 OpenAI API 费用

### 方案2：使用本地 Ollama + DeepSeek 模型

1. 安装 Ollama
2. 下载 DeepSeek 模型和 embedding 模型：
   ```bash
   ollama pull deepseek-chat
   ollama pull nomic-embed-text
   ```
3. 修改配置使用 Ollama 服务

### 方案3：禁用 Embedding 功能

如果不需要文档搜索和记忆功能，可以临时禁用 embedding：

```json
"KernelMemory": {
  "DataIngestion": {
    "EmbeddingGeneratorTypes": []
  },
  "Retrieval": {
    "EmbeddingGeneratorType": "None"
  }
}
```

## 当前状态

- DeepSeek API 仅支持 chat completion
- Embedding 功能正在开发中
- 建议使用方案1（OpenAI embedding）作为临时解决方案

## 更新建议

定期检查 DeepSeek API 文档，一旦支持 embedding 功能，可以切换回纯 DeepSeek 配置。 