/**
 * 📚 异步编程深度教学
 * 基于您的HTML转PDF项目中的实际异步处理代码
 */

/**
 * 🎯 1. 您项目中的异步模式分析
 */

console.log('=== 异步编程模式分析 ===');

// 🔥 您在项目中使用的核心异步模式
class AsyncPatternsFromYourProject {
  constructor() {
    this.currentProgress = 0;
    this.totalPages = 0;
  }

  // 🎯 您的批量处理模式（顺序执行）
  async batchFetchPages(pageLinks) {
    const contents = [];
    let successCount = 0;
    let failureCount = 0;
    
    // 🔥 关键决策：您选择了顺序执行而非并发
    // 这是为了避免服务器压力和速率限制
    for (let i = 0; i < pageLinks.length; i++) {
      const link = pageLinks[i];
      this.currentProgress = i + 1;
      
      try {
        // ✅ 单个异步操作
        const content = await this.fetchPageContent(link.url);
        
        if (content && content.textLength > 0) {
          contents.push({
            ...link,          // 🔥 ES6展开运算符
            content: content,
            index: i
          });
          successCount++;
          
        } else {
          // 🎯 优雅的错误处理：即使失败也保持结构
          contents.push({
            ...link,
            content: {
              html: '<p>此页面内容无法获取</p>',
              title: link.title,
              styles: '',
              textLength: 0
            },
            index: i
          });
          failureCount++;
        }
        
      } catch (error) {
        // 🎯 错误不会中断整个流程
        console.error(`❌ 抓取失败: ${link.title}`, error);
        failureCount++;
        
        contents.push({
          ...link,
          content: {
            html: `<p>页面抓取失败: ${error.message}</p>`,
            title: link.title,
            styles: '',
            textLength: 0
          },
          index: i
        });
      }
      
      // 🎯 速率控制：避免请求过于频繁
      await this.delay(300);
    }
    
    return contents;
  }
  
  // 🎯 简单的延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 模拟方法
  async fetchPageContent(url) {
    // 模拟网络请求
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ html: '<div>内容</div>', textLength: 100 });
      }, Math.random() * 1000);
    });
  }
  
  updateProgress(message) {
    console.log('📊', message);
  }
}

/**
 * 🎯 2. 异步编程进阶模式对比
 */

console.log('=== 异步编程模式对比 ===');

class AsyncPatternsComparison {
  
  // 📍 模式1：顺序执行（您项目中的选择）
  async sequentialProcessing(urls) {
    console.log('🔄 顺序执行模式');
    console.time('顺序执行');
    
    const results = [];
    
    for (const url of urls) {
      try {
        const result = await this.fetchData(url);
        results.push(result);
      } catch (error) {
        results.push({ error: error.message, url });
      }
    }
    
    console.timeEnd('顺序执行');
    return results;
  }
  
  // 📍 模式2：并发执行（适合独立任务）
  async parallelProcessing(urls) {
    console.log('⚡ 并发执行模式');
    console.time('并发执行');
    
    // 🔥 Promise.all - 所有成功才成功
    try {
      const promises = urls.map(url => this.fetchData(url));
      const results = await Promise.all(promises);
      console.timeEnd('并发执行');
      return results;
      
    } catch (error) {
      console.timeEnd('并发执行');
      throw new Error(`并发执行中有任务失败: ${error.message}`);
    }
  }
  
  // 📍 模式3：并发执行 + 错误容错（推荐模式）
  async parallelProcessingWithErrorHandling(urls) {
    console.log('🛡️ 容错并发模式');
    console.time('容错并发');
    
    // 🔥 Promise.allSettled - 等待所有完成，无论成败
    const promises = urls.map(async (url) => {
      try {
        const result = await this.fetchData(url);
        return { status: 'fulfilled', value: result, url };
      } catch (error) {
        return { status: 'rejected', reason: error.message, url };
      }
    });
    
    const settledResults = await Promise.allSettled(promises);
    
    const results = settledResults.map(result => {
      if (result.status === 'fulfilled') {
        return result.value.value;
      } else {
        return { error: result.reason, url: result.value?.url };
      }
    });
    
    console.timeEnd('容错并发');
    return results;
  }
  
  // 📍 模式4：分批并发处理（大量数据的最佳选择）
  async batchParallelProcessing(urls, batchSize = 5) {
    console.log('📦 分批并发模式');
    console.time('分批并发');
    
    const results = [];
    
    // 🔥 将URL分批
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      console.log(`处理批次 ${Math.floor(i / batchSize) + 1}: ${batch.length} 个任务`);
      
      // 每批使用容错并发
      const batchPromises = batch.map(async (url) => {
        try {
          return await this.fetchData(url);
        } catch (error) {
          return { error: error.message, url };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value));
      
      // 批次间暂停（避免服务器压力）
      if (i + batchSize < urls.length) {
        await this.delay(200);
      }
    }
    
    console.timeEnd('分批并发');
    return results;
  }
  
  // 🎯 模拟网络请求
  async fetchData(url) {
    const delay = Math.random() * 1000 + 200; // 200-1200ms随机延迟
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 10%概率失败，模拟网络错误
        if (Math.random() < 0.1) {
          reject(new Error(`Network error for ${url}`));
        } else {
          resolve({ url, data: `Data from ${url}`, size: Math.floor(Math.random() * 10000) });
        }
      }, delay);
    });
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 🎯 3. 错误处理策略详解
 */

console.log('=== 错误处理策略 ===');

class ErrorHandlingStrategies {
  
  // 🎯 您项目中的错误处理模式
  async robustErrorHandling(url) {
    try {
      // 主要逻辑
      const content = await this.fetchPageContent(url);
      
      if (!content || content.textLength === 0) {
        // ✅ 优雅降级：返回占位内容而非抛出错误
        return {
          html: '<p>此页面内容无法获取</p>',
          title: '内容获取失败',
          styles: '',
          textLength: 0,
          status: 'empty'
        };
      }
      
      return { ...content, status: 'success' };
      
    } catch (error) {
      console.error('页面获取失败:', error);
      
      // ✅ 返回错误信息而不是抛出异常，保持流程继续
      return {
        html: `<div class="error">
          <h3>页面加载失败</h3>
          <p>URL: ${url}</p>
          <p>错误: ${error.message}</p>
          <p>时间: ${new Date().toLocaleString()}</p>
        </div>`,
        title: '页面加载失败',
        styles: '.error { color: red; border: 1px solid red; padding: 10px; }',
        textLength: 0,
        status: 'error',
        originalError: error.message
      };
    }
  }
  
  // 🎯 重试机制（带指数退避）
  async withRetry(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 尝试 ${attempt}/${maxRetries}`);
        
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ 重试成功`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          console.error(`💥 重试${maxRetries}次后仍然失败`);
          break;
        }
        
        // 🔥 指数退避：每次等待时间翻倍
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`❌ 尝试 ${attempt} 失败，${delay}ms 后重试...`, error.message);
        
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }
  
  // 🎯 超时控制
  async withTimeout(promise, timeoutMs = 10000) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`操作超时 (${timeoutMs}ms)`));
      }, timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }
  
  // 🎯 综合使用：超时 + 重试 + 错误处理
  async robustFetch(url) {
    const operation = async () => {
      // 带超时的fetch
      const response = await this.withTimeout(
        fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PDFBot/1.0)'
          }
        }),
        8000  // 8秒超时
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
    };
    
    // 带重试的操作
    return await this.withRetry(operation, 3, 1000);
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 模拟方法
  async fetchPageContent(url) {
    if (Math.random() < 0.3) {
      throw new Error('模拟网络错误');
    }
    return { html: '<div>内容</div>', textLength: 100 };
  }
}

/**
 * 🎯 4. 实际性能对比演示
 */

console.log('=== 性能对比演示 ===');

async function performanceComparison() {
  const testUrls = Array.from({ length: 10 }, (_, i) => `https://example.com/page${i + 1}`);
  const comparison = new AsyncPatternsComparison();
  
  console.log('🧪 开始性能测试...\n');
  
  // 测试1：顺序执行
  console.log('📊 测试1: 顺序执行');
  const sequentialResults = await comparison.sequentialProcessing(testUrls);
  console.log(`结果: ${sequentialResults.length} 个完成\n`);
  
  // 测试2：并发执行
  console.log('📊 测试2: 并发执行');
  try {
    const parallelResults = await comparison.parallelProcessing(testUrls);
    console.log(`结果: ${parallelResults.length} 个完成\n`);
  } catch (error) {
    console.log(`结果: 执行失败 - ${error.message}\n`);
  }
  
  // 测试3：容错并发
  console.log('📊 测试3: 容错并发');
  const tolerantResults = await comparison.parallelProcessingWithErrorHandling(testUrls);
  const successCount = tolerantResults.filter(r => !r.error).length;
  console.log(`结果: ${successCount}/${tolerantResults.length} 个成功\n`);
  
  // 测试4：分批并发
  console.log('📊 测试4: 分批并发');
  const batchResults = await comparison.batchParallelProcessing(testUrls, 3);
  const batchSuccessCount = batchResults.filter(r => !r.error).length;
  console.log(`结果: ${batchSuccessCount}/${batchResults.length} 个成功\n`);
  
  console.log('🎯 性能测试完成！');
}

// 运行演示
// performanceComparison();

/**
 * 🎯 5. 您项目的实际应用场景分析
 */

console.log('=== 实际应用场景分析 ===');

class RealWorldApplications {
  
  // 🎯 为什么您选择顺序执行？
  analyzeYourChoice() {
    console.log('🤔 为什么HTML转PDF项目选择顺序执行？');
    
    const reasons = [
      '🌐 避免对目标服务器造成过大压力',
      '📊 便于进度跟踪和用户反馈',
      '🛡️ 减少被服务器限流的风险',
      '🔄 更容易处理依赖关系（如果存在）',
      '💾 控制内存使用（不会同时处理太多页面）',
      '🐛 更容易调试和定位问题'
    ];
    
    reasons.forEach(reason => console.log(reason));
    
    console.log('\n✅ 这是一个明智的选择！');
  }
  
  // 🎯 什么时候应该选择并发？
  whenToUseConcurrency() {
    console.log('\n🚀 什么时候应该选择并发执行？');
    
    const scenarios = [
      {
        scene: '🔍 搜索聚合',
        description: '同时查询多个搜索引擎',
        pattern: '并发 + 超时控制'
      },
      {
        scene: '📊 数据分析',
        description: '处理大量独立的数据文件',
        pattern: '分批并发'
      },
      {
        scene: '🖼️ 图片处理',
        description: '批量压缩或转换图片',
        pattern: '并发 + Worker线程'
      },
      {
        scene: '✅ API测试',
        description: '测试多个API端点',
        pattern: '容错并发'
      }
    ];
    
    scenarios.forEach(s => {
      console.log(`${s.scene}: ${s.description} → ${s.pattern}`);
    });
  }
}

/**
 * 🎯 您项目中体现的异步编程最佳实践：
 * 
 * ✅ **错误容错** - 单个失败不影响整体流程
 * ✅ **进度反馈** - 实时显示处理进度给用户
 * ✅ **速率控制** - 避免对服务器造成压力
 * ✅ **优雅降级** - 失败时提供有意义的占位内容
 * ✅ **资源管理** - 顺序处理控制内存使用
 * ✅ **统计信息** - 记录成功/失败数量便于分析
 * 
 * 💡 异步编程的核心思想：
 * 1. **非阻塞** - 不要让等待停止程序运行
 * 2. **错误隔离** - 一个任务的失败不应该影响其他任务
 * 3. **用户体验** - 提供反馈让用户知道程序在工作
 * 4. **性能平衡** - 在速度和资源使用间找到平衡点
 */

const examples = new RealWorldApplications();
examples.analyzeYourChoice();
examples.whenToUseConcurrency();

export { AsyncPatternsFromYourProject, AsyncPatternsComparison, ErrorHandlingStrategies }; 