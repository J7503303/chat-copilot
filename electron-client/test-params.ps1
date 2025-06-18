# 参数传递测试脚本
# 用于测试医疗AI助手的参数接收和显示功能

$baseUrl = "http://localhost:19876"

Write-Host "=== 医疗AI助手 参数传递测试 ===" -ForegroundColor Green
Write-Host ""

# 测试用例1: 基本参数
Write-Host "1. 测试基本参数传递..." -ForegroundColor Yellow
try {
    $params = @{
        page = "chat"
        doctor_name = "张医生"
        dept_name = "心内科"
        patient_name = "李患者"
    }
    
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Web.HttpUtility]::UrlEncode($_.Value))" }) -join "&"
    $url = "$baseUrl/api/v1/navigate?$queryString"
    
    Write-Host "调用URL: $url" -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 5
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "✓ 基本参数测试成功" -ForegroundColor Green
        Write-Host "  当前页面: $($result.data.current_page)" -ForegroundColor Gray
        Write-Host "  医生信息: $($result.data.received_params.doctor.name)" -ForegroundColor Gray
        Write-Host "  科室信息: $($result.data.received_params.department.name)" -ForegroundColor Gray
        Write-Host "  患者信息: $($result.data.received_params.patient.name)" -ForegroundColor Gray
    } else {
        Write-Host "✗ 基本参数测试失败: $($result.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 基本参数测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 测试用例2: 完整参数
Write-Host "2. 测试完整参数传递..." -ForegroundColor Yellow
try {
    $params = @{
        page = "diagnosis"
        doctor_id = "D001"
        doctor_code = "DOC001"
        doctor_name = "王主任"
        dept_id = "DEPT001"
        dept_code = "CARD"
        dept_name = "心血管内科"
        patient_id = "P001"
        patient_name = "赵患者"
        patient_bed = "201"
        patient_sex = "女"
        patient_age = "35"
        window_mode = "full"
    }
    
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Web.HttpUtility]::UrlEncode($_.Value))" }) -join "&"
    $url = "$baseUrl/api/v1/navigate?$queryString"
    
    Write-Host "调用URL: $url" -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 5
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "✓ 完整参数测试成功" -ForegroundColor Green
        Write-Host "  当前页面: $($result.data.current_page)" -ForegroundColor Gray
        Write-Host "  窗口模式: $($result.data.window_mode)" -ForegroundColor Gray
        Write-Host "  接收参数详情:" -ForegroundColor Gray
        
        if ($result.data.received_params.doctor) {
            Write-Host "    医生 - ID: $($result.data.received_params.doctor.id), 编码: $($result.data.received_params.doctor.code), 姓名: $($result.data.received_params.doctor.name)" -ForegroundColor DarkGray
        }
        
        if ($result.data.received_params.department) {
            Write-Host "    科室 - ID: $($result.data.received_params.department.id), 编码: $($result.data.received_params.department.code), 名称: $($result.data.received_params.department.name)" -ForegroundColor DarkGray
        }
        
        if ($result.data.received_params.patient) {
            Write-Host "    患者 - ID: $($result.data.received_params.patient.id), 姓名: $($result.data.received_params.patient.name), 床位: $($result.data.received_params.patient.bed), 性别: $($result.data.received_params.patient.sex), 年龄: $($result.data.received_params.patient.age)" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "✗ 完整参数测试失败: $($result.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 完整参数测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 测试用例3: 中文参数
Write-Host "3. 测试中文参数传递..." -ForegroundColor Yellow
try {
    $params = @{
        page = "record"
        doctor_name = "李主任医师"
        dept_name = "神经内科病区"
        patient_name = "陈大爷"
        patient_bed = "308床"
        patient_sex = "男"
        patient_age = "68"
    }
    
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Web.HttpUtility]::UrlEncode($_.Value))" }) -join "&"
    $url = "$baseUrl/api/v1/navigate?$queryString"
    
    Write-Host "调用URL: $url" -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 5
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "✓ 中文参数测试成功" -ForegroundColor Green
        Write-Host "  医生: $($result.data.received_params.doctor.name)" -ForegroundColor Gray
        Write-Host "  科室: $($result.data.received_params.department.name)" -ForegroundColor Gray
        Write-Host "  患者: $($result.data.received_params.patient.name) ($($result.data.received_params.patient.sex), $($result.data.received_params.patient.age)岁, $($result.data.received_params.patient.bed))" -ForegroundColor Gray
    } else {
        Write-Host "✗ 中文参数测试失败: $($result.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 中文参数测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 测试用例4: 只有患者信息
Write-Host "4. 测试只传患者信息..." -ForegroundColor Yellow
try {
    $params = @{
        patient_name = "孙女士"
        patient_bed = "105"
        patient_sex = "女"
        patient_age = "42"
    }
    
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Web.HttpUtility]::UrlEncode($_.Value))" }) -join "&"
    $url = "$baseUrl/api/v1/navigate?$queryString"
    
    Write-Host "调用URL: $url" -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 5
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "✓ 患者信息测试成功" -ForegroundColor Green
        Write-Host "  患者: $($result.data.received_params.patient.name) ($($result.data.received_params.patient.sex), $($result.data.received_params.patient.age)岁, 床位$($result.data.received_params.patient.bed))" -ForegroundColor Gray
    } else {
        Write-Host "✗ 患者信息测试失败: $($result.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 患者信息测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 测试用例5: 清空信息测试
Write-Host "5. 测试清空信息（重置为默认状态）..." -ForegroundColor Yellow
try {
    $url = "$baseUrl/api/v1/navigate?page=chat"
    
    Write-Host "调用URL: $url" -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 5
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "✓ 清空信息测试成功" -ForegroundColor Green
        Write-Host "  当前页面: $($result.data.current_page)" -ForegroundColor Gray
        Write-Host "  接收参数: 无（应该清空之前的信息）" -ForegroundColor Gray
    } else {
        Write-Host "✗ 清空信息测试失败: $($result.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 清空信息测试异常: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "请检查应用程序界面右侧底部是否正确显示了传入的信息:" -ForegroundColor Yellow
Write-Host "- 患者姓名应显示在第一行（未传入时显示'未知患者'）" -ForegroundColor Cyan
Write-Host "- 科室名称应显示在第一行右侧（未传入时留空）" -ForegroundColor Cyan
Write-Host "- 床位、性别、年龄应显示在第二行（如果有，否则隐藏该行）" -ForegroundColor Cyan
Write-Host "- 医生姓名应显示在第三行（未传入时留空）" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Yellow
Write-Host "注意：只有患者姓名在未传入时显示默认值，其他信息未传入时留空，避免误解" -ForegroundColor Yellow 