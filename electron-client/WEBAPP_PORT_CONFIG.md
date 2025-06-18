# Webapp 端口配置说明

## 端口配置

根据您的配置，webapp应该运行在 **8440** 端口，而不是默认的3000端口。

## 配置方法

### 方法1: 使用环境变量 (推荐)

在webapp目录下创建 `.env` 文件：

```bash
# 在 webapp 目录下
echo "PORT=8440" > .env
```

### 方法2: 使用package.json scripts

修改 `webapp/package.json` 中的启动脚本：

```json
{
  "scripts": {
    "start": "PORT=8440 react-scripts start",
    "start:8440": "PORT=8440 react-scripts start"
  }
}
```

### 方法3: 直接在命令行指定

```bash
# Windows PowerShell
$env:PORT=8440; npm start

# Windows CMD  
set PORT=8440 && npm start

# Linux/macOS
PORT=8440 npm start
```

## 验证配置

启动webapp后，应该看到类似输出：
```
Local:            http://localhost:8440
On Your Network:  http://192.168.x.x:8440
```

## webapi CORS配置

webapi已经配置了8440端口的CORS支持：

```json
"AllowedOrigins": [
  "http://localhost:8440",
  "https://localhost:8440",
  "http://localhost:8080",
  "https://localhost:8080"
]
```

## 自动启动脚本

使用提供的启动脚本会自动配置正确的端口：

```powershell
# 启动完整应用（webapp + electron）
.\start-with-webapp.ps1

# 仅启动webapp在8440端口
.\start-with-webapp.ps1 -WebappOnly
```

## 故障排除

1. **端口被占用**: 检查8440端口是否被其他程序使用
   ```powershell
   netstat -an | findstr 8440
   ```

2. **CORS错误**: 确保webapi的AllowedOrigins包含8440端口

3. **连接失败**: 检查防火墙设置，确保8440端口可访问 