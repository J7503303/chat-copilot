// 系统兼容性检测模块

const os = require('os');
const { dialog } = require('electron');

class SystemCompatibilityChecker {
  constructor() {
    this.platform = os.platform();
    this.release = os.release();
    this.arch = os.arch();
  }

  // 检查Windows版本兼容性
  checkWindowsCompatibility() {
    if (this.platform !== 'win32') {
      return { compatible: true, message: '非Windows系统' };
    }

    const version = this.release;
    const major = parseInt(version.split('.')[0]);
    const minor = parseInt(version.split('.')[1]);
    const build = parseInt(version.split('.')[2]);

    // Windows 10 1809 (Build 17763) 或更高
    if (major >= 10 && build >= 17763) {
      return {
        compatible: true,
        message: `Windows ${major}.${minor}.${build} - 完全兼容`
      };
    }

    // Windows 10 早期版本
    if (major === 10 && build < 17763) {
      return {
        compatible: false,
        message: `Windows 10 Build ${build} - 需要更新到1809或更高版本`
      };
    }

    // Windows 8.1 或更早
    if (major < 10) {
      return {
        compatible: false,
        message: `Windows ${major}.${minor} - 不支持，需要Windows 10或更高版本`
      };
    }

    return { compatible: false, message: '未知Windows版本' };
  }

  // 检查系统架构
  checkArchitecture() {
    const supportedArchs = ['x64', 'arm64'];
    return {
      compatible: supportedArchs.includes(this.arch),
      message: `系统架构: ${this.arch} ${supportedArchs.includes(this.arch) ? '(支持)' : '(不支持)'}`
    };
  }

  // 检查内存
  checkMemory() {
    const totalMemoryGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    const minRequiredGB = 4;

    return {
      compatible: totalMemoryGB >= minRequiredGB,
      message: `系统内存: ${totalMemoryGB}GB ${totalMemoryGB >= minRequiredGB ? '(充足)' : '(不足，建议4GB以上)'}`
    };
  }

  // 获取系统信息
  getSystemInfo() {
    return {
      platform: this.platform,
      release: this.release,
      arch: this.arch,
      hostname: os.hostname(),
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + 'GB',
      freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + 'GB',
      cpus: os.cpus().length + ' cores',
      uptime: Math.round(os.uptime() / 3600) + ' hours'
    };
  }

  // 执行完整兼容性检查
  performFullCheck() {
    const results = {
      windows: this.checkWindowsCompatibility(),
      arch: this.checkArchitecture(),
      memory: this.checkMemory(),
      systemInfo: this.getSystemInfo()
    };

    const allCompatible = results.windows.compatible &&
      results.arch.compatible &&
      results.memory.compatible;

    return {
      compatible: allCompatible,
      results: results,
      summary: this.generateSummary(results)
    };
  }

  // 生成兼容性摘要
  generateSummary(results) {
    const issues = [];
    const info = [];

    if (!results.windows.compatible) {
      issues.push(`❌ ${results.windows.message}`);
    } else {
      info.push(`✅ ${results.windows.message}`);
    }

    if (!results.arch.compatible) {
      issues.push(`❌ ${results.arch.message}`);
    } else {
      info.push(`✅ ${results.arch.message}`);
    }

    if (!results.memory.compatible) {
      issues.push(`⚠️ ${results.memory.message}`);
    } else {
      info.push(`✅ ${results.memory.message}`);
    }

    return {
      issues: issues,
      info: info,
      hasIssues: issues.length > 0
    };
  }

  // 显示兼容性对话框
  async showCompatibilityDialog(mainWindow = null) {
    const checkResult = this.performFullCheck();
    const summary = checkResult.summary;

    let message = '系统兼容性检查结果：\n\n';

    if (summary.info.length > 0) {
      message += '✅ 兼容项目：\n';
      summary.info.forEach(item => {
        message += `  ${item}\n`;
      });
      message += '\n';
    }

    if (summary.issues.length > 0) {
      message += '❌ 兼容性问题：\n';
      summary.issues.forEach(item => {
        message += `  ${item}\n`;
      });
      message += '\n';
    }

    message += `系统信息：\n`;
    message += `  平台: ${checkResult.results.systemInfo.platform}\n`;
    message += `  版本: ${checkResult.results.systemInfo.release}\n`;
    message += `  架构: ${checkResult.results.systemInfo.arch}\n`;
    message += `  内存: ${checkResult.results.systemInfo.totalMemory}\n`;
    message += `  CPU: ${checkResult.results.systemInfo.cpus}\n`;

    const dialogOptions = {
      type: summary.hasIssues ? 'warning' : 'info',
      title: '系统兼容性检查',
      message: message,
      buttons: summary.hasIssues ? ['继续运行', '退出'] : ['确定']
    };

    if (mainWindow) {
      const result = await dialog.showMessageBox(mainWindow, dialogOptions);
      return { continue: result.response === 0, checkResult };
    } else {
      const result = await dialog.showMessageBox(dialogOptions);
      return { continue: result.response === 0, checkResult };
    }
  }
}

module.exports = SystemCompatibilityChecker; 