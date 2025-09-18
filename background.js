/**
 * HTML转PDF电子书生成器 - 后台服务脚本
 * 
 * 这是Chrome扩展的后台服务worker，类似于系统服务进程
 * 主要功能：
 * 1. 处理扩展生命周期事件
 * 2. 管理跨标签页通信
 * 3. 处理文件下载和存储
 * 4. 提供API接口给其他组件
 */

class PDFGeneratorBackground {
  constructor() {
    this.activeGenerations = new Map(); // 记录正在进行的生成任务
    this.settings = {};
    this.init();
  }
  
  init() {
    // 监听扩展安装和启动事件
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstalled(details);
    });
    
    // 监听消息传递
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持异步响应通道
    });
    
    // 监听下载事件
    if (chrome.downloads) {
      chrome.downloads.onChanged.addListener((delta) => {
        this.handleDownloadChanged(delta);
      });
    }
    
    console.log('PDF生成器后台服务已启动');
  }
  
  /**
   * 处理扩展安装事件
   * 类似于应用程序的首次启动初始化
   */
  handleInstalled(details) {
    console.log('扩展安装详情:', details);
    
    switch (details.reason) {
      case 'install':
        this.handleFirstInstall();
        break;
      case 'update':
        this.handleUpdate(details.previousVersion);
        break;
      case 'browser_update':
        console.log('浏览器更新');
        break;
    }
  }
  
  handleFirstInstall() {
    // 首次安装时的初始化操作
    const defaultSettings = {
      defaultPageSize: 'a4',
      defaultAuthor: '',
      includeImages: true,
      includeToc: true,
      includeLinks: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB限制
      created: Date.now()
    };
    
    // 存储默认设置
    chrome.storage.local.set({ 
      pdfGeneratorSettings: defaultSettings,
      statisticsData: {
        totalGenerated: 0,
        totalSize: 0,
        lastUsed: Date.now()
      }
    });
    
    console.log('首次安装完成，已设置默认配置');
  }
  
  handleUpdate(previousVersion) {
    console.log(`从版本 ${previousVersion} 更新到当前版本`);
    
    // 这里可以处理版本迁移逻辑
    // 例如：配置文件格式更新、数据迁移等
  }
  
  /**
   * 处理来自其他组件的消息
   */
  async handleMessage(message, sender, sendResponse) {
    console.log('收到消息:', message.action, '来自:', sender.tab?.url);
    
    try {
      switch (message.action) {
        case 'startGeneration':
          await this.startGeneration(message.data, sender);
          sendResponse({ success: true });
          break;
          
        case 'getGenerationStatus':
          const status = this.getGenerationStatus(message.taskId);
          sendResponse({ status });
          break;
          
        case 'cancelGeneration':
          this.cancelGeneration(message.taskId);
          sendResponse({ success: true });
          break;
          
        case 'getStatistics':
          const stats = await this.getStatistics();
          sendResponse({ statistics: stats });
          break;
          
        case 'updateSettings':
          await this.updateSettings(message.settings);
          sendResponse({ success: true });
          break;
          
        case 'exportSettings':
          const settings = await this.exportSettings();
          sendResponse({ settings });
          break;
          
        case 'importSettings':
          await this.importSettings(message.settings);
          sendResponse({ success: true });
          break;
          
        case 'fetchPage':
          try {
            const pageData = await this.fetchPage(message.url);
            sendResponse(pageData);
          } catch (error) {
            console.error('fetchPage error:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
          
        default:
          console.log('未知消息类型:', message.action);
          sendResponse({ error: '未知操作类型' });
          break;
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ error: error.message });
    }
  }
  
  /**
   * 开始PDF生成任务
   * 实现任务队列管理，避免同时进行太多生成任务
   */
  async startGeneration(data, sender) {
    const taskId = this.generateTaskId();
    const task = {
      id: taskId,
      tabId: sender.tab.id,
      url: sender.tab.url,
      title: data.title,
      status: 'preparing',
      progress: 0,
      startTime: Date.now(),
      options: data.options
    };
    
    this.activeGenerations.set(taskId, task);
    
    try {
      // 通知开始生成
      await chrome.tabs.sendMessage(sender.tab.id, {
        action: 'startPDFGeneration',
        taskId: taskId,
        options: data.options
      });
      
      // 更新统计信息
      await this.updateStatistics();
      
    } catch (error) {
      this.activeGenerations.delete(taskId);
      throw error;
    }
  }
  
  getGenerationStatus(taskId) {
    const task = this.activeGenerations.get(taskId);
    return task ? {
      status: task.status,
      progress: task.progress,
      elapsed: Date.now() - task.startTime
    } : null;
  }
  
  cancelGeneration(taskId) {
    const task = this.activeGenerations.get(taskId);
    if (task) {
      task.status = 'cancelled';
      this.activeGenerations.delete(taskId);
      
      // 通知相关标签页取消生成
      chrome.tabs.sendMessage(task.tabId, {
        action: 'cancelPDFGeneration',
        taskId: taskId
      }).catch(err => {
        console.log('通知取消失败，标签页可能已关闭');
      });
    }
  }
  
  /**
   * 处理下载状态变化
   * 监控PDF文件的下载进度
   */
  handleDownloadChanged(delta) {
    if (delta.state && delta.state.current === 'complete') {
      console.log('PDF下载完成:', delta.id);
      
      // 这里可以添加下载完成后的处理逻辑
      // 例如：更新统计信息、清理临时文件等
    }
    
    if (delta.error) {
      console.error('PDF下载失败:', delta.error);
    }
  }
  
  /**
   * 获取使用统计信息
   */
  async getStatistics() {
    try {
      const result = await chrome.storage.local.get('statisticsData');
      return result.statisticsData || {
        totalGenerated: 0,
        totalSize: 0,
        lastUsed: 0
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return {};
    }
  }
  
  /**
   * 更新使用统计信息
   */
  async updateStatistics(increment = {}) {
    try {
      const stats = await this.getStatistics();
      
      stats.totalGenerated += increment.count || 1;
      stats.totalSize += increment.size || 0;
      stats.lastUsed = Date.now();
      
      await chrome.storage.local.set({ statisticsData: stats });
    } catch (error) {
      console.error('更新统计信息失败:', error);
    }
  }
  
  /**
   * 更新设置
   */
  async updateSettings(newSettings) {
    try {
      const result = await chrome.storage.local.get('pdfGeneratorSettings');
      const currentSettings = result.pdfGeneratorSettings || {};
      
      // 合并设置
      const updatedSettings = { ...currentSettings, ...newSettings };
      
      await chrome.storage.local.set({ pdfGeneratorSettings: updatedSettings });
      this.settings = updatedSettings;
      
    } catch (error) {
      console.error('更新设置失败:', error);
      throw error;
    }
  }
  
  /**
   * 导出设置
   */
  async exportSettings() {
    try {
      const result = await chrome.storage.local.get([
        'pdfGeneratorSettings',
        'statisticsData'
      ]);
      
      return {
        settings: result.pdfGeneratorSettings,
        statistics: result.statisticsData,
        exportTime: Date.now(),
        version: chrome.runtime.getManifest().version
      };
    } catch (error) {
      console.error('导出设置失败:', error);
      throw error;
    }
  }
  
  /**
   * 导入设置
   */
  async importSettings(importData) {
    try {
      if (importData.settings) {
        await chrome.storage.local.set({ 
          pdfGeneratorSettings: importData.settings 
        });
      }
      
      if (importData.statistics) {
        await chrome.storage.local.set({ 
          statisticsData: importData.statistics 
        });
      }
      
      console.log('设置导入成功');
    } catch (error) {
      console.error('导入设置失败:', error);
      throw error;
    }
  }
  
  /**
   * 跨域获取页面内容
   * 利用后台脚本的特殊权限绕过CORS限制
   */
  async fetchPage(url) {
    try {
      console.log(`🔄 后台服务获取页面: ${url}`);
      
      // 使用fetch API获取页面内容
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // 在service worker中，credentials默认为'omit'
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log(`✅ 后台服务成功获取: ${url} (${html.length} 字符)`);
      
      return {
        success: true,
        html: html,
        url: url,
        status: response.status,
        statusText: response.statusText
      };
      
    } catch (error) {
      console.error(`❌ 后台服务获取失败: ${url}`, error);
      
      return {
        success: false,
        error: error.message,
        url: url
      };
    }
  }
  
  /**
   * 生成唯一任务ID
   */
  generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2);
  }
  
  /**
   * 清理过期任务
   * 定期清理已完成或失败的任务，避免内存泄漏
   */
  cleanupExpiredTasks() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30分钟
    
    for (const [taskId, task] of this.activeGenerations) {
      if (now - task.startTime > maxAge) {
        console.log('清理过期任务:', taskId);
        this.activeGenerations.delete(taskId);
      }
    }
  }
}

// 初始化后台服务
const pdfGeneratorBackground = new PDFGeneratorBackground();

// 定期清理任务 - 类似于垃圾回收机制
setInterval(() => {
  pdfGeneratorBackground.cleanupExpiredTasks();
}, 5 * 60 * 1000); // 每5分钟清理一次

// 错误处理
self.addEventListener('error', (event) => {
  console.error('后台脚本错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
}); 