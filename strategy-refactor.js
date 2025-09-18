/**
 * 策略模式重构示例 - 内容提取策略
 * 
 * 学习目标：
 * 1. 理解策略模式的应用场景
 * 2. 掌握面向对象设计原则
 * 3. 提高代码的可扩展性
 */

// 抽象策略接口
class ContentExtractionStrategy {
  /**
   * 提取页面内容的抽象方法
   * @param {Document} doc - HTML文档对象
   * @returns {Object} 提取结果
   */
  extract(doc) {
    throw new Error('子类必须实现extract方法');
  }
  
  /**
   * 验证是否适用于当前页面
   * @param {Document} doc - HTML文档对象
   * @returns {boolean} 是否适用
   */
  isApplicable(doc) {
    throw new Error('子类必须实现isApplicable方法');
  }
}

// 具体策略1：GitBook文档提取
class GitBookStrategy extends ContentExtractionStrategy {
  extract(doc) {
    const mainContent = doc.querySelector('.book-body .page-inner');
    const navigation = doc.querySelectorAll('.summary a');
    
    return {
      title: doc.querySelector('h1')?.textContent || 'Untitled',
      content: mainContent?.innerHTML || '',
      links: Array.from(navigation).map(a => ({
        text: a.textContent,
        url: a.href
      }))
    };
  }
  
  isApplicable(doc) {
    return doc.querySelector('.book-body') !== null;
  }
}

// 具体策略2：VuePress文档提取
class VuePressStrategy extends ContentExtractionStrategy {
  extract(doc) {
    const mainContent = doc.querySelector('.theme-container .page');
    const sidebar = doc.querySelectorAll('.sidebar-links a');
    
    return {
      title: doc.querySelector('.page-title, h1')?.textContent || 'Untitled',
      content: mainContent?.innerHTML || '',
      links: Array.from(sidebar).map(a => ({
        text: a.textContent,
        url: a.href
      }))
    };
  }
  
  isApplicable(doc) {
    return doc.querySelector('.theme-container') !== null;
  }
}

// 具体策略3：通用文档提取
class GenericStrategy extends ContentExtractionStrategy {
  extract(doc) {
    // 启发式选择器
    const selectors = [
      'main', 'article', '.content', '.main-content',
      '#content', '#main', '.post-content'
    ];
    
    let mainContent = null;
    for (const selector of selectors) {
      mainContent = doc.querySelector(selector);
      if (mainContent) break;
    }
    
    const navigation = doc.querySelectorAll('nav a, .nav a, .sidebar a');
    
    return {
      title: doc.title || 'Untitled',
      content: mainContent?.innerHTML || doc.body.innerHTML,
      links: Array.from(navigation).map(a => ({
        text: a.textContent,
        url: a.href
      }))
    };
  }
  
  isApplicable(doc) {
    return true; // 通用策略，适用于所有页面
  }
}

// 策略管理器
class ContentExtractor {
  constructor() {
    this.strategies = [
      new GitBookStrategy(),
      new VuePressStrategy(),
      new GenericStrategy() // 放在最后作为兜底
    ];
  }
  
  /**
   * 自动选择合适的提取策略
   * @param {Document} doc - HTML文档对象
   * @returns {ContentExtractionStrategy} 选中的策略
   */
  selectStrategy(doc) {
    for (const strategy of this.strategies) {
      if (strategy.isApplicable(doc)) {
        console.log(`使用策略: ${strategy.constructor.name}`);
        return strategy;
      }
    }
    return this.strategies[this.strategies.length - 1]; // 兜底策略
  }
  
  /**
   * 提取页面内容
   * @param {Document} doc - HTML文档对象
   * @returns {Object} 提取结果
   */
  extract(doc) {
    const strategy = this.selectStrategy(doc);
    return strategy.extract(doc);
  }
  
  /**
   * 添加新的提取策略
   * @param {ContentExtractionStrategy} strategy - 新策略
   */
  addStrategy(strategy) {
    // 插入到通用策略之前
    this.strategies.splice(-1, 0, strategy);
  }
}

// 使用示例
class ImprovedPDFGenerator {
  constructor() {
    this.contentExtractor = new ContentExtractor();
  }
  
  async processPage(url) {
    try {
      // 获取页面HTML
      const response = await this.fetchPage(url);
      if (!response.success) {
        throw new Error(`获取页面失败: ${url}`);
      }
      
      // 解析HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.html, 'text/html');
      
      // 使用策略模式提取内容
      const extractedData = this.contentExtractor.extract(doc);
      
      console.log('📄 页面处理完成:', {
        url,
        title: extractedData.title,
        contentLength: extractedData.content.length,
        linksCount: extractedData.links.length
      });
      
      return extractedData;
      
    } catch (error) {
      console.error('❌ 页面处理失败:', url, error);
      return { success: false, error: error.message };
    }
  }
  
  async fetchPage(url) {
    // 这里调用原有的fetchPageViaBackground方法
    // 为了示例简化，直接返回模拟数据
    return { success: true, html: '<html>...</html>' };
  }
}

// 如何扩展：添加新的文档类型支持
class DocsifyStrategy extends ContentExtractionStrategy {
  extract(doc) {
    const mainContent = doc.querySelector('#main');
    const sidebar = doc.querySelectorAll('.sidebar-nav a');
    
    return {
      title: doc.querySelector('h1')?.textContent || 'Untitled',
      content: mainContent?.innerHTML || '',
      links: Array.from(sidebar).map(a => ({
        text: a.textContent,
        url: a.href
      }))
    };
  }
  
  isApplicable(doc) {
    return doc.querySelector('#main') !== null && 
           doc.querySelector('.sidebar-nav') !== null;
  }
}

// 使用新策略
const generator = new ImprovedPDFGenerator();
generator.contentExtractor.addStrategy(new DocsifyStrategy());

/**
 * 🎯 学习成果：
 * 
 * 1. **策略模式应用**：不同文档类型使用不同提取策略
 * 2. **开闭原则**：可以添加新策略而无需修改现有代码
 * 3. **责任分离**：每个策略专注于特定类型的文档
 * 4. **可测试性**：每个策略可以独立测试
 * 5. **可扩展性**：轻松支持新的文档格式
 * 
 * 💡 下一步：
 * 1. 将这个重构应用到你的现有项目中
 * 2. 为每种策略编写单元测试
 * 3. 添加更多文档类型的支持
 */

export { ContentExtractor, ImprovedPDFGenerator }; 