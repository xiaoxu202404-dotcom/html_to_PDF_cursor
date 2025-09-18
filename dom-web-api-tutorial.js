/**
 * 📚 DOM操作与Web API教学
 * 基于您的HTML转PDF项目中的实际DOM处理技巧
 */

/**
 * 🎯 1. 智能内容提取策略
 * 您项目中体现的高级DOM选择技巧
 */

console.log('=== 智能内容提取策略 ===');

class SmartContentExtraction {
  constructor() {
    // 🎯 您项目中使用的智能选择器策略
    this.contentSelectors = [
      '.markdown-body',    // GitHub Pages 和 GitBook 常用
      '.content',
      'main',
      'article', 
      '.main-content',
      '.doc-content',
      '.post-content',
      '#content',
      '.container .row',   // Bootstrap 布局
      '.container'
    ];
  }

  // 🔥 您项目中的核心内容提取逻辑
  extractCurrentPageContent() {
    let mainContent = null;
    let bestMatch = null;
    let maxContentLength = 0;
    
    console.log('🔍 开始智能内容识别...');
    
    // 🎯 策略1：按优先级查找已知的内容容器
    for (const selector of this.contentSelectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        const textLength = element.textContent.trim().length;
        
        // 🔥 内容质量评估：长度 > 100 且是最长的
        if (textLength > maxContentLength && textLength > 100) {
          maxContentLength = textLength;
          bestMatch = element;
          
          console.log(`📊 发现候选: ${selector} (${textLength} 字符)`);
        }
      }
    }
    
    mainContent = bestMatch;
    
    // 🎯 策略2：如果没找到，启发式查找最大的div
    if (!mainContent) {
      console.log('🔄 启用备选策略：查找最大div');
      
      const divs = document.querySelectorAll('div');
      for (const div of divs) {
        const textLength = div.textContent.trim().length;
        if (textLength > maxContentLength && textLength > 200) {
          maxContentLength = textLength;
          mainContent = div;
        }
      }
    }
    
    // 🎯 策略3：最后的兜底方案
    if (!mainContent) {
      console.warn('⚠️ 使用body作为主内容');
      mainContent = document.body;
    }
    
    console.log(`✅ 选定主内容: ${mainContent.tagName} (${maxContentLength} 字符)`);
    return mainContent;
  }

  // 🎯 高级内容评估算法
  evaluateContentQuality(element) {
    const metrics = {
      textLength: element.textContent.trim().length,
      paragraphs: element.querySelectorAll('p').length,
      headings: element.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
      lists: element.querySelectorAll('ul,ol').length,
      images: element.querySelectorAll('img').length,
      links: element.querySelectorAll('a').length
    };
    
    // 🔥 内容质量评分算法
    let score = 0;
    score += Math.min(metrics.textLength / 100, 100);  // 文本长度权重
    score += metrics.paragraphs * 2;                   // 段落结构权重
    score += metrics.headings * 3;                     // 标题结构权重  
    score += metrics.lists * 1.5;                     // 列表内容权重
    score += Math.min(metrics.images * 0.5, 10);      // 图片内容权重（限制）
    
    return { metrics, score };
  }

  // 🎯 多策略内容发现
  findBestContentUsingMultipleStrategies() {
    const candidates = [];
    
    // 策略1：已知选择器
    this.contentSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        candidates.push({
          element: el,
          selector: selector,
          strategy: 'known-selector',
          ...this.evaluateContentQuality(el)
        });
      });
    });
    
    // 策略2：语义化标签优先
    ['main', 'article', 'section'].forEach(tag => {
      const elements = document.querySelectorAll(tag);
      elements.forEach(el => {
        candidates.push({
          element: el,
          selector: tag,
          strategy: 'semantic',
          ...this.evaluateContentQuality(el)
        });
      });
    });
    
    // 策略3：ID启发式
    const contentIds = ['content', 'main', 'primary', 'article', 'post'];
    contentIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        candidates.push({
          element: el,
          selector: `#${id}`,
          strategy: 'id-heuristic',
          ...this.evaluateContentQuality(el)
        });
      }
    });
    
    // 🔥 按评分排序，选择最佳候选
    candidates.sort((a, b) => b.score - a.score);
    
    console.log('📊 内容候选排名:');
    candidates.slice(0, 5).forEach((candidate, index) => {
      console.log(`${index + 1}. ${candidate.selector} (${candidate.strategy}) - 评分: ${candidate.score.toFixed(1)}`);
    });
    
    return candidates[0]?.element || document.body;
  }
}

/**
 * 🎯 2. 动态UI创建与管理
 * 您项目中的进度显示和用户反馈系统
 */

console.log('=== 动态UI创建与管理 ===');

class DynamicUIManager {
  
  // 🎯 您项目中的进度面板实现
  showProgressPanel() {
    // 🔥 避免重复创建
    if (document.getElementById('pdf-progress-panel')) {
      return;
    }
    
    const panel = document.createElement('div');
    panel.id = 'pdf-progress-panel';
    
    // 🎯 使用template literal创建复杂HTML
    panel.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: white; padding: 30px; border-radius: 10px; 
                  box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
                  z-index: 999999; font-family: Arial, sans-serif; 
                  text-align: center; min-width: 300px;">
        <h3 style="margin: 0 0 15px 0;">📚 正在生成PDF电子书</h3>
        <div id="progress-text" style="margin-bottom: 15px;">准备中...</div>
        <div style="background: #f0f0f0; height: 6px; border-radius: 3px; overflow: hidden;">
          <div id="progress-bar" style="background: #4facfe; height: 100%; width: 0%; 
                                         transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    
    // 🔥 添加到DOM
    document.body.appendChild(panel);
    
    console.log('✅ 进度面板已创建');
  }
  
  // 🎯 智能进度更新
  updateProgress(text, current = 0, total = 100) {
    const textEl = document.getElementById('progress-text');
    const barEl = document.getElementById('progress-bar');
    
    if (textEl) {
      textEl.textContent = text;
      console.log(`📊 进度更新: ${text}`);
    }
    
    if (barEl && total > 0) {
      const percent = Math.min((current / total) * 100, 100);
      barEl.style.width = percent + '%';
      
      // 🎯 进度完成时的视觉反馈
      if (percent >= 100) {
        barEl.style.background = '#28a745'; // 变绿表示完成
      }
    }
  }
  
  // 🎯 优雅的面板移除
  hideProgressPanel() {
    const panel = document.getElementById('pdf-progress-panel');
    if (panel) {
      // 🔥 添加淡出动画
      panel.style.opacity = '0';
      panel.style.transition = 'opacity 0.3s';
      
      setTimeout(() => {
        panel.remove();
        console.log('✅ 进度面板已移除');
      }, 300);
    }
  }
  
  // 🎯 创建可复用的通知组件
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    const colors = {
      info: '#17a2b8',
      success: '#28a745', 
      warning: '#ffc107',
      error: '#dc3545'
    };
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000000;
      transform: translateX(100%);
      transition: transform 0.3s;
      font-family: Arial, sans-serif;
      max-width: 300px;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // 🔥 滑入动画
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });
    
    // 🔥 自动消失
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, duration);
    
    return notification;
  }
}

/**
 * 🎯 3. 高级DOM遍历与操作
 * 深度遍历和内容清理技术
 */

console.log('=== 高级DOM遍历与操作 ===');

class AdvancedDOMOperations {
  
  // 🎯 您项目中的内容清理逻辑
  cleanupContent(element) {
    console.log('🧹 开始内容清理...');
    
    // 🔥 移除不需要的元素类型
    const unwantedSelectors = [
      'script',           // JavaScript代码
      'style',            // 内联样式
      'nav',              // 导航菜单
      '.advertisement',   // 广告
      '.sidebar',         // 侧边栏
      '.comments',        // 评论区
      '[data-ad]',        // 广告标记
      '.social-share'     // 社交分享
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => {
        console.log(`🗑️ 移除元素: ${selector}`);
        el.remove();
      });
    });
    
    // 🎯 清理空白和无用属性
    this.cleanupAttributes(element);
    this.cleanupEmptyElements(element);
    
    console.log('✅ 内容清理完成');
  }
  
  // 🎯 属性清理：保留有用的，移除无用的
  cleanupAttributes(element) {
    const keepAttributes = ['id', 'class', 'href', 'src', 'alt', 'title'];
    
    const allElements = element.querySelectorAll('*');
    allElements.forEach(el => {
      // 🔥 遍历所有属性，移除不在白名单中的
      const attributesToRemove = [];
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        if (!keepAttributes.includes(attr.name) && 
            !attr.name.startsWith('data-keep')) {  // 特殊保留标记
          attributesToRemove.push(attr.name);
        }
      }
      
      attributesToRemove.forEach(attrName => {
        el.removeAttribute(attrName);
      });
    });
  }
  
  // 🎯 移除空元素和无意义容器
  cleanupEmptyElements(element) {
    const emptyElements = [];
    
    // 🔥 查找所有空元素
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: function(node) {
          // 检查元素是否为空或只包含空白
          const hasContent = node.textContent.trim().length > 0;
          const hasMedia = node.querySelector('img, video, audio, canvas');
          const isImportant = ['br', 'hr', 'input'].includes(node.tagName.toLowerCase());
          
          if (!hasContent && !hasMedia && !isImportant) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      emptyElements.push(node);
    }
    
    // 🔥 从子元素开始移除（避免破坏树结构）
    emptyElements.reverse().forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    console.log(`🗑️ 移除了 ${emptyElements.length} 个空元素`);
  }
  
  // 🎯 深度克隆并处理
  deepCloneAndProcess(element, processors = []) {
    // 🔥 深度克隆避免影响原DOM
    const cloned = element.cloneNode(true);
    
    // 🔥 应用所有处理器
    processors.forEach(processor => {
      try {
        processor(cloned);
        console.log(`✅ 处理器执行成功: ${processor.name}`);
      } catch (error) {
        console.warn(`⚠️ 处理器执行失败: ${processor.name}`, error);
      }
    });
    
    return cloned;
  }
  
  // 🎯 智能文本提取
  extractIntelligentText(element) {
    const textParts = [];
    
    // 🔥 使用TreeWalker遍历文本节点
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // 排除脚本和样式中的文本
          const parent = node.parentElement;
          if (parent && ['SCRIPT', 'STYLE'].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // 只接受有实际内容的文本节点
          if (node.textContent.trim().length > 0) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let textNode;
    while (textNode = walker.nextNode()) {
      const text = textNode.textContent.trim();
      if (text) {
        textParts.push(text);
      }
    }
    
    return textParts.join('\n');
  }
}

/**
 * 🎯 4. Web API综合运用
 * 文件处理、窗口管理等高级API
 */

console.log('=== Web API综合运用 ===');

class WebAPIIntegration {
  
  // 🎯 您项目中的窗口管理
  createPDFPreviewWindow(htmlContent, options = {}) {
    const defaultOptions = {
      width: 1200,
      height: 800,
      scrollbars: 'yes',
      resizable: 'yes'
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    const optionsString = Object.entries(finalOptions)
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    
    console.log('🪟 创建预览窗口...');
    
    // 🔥 创建新窗口
    const pdfWindow = window.open('', '_blank', optionsString);
    
    if (pdfWindow) {
      // 🎯 写入内容
      pdfWindow.document.open();
      pdfWindow.document.write(htmlContent);
      pdfWindow.document.close();
      
      // 🎯 设置窗口标题
      pdfWindow.document.title = options.title || 'PDF预览';
      
      // 🎯 等待内容加载完成后聚焦
      pdfWindow.addEventListener('load', () => {
        pdfWindow.focus();
        console.log('✅ 预览窗口已就绪');
      });
      
      return pdfWindow;
    } else {
      throw new Error('无法创建预览窗口，可能被浏览器阻止');
    }
  }
  
  // 🎯 智能URL处理
  normalizeURL(url, baseURL = window.location.href) {
    try {
      // 🔥 使用URL API处理相对路径
      return new URL(url, baseURL).href;
    } catch (error) {
      console.warn('URL规范化失败:', url, error);
      return url;
    }
  }
  
  // 🎯 批量资源预加载
  async preloadResources(urls) {
    const preloadPromises = urls.map(url => {
      return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        link.as = 'fetch';
        link.crossOrigin = 'anonymous';
        
        link.onload = () => {
          console.log(`✅ 预加载成功: ${url}`);
          resolve(url);
        };
        
        link.onerror = () => {
          console.warn(`❌ 预加载失败: ${url}`);
          reject(new Error(`预加载失败: ${url}`));
        };
        
        document.head.appendChild(link);
        
        // 5秒超时
        setTimeout(() => {
          reject(new Error(`预加载超时: ${url}`));
        }, 5000);
      });
    });
    
    const results = await Promise.allSettled(preloadPromises);
    return results;
  }
  
  // 🎯 性能监控
  measurePerformance(operationName, operation) {
    return async (...args) => {
      const start = performance.now();
      
      try {
        console.log(`⏱️ 开始测量: ${operationName}`);
        const result = await operation(...args);
        
        const end = performance.now();
        const duration = (end - start).toFixed(2);
        
        console.log(`✅ ${operationName} 完成，耗时: ${duration}ms`);
        
        // 🔥 记录性能数据
        if (typeof performance.mark === 'function') {
          performance.mark(`${operationName}-start`);
          performance.mark(`${operationName}-end`);
          performance.measure(operationName, `${operationName}-start`, `${operationName}-end`);
        }
        
        return { result, duration: parseFloat(duration) };
        
      } catch (error) {
        const end = performance.now();
        const duration = (end - start).toFixed(2);
        
        console.error(`❌ ${operationName} 失败，耗时: ${duration}ms`, error);
        throw error;
      }
    };
  }
}

/**
 * 🎯 5. 实际使用综合示例
 */

console.log('=== 实际使用综合示例 ===');

class ComprehensiveExample {
  constructor() {
    this.contentExtractor = new SmartContentExtraction();
    this.uiManager = new DynamicUIManager();
    this.domOps = new AdvancedDOMOperations();
    this.webAPI = new WebAPIIntegration();
  }
  
  // 🎯 模拟您项目的完整流程
  async processPageLikeYourProject() {
    console.log('🚀 开始模拟您的项目流程...');
    
    try {
      // 1. 显示进度
      this.uiManager.showProgressPanel();
      this.uiManager.updateProgress('正在分析页面结构...', 10, 100);
      
      // 2. 智能内容提取
      const mainContent = this.contentExtractor.findBestContentUsingMultipleStrategies();
      this.uiManager.updateProgress('正在提取主要内容...', 30, 100);
      
      // 3. 内容处理和清理
      const processors = [
        this.domOps.cleanupContent.bind(this.domOps),
        // 可以添加更多处理器
      ];
      
      const processedContent = this.domOps.deepCloneAndProcess(mainContent, processors);
      this.uiManager.updateProgress('正在优化内容结构...', 60, 100);
      
      // 4. 生成预览
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>处理结果预览</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📄 页面内容处理结果</h1>
              <p>原始页面: ${window.location.href}</p>
              <p>处理时间: ${new Date().toLocaleString()}</p>
            </div>
            ${processedContent.outerHTML}
          </body>
        </html>
      `;
      
      this.uiManager.updateProgress('正在生成预览...', 90, 100);
      
      // 5. 创建预览窗口
      const previewWindow = this.webAPI.createPDFPreviewWindow(htmlContent, {
        title: '内容处理结果'
      });
      
      this.uiManager.updateProgress('完成！', 100, 100);
      
      // 6. 显示成功通知
      setTimeout(() => {
        this.uiManager.hideProgressPanel();
        this.uiManager.showNotification('页面处理完成！预览窗口已打开', 'success');
      }, 1000);
      
      return { success: true, previewWindow };
      
    } catch (error) {
      console.error('❌ 处理失败:', error);
      this.uiManager.hideProgressPanel();
      this.uiManager.showNotification(`处理失败: ${error.message}`, 'error');
      return { success: false, error };
    }
  }
}

/**
 * 🎯 您项目中体现的DOM与Web API精髓：
 * 
 * ✅ **智能选择器** - 多策略内容识别算法
 * ✅ **质量评估** - 基于多维度指标评估内容质量  
 * ✅ **动态UI** - 实时进度反馈和用户交互
 * ✅ **内容清理** - 移除无用元素和属性优化
 * ✅ **深度遍历** - TreeWalker和递归遍历技术
 * ✅ **窗口管理** - 跨窗口内容传递和控制
 * ✅ **错误处理** - 优雅降级和用户友好提示
 * ✅ **性能监控** - 操作耗时测量和优化
 * 
 * 💡 DOM操作的核心原则：
 * 1. **选择精准** - 用最合适的选择器找到目标元素
 * 2. **操作安全** - 避免破坏DOM结构和影响其他功能
 * 3. **性能优化** - 批量操作、避免重复查询、使用文档片段
 * 4. **用户体验** - 提供反馈、处理异常、保持响应性
 */

// 创建实例用于演示
const example = new ComprehensiveExample();
// example.processPageLikeYourProject();

export { 
  SmartContentExtraction, 
  DynamicUIManager, 
  AdvancedDOMOperations, 
  WebAPIIntegration 
}; 