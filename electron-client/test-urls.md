# 浏览器测试URL

请在启动Electron应用后，在浏览器中依次访问以下URL来测试参数传递功能：

## 1. 基本状态检查
```
http://localhost:19876/api/status
```

## 2. 基本参数测试
```
http://localhost:19876/api/v1/navigate?page=chat&doctor_name=张医生&dept_name=心内科&patient_name=李患者
```

## 3. 完整参数测试（包含床号）
```
http://localhost:19876/api/v1/navigate?page=diagnosis&doctor_id=D001&doctor_name=王主任&dept_name=心血管内科&patient_id=P001&patient_name=赵患者&patient_bed=201&patient_sex=女&patient_age=35
```

## 4. 中文参数测试
```
http://localhost:19876/api/v1/navigate?page=record&doctor_name=李主任医师&dept_name=神经内科病区&patient_name=陈大爷&patient_bed=308床&patient_sex=男&patient_age=68
```

## 5. 只有患者信息测试
```
http://localhost:19876/api/v1/navigate?patient_name=孙女士&patient_bed=105&patient_sex=女&patient_age=42
```

## 6. 超长床号测试
```
http://localhost:19876/api/v1/navigate?page=chat&patient_name=张患者&patient_bed=ICU-VIP-A-001-SPECIAL&dept_name=外科&doctor_name=王医生
```

## 7. 清空信息测试（重置为默认状态）
```
http://localhost:19876/api/v1/navigate?page=chat
```

## 检查要点

访问每个URL后，请检查：

1. **应用程序是否正常激活和显示**
2. **右侧底部患者信息区域是否更新**：
   - 床号：横向显示在患者姓名上方（如果有床位信息）
   - 第一行：患者姓名（竖向） | 科室名称（竖向）
   - 第二行：性别、年龄（如果有，不再包含床位）
   - 第三行：医生姓名
3. **页面是否正确切换**（如果指定了page参数）
4. **浏览器是否返回成功的JSON响应**

## 预期界面显示效果

### 测试1完成后应显示：
- 返回JSON状态信息，界面保持默认状态：
  - 患者姓名：未知患者
  - 科室：（留空）
  - 医生：（留空）

### 测试2完成后应显示：
- 患者姓名：李患者
- 科室：心内科  
- 医生：张医生

### 测试3完成后应显示：
- 床号：201床（横向显示在患者姓名上方）
- 患者姓名：赵患者（竖向显示）
- 科室：心血管内科
- 患者详情：女 | 35岁（不再包含床位信息）
- 医生：王主任

### 测试4完成后应显示：
- 床号：308床（横向显示在患者姓名上方）
- 患者姓名：陈大爷（竖向显示）
- 科室：神经内科病区
- 患者详情：男 | 68岁（不再包含床位信息）
- 医生：李主任医师

### 测试5完成后应显示：
- 床号：105床（横向显示在患者姓名上方）
- 患者姓名：孙女士（竖向显示）
- 科室：（保持之前的值或留空）
- 患者详情：女 | 42岁（不再包含床位信息）
- 医生：（保持之前的值或留空）

### 测试6完成后应显示：
- 床号：ICU-VIP-A-001-SPECIAL床（横向显示，支持长床号）
- 患者姓名：张患者（竖向显示）
- 科室：外科
- 医生：王医生

### 测试7完成后应显示：
- 患者姓名：未知患者（因为没有传入patient_name）
- 科室：（留空）
- 患者详情：（隐藏，因为没有详细信息）
- 医生：（留空）

## 调试信息

如果参数没有正确显示，请：
1. 打开浏览器开发者工具（F12）
2. 查看Console标签页
3. 寻找"收到导航参数"和"更新后的上下文信息"的日志输出
4. 检查是否有JavaScript错误 