/**
 * 观察者模式实现 - 进度监控系统
 * 
 * 学习目标：
 * 1. 理解发布-订阅模式
 * 2. 掌握事件驱动编程
 * 3. 实现松耦合的组件通信
 */

// 抽象观察者接口
class Observer {
  /**
   * 接收通知的抽象方法
   * @param {string} event - 事件类型
   * @param {*} data - 事件数据
   */
  update(event, data) {
    throw new Error('子类必须实现update方法');
  }
}

// 抽象主题接口
class Subject {
  constructor() {
    this.observers = [];
  }
  
  /**
   * 添加观察者
   * @param {Observer} observer - 观察者对象
   */
  addObserver(observer) {
    this.observers.push(observer);
  }
  
  /**
   * 移除观察者
   * @param {Observer} observer - 观察者对象
   */
  removeObserver(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }
  
  /**
   * 通知所有观察者
   * @param {string} event - 事件类型
   * @param {*} data - 事件数据
   */
  notifyObservers(event, data) {
    this.observers.forEach(observer => {
      try {
        observer.update(event, data);
      } catch (error) {
        console.error('Observer error:', error);
      }
    });
  }
}

// 具体观察者1：UI进度条
class ProgressBarObserver extends Observer {
  constructor(progressElement) {
    super();
    this.progressElement = progressElement;
  }
  
  update(event, data) {
    switch (event) {
      case 'progress':
        this.updateProgress(data);
        break;
      case 'status':
        this.updateStatus(data);
        break;
      case 'error':
        this.showError(data);
        break;
    }
  }
  
  updateProgress(data) {
    const { current, total } = data;
    const percentage = Math.round((current / total) * 100);
    
    if (this.progressElement) {
      this.progressElement.style.width = `${percentage}%`;
      this.progressElement.textContent = `${percentage}%`;
    }
    
    console.log(`📊 进度更新: ${percentage}% (${current}/${total})`);
  }
  
  updateStatus(data) {
    console.log(`📝 状态更新: ${data.message}`);
  }
  
  showError(data) {
    console.error(`❌ 错误: ${data.message}`);
    if (this.progressElement) {
      this.progressElement.style.backgroundColor = '#ff4444';
    }
  }
}

// 具体观察者2：日志记录器
class LoggerObserver extends Observer {
  constructor(logLevel = 'info') {
    super();
    this.logLevel = logLevel;
    this.logs = [];
  }
  
  update(event, data) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, event, data };
    
    this.logs.push(logEntry);
    this.writeLog(logEntry);
  }
  
  writeLog(entry) {
    const { timestamp, event, data } = entry;
    const message = this.formatMessage(event, data);
    
    switch (event) {
      case 'error':
        console.error(`[${timestamp}] ERROR: ${message}`);
        break;
      case 'warning':
        console.warn(`[${timestamp}] WARN: ${message}`);
        break;
      default:
        console.log(`[${timestamp}] INFO: ${message}`);
    }
  }
  
  formatMessage(event, data) {
    if (typeof data === 'object') {
      return data.message || JSON.stringify(data);
    }
    return String(data);
  }
  
  getLogs() {
    return this.logs;
  }
  
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// 具体观察者3：统计收集器
class StatsObserver extends Observer {
  constructor() {
    super();
    this.stats = {
      startTime: null,
      endTime: null,
      totalPages: 0,
      processedPages: 0,
      errors: 0,
      warnings: 0
    };
  }
  
  update(event, data) {
    switch (event) {
      case 'start':
        this.stats.startTime = new Date();
        this.stats.totalPages = data.total;
        break;
        
      case 'progress':
        this.stats.processedPages = data.current;
        break;
        
      case 'complete':
        this.stats.endTime = new Date();
        this.generateReport();
        break;
        
      case 'error':
        this.stats.errors++;
        break;
        
      case 'warning':
        this.stats.warnings++;
        break;
    }
  }
  
  generateReport() {
    const duration = this.stats.endTime - this.stats.startTime;
    const avgTime = duration / this.stats.processedPages;
    
    const report = {
      总耗时: `${Math.round(duration / 1000)}秒`,
      处理页面: `${this.stats.processedPages}/${this.stats.totalPages}`,
      平均时间: `${Math.round(avgTime)}毫秒/页`,
      错误数: this.stats.errors,
      警告数: this.stats.warnings,
      成功率: `${Math.round(((this.stats.processedPages - this.stats.errors) / this.stats.processedPages) * 100)}%`
    };
    
    console.log('📊 处理报告:', report);
    return report;
  }
}

// 具体主题：PDF生成器
class ObservablePDFGenerator extends Subject {
  constructor() {
    super();
    this.pages = [];
    this.currentPage = 0;
  }
  
  /**
   * 开始处理
   * @param {string[]} urls - 页面URL列表
   */
  async process(urls) {
    this.notifyObservers('start', { total: urls.length });
    this.notifyObservers('status', { message: '开始处理页面...' });
    
    for (let i = 0; i < urls.length; i++) {
      try {
        await this.processPage(urls[i], i + 1, urls.length);
      } catch (error) {
        this.notifyObservers('error', { 
          message: `处理页面失败: ${urls[i]}`,
          error: error.message
        });
      }
    }
    
    this.notifyObservers('complete', { pages: this.pages });
    this.notifyObservers('status', { message: '所有页面处理完成！' });
  }
  
  async processPage(url, current, total) {
    this.notifyObservers('status', { message: `正在处理: ${url}` });
    
    // 模拟页面处理
    await this.delay(Math.random() * 1000 + 500);
    
    // 随机生成错误用于演示
    if (Math.random() < 0.1) {
      throw new Error(`网络错误: 无法访问 ${url}`);
    }
    
    // 随机生成警告
    if (Math.random() < 0.2) {
      this.notifyObservers('warning', { 
        message: `页面 ${url} 包含不支持的元素` 
      });
    }
    
    this.pages.push({
      url,
      title: `页面 ${current}`,
      content: `这是第 ${current} 页的内容`
    });
    
    this.notifyObservers('progress', { current, total });
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 使用示例
async function demonstrateObserverPattern() {
  console.log('🎯 观察者模式演示开始\n');
  
  // 创建PDF生成器（主题）
  const generator = new ObservablePDFGenerator();
  
  // 创建观察者
  const progressBar = new ProgressBarObserver(null); // 在真实应用中传入DOM元素
  const logger = new LoggerObserver();
  const stats = new StatsObserver();
  
  // 注册观察者
  generator.addObserver(progressBar);
  generator.addObserver(logger);
  generator.addObserver(stats);
  
  // 模拟处理多个页面
  const testUrls = [
    'https://example.com/page1',
    'https://example.com/page2',
    'https://example.com/page3',
    'https://example.com/page4',
    'https://example.com/page5'
  ];
  
  await generator.process(testUrls);
  
  console.log('\n📈 最终统计:');
  stats.generateReport();
  
  console.log('\n📋 导出日志:');
  console.log(logger.exportLogs());
}

// 高级功能：事件过滤器
class FilteredObserver extends Observer {
  constructor(eventFilter, targetObserver) {
    super();
    this.eventFilter = eventFilter;
    this.targetObserver = targetObserver;
  }
  
  update(event, data) {
    if (this.eventFilter.includes(event)) {
      this.targetObserver.update(event, data);
    }
  }
}

// 使用事件过滤器
function demonstrateFilteredObserver() {
  const generator = new ObservablePDFGenerator();
  const logger = new LoggerObserver();
  
  // 只监听错误和完成事件
  const errorLogger = new FilteredObserver(['error', 'complete'], logger);
  generator.addObserver(errorLogger);
}

/**
 * 🎯 学习成果：
 * 
 * 1. **松耦合设计**：主题和观察者相互独立
 * 2. **事件驱动架构**：通过事件实现组件间通信
 * 3. **可扩展性**：轻松添加新的观察者类型
 * 4. **单一职责**：每个观察者专注于特定功能
 * 5. **实时反馈**：用户可以实时看到处理进度
 * 
 * 💡 实际应用：
 * 1. 在你的PDF生成器中集成进度监控
 * 2. 添加错误处理和重试机制
 * 3. 实现用户取消操作功能
 * 4. 添加性能监控和优化建议
 */

// 运行演示
// demonstrateObserverPattern();

export { 
  ObservablePDFGenerator, 
  ProgressBarObserver, 
  LoggerObserver, 
  StatsObserver 
}; 