/**
 * HTML转PDF电子书生成器 - 弹窗交互脚本
 * 
 * 这个脚本负责处理用户界面交互，相当于传统桌面应用中的"控制器"层
 * 类似于C++中的事件处理系统，但使用Web技术实现
 */

class PDFGeneratorPopup {
  constructor() {
    this.currentTab = null;
    this.pageContent = null;
    this.isGenerating = false;
    
    // 绑定DOM元素 - 类似C++中的成员变量初始化
    this.elements = {
      currentUrl: document.getElementById('currentUrl'),
      bookTitle: document.getElementById('bookTitle'),
      authorName: document.getElementById('authorName'),
      pageSize: document.getElementById('pageSize'),
      includeImages: document.getElementById('includeImages'),
      includeToc: document.getElementById('includeToc'),
      includeLinks: document.getElementById('includeLinks'),
      generateBtn: document.getElementById('generateBtn'),
      previewBtn: document.getElementById('previewBtn'),
      progressSection: document.getElementById('progressSection'),
      progressFill: document.getElementById('progressFill'),
      progressText: document.getElementById('progressText')
    };
    
    this.init();
  }
  
  async init() {
    try {
      // 获取当前活动标签页 - 类似系统调用获取当前进程信息
      await this.getCurrentTab();
      await this.getPageInfo();
      this.bindEvents();
      this.loadSavedSettings();
    } catch (error) {
      console.error('初始化失败:', error);
      this.showError('插件初始化失败，请刷新页面重试');
    }
  }
  
  async getCurrentTab() {
    // Chrome扩展API调用，获取当前标签页
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0];
    
    if (this.currentTab) {
      // 显示当前URL，截取显示避免界面过长
      const displayUrl = this.truncateUrl(this.currentTab.url);
      this.elements.currentUrl.textContent = displayUrl;
      this.elements.currentUrl.title = this.currentTab.url; // 完整URL显示在tooltip
    }
  }
  
  async getPageInfo() {
    if (!this.currentTab) return;
    
    try {
      // 向content script发送消息获取页面信息
      // 这里使用消息传递机制，类似进程间通信(IPC)
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'getPageInfo'
      });
      
      if (response) {
        // 自动填充标题
        if (response.title && !this.elements.bookTitle.value) {
          this.elements.bookTitle.value = response.title;
        }
        
        this.pageContent = response;
      }
    } catch (error) {
      console.log('获取页面信息失败，可能需要刷新页面');
    }
  }
  
  bindEvents() {
    // 事件绑定 - 类似C++中的信号-槽机制
    this.elements.generateBtn.addEventListener('click', () => this.handleGenerate());
    this.elements.previewBtn.addEventListener('click', () => this.handlePreview());
    
    // 输入变化时保存设置
    [this.elements.bookTitle, this.elements.authorName].forEach(input => {
      input.addEventListener('input', () => this.saveSettings());
    });
    
    [this.elements.includeImages, this.elements.includeToc, this.elements.includeLinks].forEach(checkbox => {
      checkbox.addEventListener('change', () => this.saveSettings());
    });
    
    this.elements.pageSize.addEventListener('change', () => this.saveSettings());
  }
  
  async handleGenerate() {
    if (this.isGenerating) return;
    
    try {
      this.isGenerating = true;
      this.showProgress('开始分析页面结构...');
      
      // 获取生成选项
      const options = this.getGenerationOptions();
      
      // 发送生成请求到content script
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'generatePDF',
        options: options
      });
      
      if (response && response.success) {
        this.showProgress('PDF生成完成！');
        setTimeout(() => this.hideProgress(), 2000);
      } else {
        throw new Error(response?.error || 'PDF生成失败');
      }
      
    } catch (error) {
      console.error('生成PDF失败:', error);
      this.showError('生成失败: ' + error.message);
    } finally {
      this.isGenerating = false;
    }
  }
  
  async handlePreview() {
    try {
      this.showProgress('正在预览内容...');
      
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'previewContent'
      });
      
      if (response && response.success) {
        // 创建新标签页显示预览
        chrome.tabs.create({
          url: chrome.runtime.getURL('preview.html'),
          active: true
        });
      }
      
      this.hideProgress();
    } catch (error) {
      console.error('预览失败:', error);
      this.showError('预览失败: ' + error.message);
    }
  }
  
  getGenerationOptions() {
    return {
      title: this.elements.bookTitle.value || this.currentTab.title,
      author: this.elements.authorName.value || '未知作者',
      pageSize: this.elements.pageSize.value,
      includeImages: this.elements.includeImages.checked,
      includeToc: this.elements.includeToc.checked,
      includeLinks: this.elements.includeLinks.checked,
      timestamp: Date.now()
    };
  }
  
  showProgress(message, progress = 0) {
    this.elements.progressSection.style.display = 'block';
    this.elements.progressText.textContent = message;
    this.elements.progressFill.style.width = `${progress}%`;
    this.elements.generateBtn.disabled = true;
    this.elements.previewBtn.disabled = true;
  }
  
  hideProgress() {
    this.elements.progressSection.style.display = 'none';
    this.elements.generateBtn.disabled = false;
    this.elements.previewBtn.disabled = false;
  }
  
  showError(message) {
    // 简单的错误显示，实际应用中可以使用更优雅的通知
    alert('❌ ' + message);
    this.hideProgress();
  }
  
  // 设置持久化 - 类似配置文件的读写
  saveSettings() {
    const settings = {
      includeImages: this.elements.includeImages.checked,
      includeToc: this.elements.includeToc.checked,
      includeLinks: this.elements.includeLinks.checked,
      pageSize: this.elements.pageSize.value,
      authorName: this.elements.authorName.value
    };
    
    chrome.storage.local.set({ pdfGeneratorSettings: settings });
  }
  
  async loadSavedSettings() {
    try {
      const result = await chrome.storage.local.get('pdfGeneratorSettings');
      const settings = result.pdfGeneratorSettings;
      
      if (settings) {
        this.elements.includeImages.checked = settings.includeImages !== false;
        this.elements.includeToc.checked = settings.includeToc !== false;
        this.elements.includeLinks.checked = settings.includeLinks !== false;
        this.elements.pageSize.value = settings.pageSize || 'a4';
        this.elements.authorName.value = settings.authorName || '';
      }
    } catch (error) {
      console.log('加载设置失败:', error);
    }
  }
  
  truncateUrl(url, maxLength = 40) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  }
}

// DOM加载完成后初始化 - 类似C++中的main函数入口
document.addEventListener('DOMContentLoaded', () => {
  new PDFGeneratorPopup();
});

// 工具函数：格式化字节大小
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
} 