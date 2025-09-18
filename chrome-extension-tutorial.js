/**
 * 📚 Chrome Extension API 深度教学
 * 基于您的HTML转PDF项目实际使用的API进行讲解
 */

/**
 * 🎯 1. 扩展架构理解
 * 
 * Chrome扩展就像一个小型的Web应用，但有特殊权限：
 */

console.log('=== Chrome扩展架构 ===');

/*
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Popup (弹窗)       │    │  Content Script      │    │  Background Script  │
│                     │    │  (内容脚本)           │    │  (后台脚本)          │
│ - 用户界面          │◄──►│                      │◄──►│                     │
│ - 设置面板          │    │ - 页面DOM操作        │    │ - 核心业务逻辑       │
│ - 操作触发          │    │ - 信息提取           │    │ - 跨域请求          │
└─────────────────────┘    │ - 实时反馈           │    │ - 数据存储          │
                           └──────────────────────┘    │ - 生命周期管理       │
                                                       └─────────────────────┘
*/

/**
 * 🎯 2. 消息传递系统 (您项目的核心通信机制)
 */

console.log('=== 消息传递深度解析 ===');

// 📍 您在background.js中的消息监听器：
class MessageSystemDemo {
  constructor() {
    this.setupMessageListeners();
  }
  
  setupMessageListeners() {
    // 🔥 这是您项目中使用的核心模式
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 收到消息:', {
        action: message.action,
        sender: sender.tab?.url,
        timestamp: Date.now()
      });
      
      // 🎯 您的项目用switch处理不同操作
      switch (message.action) {
        case 'getPageInfo':
          this.getPageInfo(sendResponse);
          break;
          
        case 'generatePDF':
          this.generatePDF(message.options, sendResponse);
          break;
          
        case 'fetchPage':  // 🔥 您用这个绕过CORS限制
          this.fetchPage(message.url, sendResponse);
          break;
      }
      
      // ⚠️ 关键：返回true保持异步响应通道开启
      return true;
    });
  }
  
  // 🎯 跨域请求处理 (您项目中的重要功能)
  async fetchPage(url, sendResponse) {
    try {
      console.log('🌐 代理请求:', url);
      
      // ✅ Background脚本可以发起跨域请求！
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PDF Generator Bot 1.0',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      sendResponse({
        success: true,
        html: html,
        url: url,
        size: html.length,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ 代理请求失败:', error);
      sendResponse({
        success: false,
        error: error.message,
        url: url
      });
    }
  }
  
  async getPageInfo(sendResponse) {
    // 这里需要与content script通信获取页面信息
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs[0]) {
      // 向content script发送消息
      chrome.tabs.sendMessage(tabs[0].id, { action: 'extractPageInfo' }, (response) => {
        sendResponse(response);
      });
    }
  }
}

/**
 * 🎯 3. 存储API使用 (您项目中的配置和数据管理)
 */

console.log('=== Chrome存储API详解 ===');

class StorageDemo {
  constructor() {
    this.demonstrateStorage();
  }
  
  async demonstrateStorage() {
    // 🎯 您在项目中使用的存储模式
    
    // 1️⃣ 存储用户设置
    const userSettings = {
      pageSize: 'A4',
      includeImages: true,
      author: '用户姓名',
      theme: 'light'
    };
    
    try {
      // ✅ chrome.storage.local - 本地存储，容量大
      await chrome.storage.local.set({
        pdfGeneratorSettings: userSettings
      });
      
      console.log('✅ 设置已保存到本地存储');
      
      // 2️⃣ 读取存储的数据
      const result = await chrome.storage.local.get(['pdfGeneratorSettings']);
      console.log('📖 读取的设置:', result.pdfGeneratorSettings);
      
      // 3️⃣ 监听存储变化
      chrome.storage.onChanged.addListener((changes, area) => {
        console.log('📝 存储发生变化:', changes, '区域:', area);
        
        if (changes.pdfGeneratorSettings) {
          const oldValue = changes.pdfGeneratorSettings.oldValue;
          const newValue = changes.pdfGeneratorSettings.newValue;
          console.log('设置从', oldValue, '变更为', newValue);
        }
      });
      
    } catch (error) {
      console.error('❌ 存储操作失败:', error);
    }
  }
  
  // 🎯 您项目中的统计数据管理
  async updateStatistics(pdfSize) {
    try {
      // 读取现有统计
      const result = await chrome.storage.local.get(['statisticsData']);
      const stats = result.statisticsData || {
        totalGenerated: 0,
        totalSize: 0,
        lastUsed: 0
      };
      
      // 更新统计
      stats.totalGenerated++;
      stats.totalSize += pdfSize;
      stats.lastUsed = Date.now();
      
      // 保存更新
      await chrome.storage.local.set({ statisticsData: stats });
      
      console.log('📊 统计数据已更新:', stats);
      
    } catch (error) {
      console.error('❌ 更新统计失败:', error);
    }
  }
}

/**
 * 🎯 4. 标签页API (与活动页面交互)
 */

console.log('=== 标签页API使用 ===');

class TabsDemo {
  // 🎯 获取当前活动标签页 (您项目中的常用操作)
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      
      console.log('📋 当前标签页:', {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        status: tab.status
      });
      
      return tab;
      
    } catch (error) {
      console.error('❌ 获取标签页失败:', error);
      return null;
    }
  }
  
  // 🎯 向content script发送消息
  async sendMessageToContentScript(tabId, message) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      console.log('📤 消息发送成功，响应:', response);
      return response;
      
    } catch (error) {
      console.error('❌ 消息发送失败:', error);
      return null;
    }
  }
  
  // 🎯 注入脚本 (动态加载功能)
  async injectScript(tabId, scriptDetails) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [scriptDetails.file]
      });
      
      console.log('✅ 脚本注入成功');
      
    } catch (error) {
      console.error('❌ 脚本注入失败:', error);
    }
  }
}

/**
 * 🎯 5. 生命周期管理 (您项目中的初始化逻辑)
 */

console.log('=== 扩展生命周期管理 ===');

class LifecycleDemo {
  constructor() {
    this.setupLifecycleListeners();
  }
  
  setupLifecycleListeners() {
    // 🔥 您在background.js中的实现
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('🚀 扩展安装/更新事件:', details);
      
      switch (details.reason) {
        case 'install':
          this.handleFirstInstall();
          break;
          
        case 'update':
          this.handleUpdate(details.previousVersion);
          break;
          
        case 'browser_update':
          console.log('🔄 浏览器更新');
          break;
      }
    });
    
    // 🎯 扩展启动事件
    chrome.runtime.onStartup.addListener(() => {
      console.log('🔄 扩展启动');
      this.initializeServices();
    });
    
    // 🎯 扩展挂起前事件
    chrome.runtime.onSuspend.addListener(() => {
      console.log('😴 扩展即将挂起');
      this.cleanupResources();
    });
  }
  
  // 🎯 首次安装初始化
  async handleFirstInstall() {
    console.log('🎉 欢迎使用PDF生成器！');
    
    // 设置默认配置
    const defaultConfig = {
      version: '1.0.0',
      firstInstallTime: Date.now(),
      settings: {
        pageSize: 'A4',
        includeImages: true,
        includeLinks: true
      }
    };
    
    await chrome.storage.local.set({ config: defaultConfig });
    
    // 可以在这里打开欢迎页面
    // chrome.tabs.create({ url: 'welcome.html' });
  }
  
  // 🎯 版本更新处理
  async handleUpdate(previousVersion) {
    console.log(`📱 从版本 ${previousVersion} 更新`);
    
    // 这里处理数据迁移逻辑
    const result = await chrome.storage.local.get(['config']);
    const config = result.config || {};
    
    // 示例：添加新的配置项
    if (!config.settings.newFeature) {
      config.settings.newFeature = true;
      await chrome.storage.local.set({ config });
      console.log('✅ 配置已升级');
    }
  }
  
  initializeServices() {
    console.log('🔧 初始化后台服务...');
    // 这里可以启动定时任务、清理缓存等
  }
  
  cleanupResources() {
    console.log('🧹 清理资源...');
    // 这里清理定时器、关闭连接等
  }
}

/**
 * 🎯 6. 权限系统理解
 */

console.log('=== Chrome扩展权限系统 ===');

/*
您的manifest.json中声明的权限：

{
  "permissions": [
    "storage",      // 🔐 本地数据存储
    "downloads",    // 🔐 文件下载管理  
    "activeTab",    // 🔐 访问当前活动标签页
    "scripting"     // 🔐 注入脚本能力
  ],
  "host_permissions": [
    "<all_urls>"    // 🔐 访问所有网站 (用于跨域请求)
  ]
}

⚠️ 权限最小化原则：
- 只申请必需的权限
- 考虑用户隐私和安全
- 在商店审核时会被严格检查
*/

class PermissionDemo {
  // 🎯 检查权限状态
  async checkPermissions() {
    const permissions = ['storage', 'downloads', 'activeTab'];
    
    const hasPermissions = await chrome.permissions.contains({
      permissions: permissions
    });
    
    console.log('🔐 权限检查结果:', hasPermissions);
    return hasPermissions;
  }
  
  // 🎯 动态请求权限
  async requestPermissions() {
    try {
      const granted = await chrome.permissions.request({
        permissions: ['downloads']
      });
      
      if (granted) {
        console.log('✅ 权限获取成功');
      } else {
        console.log('❌ 用户拒绝权限');
      }
      
    } catch (error) {
      console.error('❌ 权限请求失败:', error);
    }
  }
}

/**
 * 🎯 实际使用示例 - 模拟您项目的核心流程
 */

console.log('=== 完整流程演示 ===');

class PDFGeneratorFlow {
  constructor() {
    this.messageSystem = new MessageSystemDemo();
    this.storage = new StorageDemo();
    this.tabs = new TabsDemo();
    this.lifecycle = new LifecycleDemo();
  }
  
  // 🎯 模拟完整的PDF生成流程
  async generatePDFWorkflow() {
    console.log('🚀 开始PDF生成流程...');
    
    try {
      // 1. 获取当前页面信息
      const currentTab = await this.tabs.getCurrentTab();
      if (!currentTab) throw new Error('无法获取当前标签页');
      
      // 2. 向content script请求页面信息
      const pageInfo = await this.tabs.sendMessageToContentScript(
        currentTab.id, 
        { action: 'extractPageInfo' }
      );
      
      // 3. 批量获取所有相关页面
      const allPages = [];
      for (const url of pageInfo.urls) {
        const pageData = await this.fetchPageViaBackground(url);
        if (pageData.success) {
          allPages.push(pageData);
        }
      }
      
      // 4. 更新统计数据
      await this.storage.updateStatistics(allPages.length * 1024); // 估算大小
      
      // 5. 返回结果
      console.log('✅ PDF生成流程完成');
      return { success: true, pages: allPages.length };
      
    } catch (error) {
      console.error('❌ PDF生成失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  async fetchPageViaBackground(url) {
    // 模拟通过background脚本获取页面内容
    return { success: true, url, content: '页面内容...' };
  }
}

/**
 * 🎯 您项目中体现的Chrome Extension核心概念：
 * 
 * ✅ **消息传递** - popup ↔ content script ↔ background 通信
 * ✅ **跨域请求** - background脚本绕过CORS限制
 * ✅ **本地存储** - 用户配置和统计数据持久化
 * ✅ **生命周期管理** - 安装、更新、启动事件处理
 * ✅ **权限控制** - 最小权限原则和动态权限
 * ✅ **标签页交互** - 获取页面信息和注入脚本
 * 
 * 💡 为什么这些API重要：
 * 1. **安全隔离** - 不同组件有不同权限范围
 * 2. **性能优化** - background持久运行，content按需加载
 * 3. **用户体验** - 异步通信不阻塞页面
 * 4. **功能强大** - 突破网页的沙箱限制
 */

export { PDFGeneratorFlow, MessageSystemDemo, StorageDemo }; 