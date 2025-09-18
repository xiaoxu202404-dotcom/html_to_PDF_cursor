/**
 * 📚 JavaScript ES6+ 类详解
 * 基于您的 EnhancedPDFGenerator 类来学习现代JavaScript
 */

// 🎯 您在项目中是这样写的：
class EnhancedPDFGenerator {
  constructor() {
    this.pages = [];              // 实例属性
    this.tableOfContents = [];    
    this.processedUrls = new Set(); // ES6 Set数据结构
    this.baseUrl = '';
    this.currentProgress = 0;
    
    this.init(); // 构造函数中调用初始化方法
  }
}

/**
 * 💡 技术要点解析：
 */

// 1️⃣ 构造函数 (Constructor)
console.log('=== 构造函数详解 ===');

class ExampleClass {
  constructor(name, options = {}) {
    // 🔥 现代JS特性：默认参数
    this.name = name;
    this.config = {
      timeout: 5000,
      retries: 3,
      ...options  // 🔥 展开运算符合并配置
    };
    
    // 🔥 私有属性约定 (使用_前缀)
    this._internalState = 'initialized';
    
    console.log(`✅ ${this.name} 实例已创建`);
  }
}

// 2️⃣ ES6 数据结构的选择
console.log('=== 数据结构选择策略 ===');

class DataStructureDemo {
  constructor() {
    // 🎯 您用 Set 来存储已处理的URL - 很明智！
    this.processedUrls = new Set();  // 自动去重，快速查找
    
    // 🆚 对比不同数据结构：
    this.urlsArray = [];             // 数组：有序，允许重复
    this.urlsSet = new Set();        // 集合：无序，自动去重  
    this.urlsMap = new Map();        // 映射：键值对，任意类型的键
    
    this.demonstrateDataStructures();
  }
  
  demonstrateDataStructures() {
    const testUrl = 'https://example.com';
    
    // 📊 性能对比
    console.time('Array查找');
    const existsInArray = this.urlsArray.includes(testUrl);
    console.timeEnd('Array查找');
    
    console.time('Set查找');  
    const existsInSet = this.urlsSet.has(testUrl);
    console.timeEnd('Set查找');
    
    console.log('Set查找更快！适合去重和快速查找场景');
  }
}

// 3️⃣ 方法定义和this绑定
console.log('=== 方法和this绑定 ===');

class MethodDemo {
  constructor() {
    this.data = [];
    
    // 🔥 箭头函数会绑定this（您在项目中大量使用）
    this.processData = (input) => {
      this.data.push(input);
      return this.data.length;
    };
  }
  
  // 🔥 普通方法
  normalMethod() {
    return this.data;
  }
  
  // 🔥 异步方法（您在项目中的核心模式）
  async asyncMethod() {
    console.log('开始异步操作...');
    
    try {
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('异步操作完成！');
      return this.data;
      
    } catch (error) {
      console.error('异步操作失败:', error);
      throw error;
    }
  }
  
  // 🔥 静态方法（工具函数）
  static createInstance(config) {
    console.log('通过静态方法创建实例');
    return new MethodDemo();
  }
}

// 4️⃣ 继承和多态 - 扩展您的项目
console.log('=== 类继承和扩展 ===');

// 基类：通用文档处理器
class DocumentProcessor {
  constructor(options = {}) {
    this.options = options;
    this.processed = 0;
  }
  
  // 🔥 模板方法模式
  async process(document) {
    console.log('🔄 开始处理文档...');
    
    await this.beforeProcess(document);
    const result = await this.doProcess(document);
    await this.afterProcess(result);
    
    this.processed++;
    return result;
  }
  
  // 🔥 钩子方法，子类可以重写
  async beforeProcess(document) {
    console.log('📋 预处理阶段');
  }
  
  // 🔥 抽象方法，子类必须实现
  async doProcess(document) {
    throw new Error('子类必须实现 doProcess 方法');
  }
  
  async afterProcess(result) {
    console.log('✅ 后处理阶段');
  }
}

// 继承您的PDF生成器概念
class ExtendedPDFGenerator extends DocumentProcessor {
  constructor(options) {
    super(options); // 🔥 调用父类构造函数
    
    this.pdfOptions = {
      format: 'A4',
      orientation: 'portrait',
      ...options
    };
  }
  
  // 🔥 实现抽象方法
  async doProcess(document) {
    console.log('📄 生成PDF...');
    
    // 模拟您项目中的处理逻辑
    const html = document.innerHTML;
    const processedHtml = this.cleanupContent(html);
    
    return {
      type: 'pdf',
      content: processedHtml,
      timestamp: Date.now()
    };
  }
  
  // 🔥 重写父类方法
  async beforeProcess(document) {
    await super.beforeProcess(document); // 调用父类方法
    console.log('🎨 优化CSS样式...');
  }
  
  cleanupContent(html) {
    // 简化版的内容清理（基于您的实际代码）
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();
  }
}

// 5️⃣ 实际使用示例
console.log('=== 实际使用演示 ===');

async function demonstrateClasses() {
  // 创建实例
  const pdfGenerator = new ExtendedPDFGenerator({
    format: 'A4',
    includeImages: true
  });
  
  // 模拟文档对象
  const mockDocument = {
    innerHTML: '<h1>测试文档</h1><p>这是内容</p>'
  };
  
  // 处理文档
  const result = await pdfGenerator.process(mockDocument);
  console.log('📊 处理结果:', result);
}

// 运行演示
// demonstrateClasses();

/**
 * 🎯 您在项目中体现的ES6+特性：
 * 
 * ✅ 类语法 (class) - 组织代码结构
 * ✅ 箭头函数 - 简洁的函数表达式和this绑定
 * ✅ 模板字符串 - 字符串插值和多行文本
 * ✅ 解构赋值 - 提取对象和数组的值
 * ✅ 展开运算符 - 数组/对象合并
 * ✅ Promise/async-await - 异步编程
 * ✅ Set/Map - 现代数据结构
 * ✅ 默认参数 - 函数参数默认值
 * 
 * 💡 为什么这些特性重要：
 * 1. **代码可读性** - 现代语法更直观易懂
 * 2. **性能优化** - Set比Array查找快，async比callback清晰
 * 3. **错误预防** - 类型检查和默认值减少bug
 * 4. **团队协作** - 统一的现代代码风格
 */

export { ExtendedPDFGenerator, DataStructureDemo }; 