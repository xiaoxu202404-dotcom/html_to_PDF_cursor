/**
 * 高级功能模块集合
 * 
 * 学习目标：
 * 1. 配置管理和用户偏好
 * 2. 缓存系统和性能优化
 * 3. 错误处理和重试机制
 * 4. 插件系统和扩展性
 */

// 1. 配置管理系统
class ConfigManager {
  constructor() {
    this.defaultConfig = {
      // PDF设置
      pdf: {
        pageSize: 'A4',
        orientation: 'portrait',
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
        includeImages: true,
        includeLinks: true,
        fontSize: '12pt',
        fontFamily: 'Arial, sans-serif'
      },
      
      // 抓取设置
      crawler: {
        maxConcurrency: 5,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        userAgent: 'PDF Generator Bot 1.0'
      },
      
      // 用户界面
      ui: {
        theme: 'light',
        language: 'zh-CN',
        showProgress: true,
        enableNotifications: true
      }
    };
    
    this.config = { ...this.defaultConfig };
  }
  
  /**
   * 加载配置
   */
  async load() {
    try {
      const stored = await chrome.storage.local.get('pdfGeneratorConfig');
      if (stored.pdfGeneratorConfig) {
        this.config = this.mergeDeep(this.defaultConfig, stored.pdfGeneratorConfig);
      }
    } catch (error) {
      console.warn('加载配置失败，使用默认配置:', error);
    }
  }
  
  /**
   * 保存配置
   */
  async save() {
    try {
      await chrome.storage.local.set({ pdfGeneratorConfig: this.config });
      console.log('✅ 配置已保存');
    } catch (error) {
      console.error('❌ 保存配置失败:', error);
    }
  }
  
  /**
   * 获取配置值
   */
  get(path) {
    return this.getNestedValue(this.config, path);
  }
  
  /**
   * 设置配置值
   */
  set(path, value) {
    this.setNestedValue(this.config, path, value);
    this.save(); // 自动保存
  }
  
  /**
   * 重置为默认配置
   */
  reset() {
    this.config = { ...this.defaultConfig };
    this.save();
  }
  
  // 工具方法
  mergeDeep(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }
  
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

// 2. 缓存系统
class CacheManager {
  constructor(maxSize = 100, ttl = 3600000) { // 1小时默认TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }
  
  /**
   * 获取缓存
   */
  async get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // 检查过期时间
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // 更新访问时间（LRU）
    item.lastAccess = Date.now();
    
    console.log(`📥 缓存命中: ${key}`);
    return item.data;
  }
  
  /**
   * 设置缓存
   */
  async set(key, data) {
    // 检查缓存大小，必要时清理
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }
    
    const item = {
      data,
      expiry: Date.now() + this.ttl,
      lastAccess: Date.now(),
      size: this.calculateSize(data)
    };
    
    this.cache.set(key, item);
    console.log(`💾 数据已缓存: ${key}`);
  }
  
  /**
   * 删除缓存
   */
  delete(key) {
    return this.cache.delete(key);
  }
  
  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    const toDelete = [];
    
    // 找出过期项
    for (const [key, item] of this.cache) {
      if (now > item.expiry) {
        toDelete.push(key);
      }
    }
    
    // 如果过期项不够，按LRU删除
    if (toDelete.length < this.maxSize * 0.2) {
      const sortedItems = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.lastAccess - b.lastAccess);
      
      const additionalDeletes = Math.ceil(this.maxSize * 0.2) - toDelete.length;
      for (let i = 0; i < additionalDeletes; i++) {
        toDelete.push(sortedItems[i][0]);
      }
    }
    
    // 执行删除
    toDelete.forEach(key => this.cache.delete(key));
    
    console.log(`🧹 清理了 ${toDelete.length} 个缓存项`);
  }
  
  /**
   * 获取缓存统计
   */
  getStats() {
    let totalSize = 0;
    let expiredCount = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache) {
      totalSize += item.size;
      if (now > item.expiry) expiredCount++;
    }
    
    return {
      总条目: this.cache.size,
      最大容量: this.maxSize,
      使用率: `${Math.round((this.cache.size / this.maxSize) * 100)}%`,
      总大小: this.formatSize(totalSize),
      过期条目: expiredCount
    };
  }
  
  calculateSize(data) {
    return JSON.stringify(data).length * 2; // 粗略估算
  }
  
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
  }
}

// 3. 重试机制
class RetryManager {
  constructor(maxAttempts = 3, baseDelay = 1000) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
  }
  
  /**
   * 执行带重试的操作
   */
  async execute(operation, context = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        console.log(`🔄 尝试 ${attempt}/${this.maxAttempts}: ${context.description || '执行操作'}`);
        
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ 重试成功: ${context.description || '操作完成'}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        console.warn(`❌ 尝试 ${attempt} 失败:`, error.message);
        
        // 如果不是最后一次尝试，则等待后重试
        if (attempt < this.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          console.log(`⏳ ${delay}ms 后重试...`);
          await this.wait(delay);
        }
      }
    }
    
    // 所有尝试都失败了
    console.error(`💥 所有重试都失败了: ${context.description || '操作失败'}`);
    throw new Error(`操作失败，已尝试 ${this.maxAttempts} 次。最后错误: ${lastError.message}`);
  }
  
  /**
   * 计算延迟时间（指数退避）
   */
  calculateDelay(attempt) {
    // 指数退避 + 随机抖动
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // 最大30秒
  }
  
  /**
   * 等待指定时间
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 4. 插件系统
class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
  }
  
  /**
   * 注册插件
   */
  register(name, plugin) {
    if (this.plugins.has(name)) {
      throw new Error(`插件 ${name} 已存在`);
    }
    
    // 验证插件接口
    if (typeof plugin.init !== 'function') {
      throw new Error(`插件 ${name} 缺少 init 方法`);
    }
    
    this.plugins.set(name, plugin);
    
    // 初始化插件
    plugin.init(this);
    
    console.log(`🔌 插件已注册: ${name}`);
  }
  
  /**
   * 卸载插件
   */
  unregister(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;
    
    // 清理插件注册的钩子
    for (const [hookName, callbacks] of this.hooks) {
      this.hooks.set(hookName, callbacks.filter(cb => cb.plugin !== name));
    }
    
    // 调用插件的清理方法
    if (typeof plugin.cleanup === 'function') {
      plugin.cleanup();
    }
    
    this.plugins.delete(name);
    console.log(`🔌 插件已卸载: ${name}`);
    return true;
  }
  
  /**
   * 注册钩子
   */
  addHook(hookName, callback, pluginName) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    
    this.hooks.get(hookName).push({
      callback,
      plugin: pluginName
    });
  }
  
  /**
   * 触发钩子
   */
  async trigger(hookName, ...args) {
    const callbacks = this.hooks.get(hookName) || [];
    const results = [];
    
    for (const { callback } of callbacks) {
      try {
        const result = await callback(...args);
        results.push(result);
      } catch (error) {
        console.error(`钩子 ${hookName} 执行失败:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * 获取插件列表
   */
  getPlugins() {
    return Array.from(this.plugins.keys());
  }
}

// 插件示例：图片优化插件
class ImageOptimizerPlugin {
  init(pluginManager) {
    this.pluginManager = pluginManager;
    
    // 注册钩子
    pluginManager.addHook('beforeProcessContent', this.optimizeImages.bind(this), 'ImageOptimizer');
    pluginManager.addHook('afterProcessContent', this.reportImageStats.bind(this), 'ImageOptimizer');
  }
  
  async optimizeImages(content) {
    const images = content.querySelectorAll('img');
    let optimizedCount = 0;
    
    for (const img of images) {
      // 模拟图片优化
      if (img.src && !img.hasAttribute('data-optimized')) {
        // 这里可以实现真实的图片压缩逻辑
        img.setAttribute('data-optimized', 'true');
        optimizedCount++;
      }
    }
    
    console.log(`🖼️ 优化了 ${optimizedCount} 张图片`);
    return content;
  }
  
  async reportImageStats(content) {
    const images = content.querySelectorAll('img');
    console.log(`📊 图片统计: 共 ${images.length} 张图片`);
  }
  
  cleanup() {
    console.log('🧹 ImageOptimizer 插件已清理');
  }
}

// 5. 综合使用示例
class AdvancedPDFGenerator {
  constructor() {
    this.config = new ConfigManager();
    this.cache = new CacheManager();
    this.retry = new RetryManager();
    this.plugins = new PluginManager();
    
    this.init();
  }
  
  async init() {
    // 加载配置
    await this.config.load();
    
    // 注册插件
    this.plugins.register('ImageOptimizer', new ImageOptimizerPlugin());
    
    console.log('🚀 高级PDF生成器初始化完成');
  }
  
  async processPage(url) {
    const cacheKey = `page:${url}`;
    
    // 尝试从缓存获取
    let pageData = await this.cache.get(cacheKey);
    
    if (!pageData) {
      // 缓存未命中，执行带重试的获取
      pageData = await this.retry.execute(
        () => this.fetchPageWithTimeout(url),
        { description: `获取页面 ${url}` }
      );
      
      // 缓存结果
      await this.cache.set(cacheKey, pageData);
    }
    
    // 触发插件钩子
    await this.plugins.trigger('beforeProcessContent', pageData.content);
    
    // 处理内容
    const processedContent = this.processContent(pageData.content);
    
    // 触发处理后钩子
    await this.plugins.trigger('afterProcessContent', processedContent);
    
    return processedContent;
  }
  
  async fetchPageWithTimeout(url) {
    const timeout = this.config.get('crawler.timeout');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.get('crawler.userAgent')
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      return { url, html, content: this.parseHTML(html) };
      
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  parseHTML(html) {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }
  
  processContent(content) {
    // 这里实现内容处理逻辑
    return content;
  }
  
  /**
   * 获取系统状态
   */
  getStatus() {
    return {
      配置: this.config.get('ui'),
      缓存: this.cache.getStats(),
      插件: this.plugins.getPlugins(),
      内存使用: `${Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024 || 0)} MB`
    };
  }
}

/**
 * 🎯 学习成果：
 * 
 * 1. **配置管理**：用户偏好持久化存储
 * 2. **缓存系统**：LRU策略和TTL过期机制
 * 3. **重试机制**：指数退避和抖动算法
 * 4. **插件架构**：钩子系统和扩展能力
 * 5. **性能监控**：内存使用和统计报告
 * 
 * 💡 实际应用场景：
 * 1. 大型Web应用的架构设计
 * 2. 浏览器扩展的功能扩展
 * 3. 企业级工具的可配置性
 * 4. 分布式系统的容错处理
 */

export { 
  ConfigManager, 
  CacheManager, 
  RetryManager, 
  PluginManager, 
  AdvancedPDFGenerator 
}; 