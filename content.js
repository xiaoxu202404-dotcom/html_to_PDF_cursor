/**
 * HTML转PDF电子书生成器 - 增强版
 * 
 * 支持批量抓取整个文档站点，生成完整的PDF电子书
 * 技术特点：
 * 1. 自动发现和遍历目录结构
 * 2. 批量抓取多个页面内容
 * 3. 智能内容合并和排版
 * 4. 生成带书签的完整PDF
 */

class EnhancedPDFGenerator {
  constructor() {
    this.pages = [];
    this.tableOfContents = [];
    this.processedUrls = new Set();
    this.baseUrl = '';
    this.currentProgress = 0;
    this.totalPages = 0;
    
    // 图片处理相关
    this.imageMap = new Map(); // 原始URL -> {localPath, blob, fileName}
    this.imageCounter = 0;
    this.failedImages = []; // 失败的图片列表 {url, error, pageTitle, altText}
    
    this.init();
  }
  
  init() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }
  
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getPageInfo':
          const pageInfo = this.extractPageInfo();
          sendResponse(pageInfo);
          break;
          
        case 'generatePDF':
          await this.generateCompletePDF(request.options);
          sendResponse({ success: true });
          break;
          
        case 'generateMarkdown':
          await this.generateCompleteMarkdown(request.options);
          sendResponse({ success: true });
          break;

        case 'previewContent':
          const preview = this.generatePreview();
          sendResponse({ success: true, preview });
          break;
          
        default:
          sendResponse({ error: '未知操作' });
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ error: error.message });
    }
  }
  
  extractPageInfo() {
    const title = document.title || '未命名文档';
    const url = window.location.href;
    
    // 分析导航结构，发现所有相关页面
    const navigationLinks = this.discoverAllPages();
    
    return {
      title,
      url,
      navigationLinks: navigationLinks.length,
      estimatedPages: navigationLinks.length,
      timestamp: Date.now()
    };
  }
  
  /**
   * 发现所有相关页面
   * 通过分析导航菜单自动发现整个文档站点的结构
   */
  discoverAllPages() {
    console.log('🔍 开始发现文档站点结构...');
    
    const links = [];
    this.baseUrl = new URL(window.location.href).origin;
    
    // 查找导航区域
    const navSelectors = [
      'nav a[href]',
      '.sidebar a[href]',
      '.menu a[href]', 
      '.navigation a[href]',
      '.toc a[href]',
      '.table-of-contents a[href]',
      '.nav-list a[href]'
    ];
    
    navSelectors.forEach(selector => {
      const navLinks = document.querySelectorAll(selector);
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (this.isValidDocumentLink(href)) {
          const fullUrl = this.resolveUrl(href);
          const title = link.textContent.trim();
          const level = this.calculateLinkLevel(link);
          
          if (!links.some(l => l.url === fullUrl)) {
            links.push({
              url: fullUrl,
              title: title,
              level: level,
              element: link
            });
          }
        }
      });
    });
    
    // 按层级和顺序排序
    links.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      // 保持文档中的出现顺序
      return 0;
    });
    
    console.log(`📋 发现 ${links.length} 个相关页面`);
    return links;
  }
  
  isValidDocumentLink(href) {
    if (!href) return false;
    
    // 排除外部链接、锚点链接、非文档链接
    const excludePatterns = [
      /^https?:\/\/(?!.*duruofu\.github\.io)/i, // 外部链接
      /^javascript:/i,
      /^mailto:/i,
      /^tel:/i,
      /\.(pdf|jpg|jpeg|png|gif|zip|rar)$/i, // 非HTML文件
      /#$/,  // 纯锚点
    ];
    
    return !excludePatterns.some(pattern => pattern.test(href));
  }
  
  resolveUrl(href) {
    try {
      return new URL(href, window.location.href).href;
    } catch {
      return href;
    }
  }
  
  calculateLinkLevel(linkElement) {
    // 通过CSS类名或嵌套深度计算层级
    let level = 1;
    let parent = linkElement.parentElement;
    
    while (parent && !parent.matches('nav, .sidebar, .menu')) {
      if (parent.matches('li, .nav-item')) {
        level++;
      }
      parent = parent.parentElement;
    }
    
    // 也可以通过CSS类名判断
    const classList = linkElement.className.toLowerCase();
    if (classList.includes('level-2') || classList.includes('sub')) level = 2;
    if (classList.includes('level-3') || classList.includes('subsub')) level = 3;
    
    return Math.min(level, 6); // 最多6级
  }
  
  /**
   * 生成完整的PDF电子书
   * 批量抓取所有页面并合并成一个PDF
   */
  async generateCompletePDF(options) {
    try {
      console.log('🚀 开始生成完整PDF电子书...');
      
      // 显示进度面板
      this.showProgressPanel();
      
      // 发现所有页面
      const allPages = this.discoverAllPages();
      this.totalPages = allPages.length;
      
      if (allPages.length === 0) {
        throw new Error('未发现任何相关页面，请检查页面结构');
      }
      
      this.updateProgress(`发现 ${allPages.length} 个页面，开始抓取内容...`);
      
      // 批量抓取所有页面内容
      const pageContents = await this.batchFetchPages(allPages);
      
      // 生成完整的PDF
      await this.createCompletePDF(pageContents, options);
      
    } catch (error) {
      console.error('PDF生成失败:', error);
      this.showError(error.message);
      throw error;
    }
  }

  /**
   * 生成完整的Markdown文档（带图片打包）
   */
  async generateCompleteMarkdown(options) {
    try {
      console.log('🚀 开始生成完整Markdown文档...');
      this.showProgressPanel();
      
      // 重置图片映射和失败列表
      this.imageMap.clear();
      this.imageCounter = 0;
      this.failedImages = [];
      
      const allPages = this.discoverAllPages();
      this.totalPages = allPages.length;
      
      if (allPages.length === 0) {
        throw new Error('未发现任何相关页面，请检查页面结构');
      }
      
      this.updateProgress(`发现 ${allPages.length} 个页面，开始抓取内容...`);
      
      const pageContents = await this.batchFetchPages(allPages);
      
      // ========== 新增：收集所有图片 ==========
      this.updateProgress('正在分析页面中的图片...');
      const allImageInfos = [];
      
      for (const page of pageContents) {
        if (page.content && page.content.html) {
          const images = await this.collectImagesFromHTML(page.content.html, page.title);
          allImageInfos.push(...images);
        }
      }
      
      // 去重（基于 URL）
      const imageUrlMap = new Map();
      for (const imgInfo of allImageInfos) {
        if (!imageUrlMap.has(imgInfo.url)) {
          imageUrlMap.set(imgInfo.url, imgInfo);
        }
      }
      const uniqueImages = Array.from(imageUrlMap.values());
      console.log(`📊 共发现 ${uniqueImages.length} 张唯一图片`);
      
      // 下载所有图片
      let downloadedImages = [];
      if (uniqueImages.length > 0) {
        this.updateProgress(`发现 ${uniqueImages.length} 张图片，开始下载...`);
        const imageUrls = uniqueImages.map(img => img.url);
        downloadedImages = await this.batchDownloadImages(imageUrls);
        
        // 更新失败图片的上下文信息
        for (const failedImg of this.failedImages) {
          const imgInfo = uniqueImages.find(img => img.url === failedImg.url);
          if (imgInfo) {
            failedImg.altText = imgInfo.altText;
            failedImg.context = imgInfo.context;
            failedImg.pageTitle = imgInfo.pageTitle;
          }
        }
      }
      
      // ========== 转换内容为 Markdown ==========
      this.updateProgress('正在转换内容为Markdown...');
      
      let completeMarkdown = `# ${options.title}\n\n`;
      
      if (downloadedImages.length > 0) {
        completeMarkdown += `> 📝 本文档包含 ${downloadedImages.length} 张本地图片\n\n`;
      }
      
      // 生成目录
      if (pageContents.length > 1) {
        completeMarkdown += `## 目录\n\n`;
        pageContents.forEach((page) => {
          const indent = '  '.repeat(Math.max(0, (page.level || 1) - 1));
          const title = page.title || '未命名页面';
          const anchor = title.trim().toLowerCase().replace(/[\s\W]+/g, '-').replace(/^-+|-+$/g, '');
          completeMarkdown += `${indent}* [${title}](#${anchor})\n`;
        });
        completeMarkdown += `\n`;
      }

      for (let i = 0; i < pageContents.length; i++) {
        const page = pageContents[i];
        this.currentProgress = i + 1;
        this.updateProgress(`正在转换: ${page.title} (${this.currentProgress}/${this.totalPages})`);

        if (page.content) {
            const level = 1; // 在Markdown中，每个文档都作为一级标题
            const heading = '#'.repeat(level);
            completeMarkdown += `${heading} ${page.title || '未命名页面'}\n\n`;
            
            const markdownContent = this.htmlToMarkdown(page.content.html);
            completeMarkdown += markdownContent + '\n\n---\n\n';
        }
      }
      
      // ========== 新增：替换图片路径 ==========
      if (downloadedImages.length > 0) {
        this.updateProgress('正在更新图片路径...');
        completeMarkdown = this.replaceImagePaths(completeMarkdown);
      }
      
      // ========== 新增：打包为 ZIP 文件 ==========
      if (downloadedImages.length > 0) {
        this.updateProgress('正在打包文件...');
        await this.downloadMarkdownWithImages(completeMarkdown, options.title, downloadedImages);
      } else {
        // 如果没有图片，直接下载 Markdown 文件
        this.downloadMarkdown(completeMarkdown, `${options.title}.md`);
      }
      
      this.hideProgressPanel();
      console.log('✅ Markdown文档生成完成');

    } catch (error) {
      console.error('Markdown生成失败:', error);
      this.showError(error.message);
      throw error;
    }
  }

  /**
   * 下载Markdown文件
   */
  downloadMarkdown(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 下载 Markdown 文件和图片（打包为 ZIP）
   * 使用 JSZip 将 Markdown 文件和 images 文件夹打包成一个 ZIP 文件
   */
  async downloadMarkdownWithImages(markdownContent, title, downloadedImages) {
    try {
      console.log('📦 开始打包文件...');
      console.log(`📄 Markdown 内容长度: ${markdownContent.length} 字符`);
      console.log(`🖼️  图片数量: ${downloadedImages.length}`);
      
      // 清理文件名，移除不安全字符
      const safeTitle = this.sanitizeFileName(title);
      console.log(`📝 文件名: ${safeTitle}.md`);
      
      // 创建 ZIP 对象
      const zip = new JSZip();
      
      // 添加 Markdown 文件到 ZIP 根目录
      zip.file(`${safeTitle}.md`, markdownContent);
      console.log(`✅ 已添加 Markdown 文件: ${safeTitle}.md`);
      
      // 创建 images 文件夹并添加所有图片
      const imagesFolder = zip.folder('images');
      let imageCount = 0;
      for (const imageInfo of downloadedImages) {
        if (imageInfo && imageInfo.blob && imageInfo.fileName) {
          imagesFolder.file(imageInfo.fileName, imageInfo.blob);
          imageCount++;
          console.log(`  ✅ 添加图片 ${imageCount}/${downloadedImages.length}: ${imageInfo.fileName}`);
        }
      }
      
      // 如果有失败的图片，生成失败报告
      const failureReport = this.generateFailureReport();
      if (failureReport) {
        zip.file(`⚠️ 图片失败报告.md`, failureReport);
        console.log(`⚠️  已添加失败报告: ${this.failedImages.length} 张图片需要手动处理`);
      }
      
      // 生成 ZIP 文件
      console.log('🔄 正在压缩文件...');
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6 // 压缩级别 1-9，6 是平衡选项
        }
      });
      
      console.log(`📦 ZIP 大小: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);
      
      // 下载 ZIP 文件
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTitle}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`✅ ZIP 文件已生成: ${safeTitle}.zip (包含 1 个 Markdown 文件 + ${imageCount} 张图片)`);
    } catch (error) {
      console.error('❌ 打包文件失败:', error);
      throw new Error(`打包失败: ${error.message}`);
    }
  }

  /**
   * 清理文件名，移除不安全字符
   * Windows 文件名不能包含: \ / : * ? " < > |
   */
  sanitizeFileName(filename) {
    // 移除不安全字符
    let safe = filename.replace(/[\\/:*?"<>|]/g, '-');
    // 移除多余的空格和破折号
    safe = safe.replace(/\s+/g, ' ').replace(/-+/g, '-').trim();
    // 限制长度（Windows 路径限制）
    if (safe.length > 100) {
      safe = safe.substring(0, 100);
    }
    return safe || 'document';
  }

  /**
   * HTML转Markdown
   */
  htmlToMarkdown(htmlString) {
      if (!htmlString) return '';
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      return this._convertNodeToMarkdown(doc.body);
  }

  _convertNodeToMarkdown(node, listState = {}) {
      if (node.nodeType === Node.TEXT_NODE) {
          if (node.parentNode.closest('pre, code')) {
              return node.textContent;
          }
          return node.textContent.replace(/(\r\n|\n|\r)/gm, " ").replace(/\s+/g, ' ');
      }

      if (node.nodeType !== Node.ELEMENT_NODE || node.style.display === 'none' || node.style.visibility === 'hidden') {
          return '';
      }

      let childrenContent = '';
      const childNodes = Array.from(node.childNodes);

      for (let i = 0; i < childNodes.length; i++) {
          const child = childNodes[i];
          const childListState = { ...listState };
          if (node.tagName === 'OL') {
              childListState.type = 'ol';
              if (!childListState.start) childListState.start = 1;
              if (child.tagName === 'LI') {
                  childListState.index = childListState.start++;
              }
          } else if (node.tagName === 'UL') {
              childListState.type = 'ul';
          } else if (listState.type) {
              childListState.level = (listState.level || 0) + 1;
          }
          childrenContent += this._convertNodeToMarkdown(child, childListState);
      }
      
      const blockSeparator = '\n\n';
      const trimContent = childrenContent.trim();

      switch (node.tagName) {
          case 'H1': return `# ${trimContent}${blockSeparator}`;
          case 'H2': return `## ${trimContent}${blockSeparator}`;
          case 'H3': return `### ${trimContent}${blockSeparator}`;
          case 'H4': return `#### ${trimContent}${blockSeparator}`;
          case 'H5': return `##### ${trimContent}${blockSeparator}`;
          case 'H6': return `###### ${trimContent}${blockSeparator}`;
          case 'P': return `${trimContent}${blockSeparator}`;
          case 'BLOCKQUOTE': return trimContent.split('\n').map(line => `> ${line}`).join('\n') + blockSeparator;
          case 'PRE':
              const codeContent = node.textContent || '';
              return `\`\`\`\n${codeContent.trim()}\n\`\`\`${blockSeparator}`;
          case 'CODE':
              return node.closest('pre') ? trimContent : `\`${trimContent}\``;
          case 'A':
              const href = node.getAttribute('href') || '';
              return href ? `[${childrenContent}](${href})` : childrenContent;
          case 'IMG':
              return `![${node.getAttribute('alt') || ''}](${node.getAttribute('src') || ''})\n`;
          case 'STRONG': case 'B': return `**${childrenContent}**`;
          case 'EM': case 'I': return `*${childrenContent}*`;
          case 'DEL': case 'S': return `~~${childrenContent}~~`;
          case 'HR': return `---${blockSeparator}`;
          case 'BR': return '  \n';
          case 'UL': return `${childrenContent.trim()}${blockSeparator}`;
          case 'OL': return `${childrenContent.trim()}${blockSeparator}`;
          case 'LI':
              const indent = '  '.repeat(listState.level || 0);
              if (listState.type === 'ol') {
                  return `${indent}${listState.index}. ${trimContent}\n`;
              }
              return `${indent}* ${trimContent}\n`;
          case 'TABLE':
              let tableMd = '';
              const headerRow = node.querySelector('thead tr, tr');
              if (headerRow) {
                  const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => this._convertNodeToMarkdown(cell).trim());
                  tableMd += `| ${headers.join(' | ')} |\n`;
                  tableMd += `| ${headers.map(() => '---').join(' | ')} |\n`;
              }
              const bodyRows = node.querySelectorAll('tbody tr');
              bodyRows.forEach(row => {
                  const cells = Array.from(row.querySelectorAll('td')).map(cell => this._convertNodeToMarkdown(cell).trim().replace(/\|/g, '\\|'));
                  tableMd += `| ${cells.join(' | ')} |\n`;
              });
              return tableMd + '\n';
          case 'SCRIPT': case 'STYLE': return '';
          case 'BODY': case 'DIV': case 'SPAN': case 'SECTION': case 'ARTICLE': case 'MAIN': case 'HEADER': case 'FOOTER': case 'NAV':
              return childrenContent;
          case 'THEAD': case 'TBODY': case 'TR': case 'TH': case 'TD':
              return `${childrenContent} `;
          default:
              return childrenContent;
      }
  }

  /**
   * 批量抓取页面内容
   */
  async batchFetchPages(pageLinks) {
    const contents = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < pageLinks.length; i++) {
      const link = pageLinks[i];
      this.currentProgress = i + 1;
      
      this.updateProgress(`正在抓取: ${link.title} (${this.currentProgress}/${this.totalPages})`);
      
      try {
        const content = await this.fetchPageContent(link.url);
        if (content && content.textLength > 0) {
          contents.push({
            ...link,
            content: content,
            index: i
          });
          successCount++;
          console.log(`✅ 成功抓取 [${this.currentProgress}/${this.totalPages}]: ${link.title} (${content.textLength} 字符)`);
        } else {
          console.warn(`⚠️ 内容为空 [${this.currentProgress}/${this.totalPages}]: ${link.title}`);
          failureCount++;
          // 即使内容为空也添加占位，保持文档结构完整
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
        }
      } catch (error) {
        console.error(`❌ 抓取失败 [${this.currentProgress}/${this.totalPages}]: ${link.title}`, error);
        failureCount++;
        // 添加错误占位内容
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
      
      // 更新进度显示成功/失败统计
      this.updateProgress(`正在抓取: ${link.title} (${this.currentProgress}/${this.totalPages}) | 成功: ${successCount} | 失败: ${failureCount}`);
      
      // 避免请求过于频繁
      await this.delay(300);
    }
    
    console.log(`📊 批量抓取完成 - 总计: ${this.totalPages}, 成功: ${successCount}, 失败: ${failureCount}`);
    return contents;
  }
  
  /**
   * 抓取单个页面内容
   */
  async fetchPageContent(url) {
    try {
      // 如果是当前页面，直接提取内容
      if (url === window.location.href) {
        return this.extractCurrentPageContent();
      }
      
      // 使用fetch方式抓取其他页面
      return await this.fetchPageViaFetch(url);
      
    } catch (error) {
      console.error(`抓取页面内容失败: ${url}`, error);
      throw error;
    }
  }
  
  /**
   * 通过fetch抓取页面内容（替代iframe方式）
   */
  async fetchPageViaFetch(url) {
    try {
      console.log(`🔄 使用fetch加载页面: ${url}`);
      
      // 使用fetch获取页面HTML
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': navigator.userAgent
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const htmlText = await response.text();
      console.log(`📄 成功获取页面HTML: ${url} (${htmlText.length} 字符)`);
      
      // 解析HTML内容
      const content = this.parseHTMLContent(htmlText, url);
      console.log(`✅ 解析完成: ${content.title} (${content.textLength} 字符)`);
      
      return content;
      
    } catch (error) {
      console.warn(`⚠️ Fetch方式失败: ${url}`, error);
      
      // 如果fetch失败，尝试通过background script代理
      return await this.fetchPageViaBackground(url);
    }
  }

  /**
   * 通过background script获取页面内容
   */
  async fetchPageViaBackground(url) {
    try {
      console.log(`🔄 使用background代理获取: ${url}`);
      
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'fetchPage',
          url: url
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response && response.success) {
            const content = this.parseHTMLContent(response.html, url);
            resolve(content);
          } else {
            reject(new Error(response?.error || 'Background fetch failed'));
          }
        });
      });
      
    } catch (error) {
      console.error(`❌ Background代理也失败: ${url}`, error);
      
      // 返回占位内容，避免中断整个流程
      return {
        html: `<div class="fetch-error">
          <h3>页面获取失败</h3>
          <p>URL: ${url}</p>
          <p>错误: ${error.message}</p>
          <p>可能原因: 网站禁止跨域访问或网络问题</p>
        </div>`,
        title: '页面获取失败',
        styles: '',
        textLength: 0
      };
    }
  }

  /**
   * 解析HTML文本内容
   */
  parseHTMLContent(htmlText, sourceUrl) {
    try {
      // 创建一个临时的DOM解析器
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      
      // 修复相对URL为绝对URL
      this.fixRelativeURLs(doc, sourceUrl);
      
      // 使用相同的内容提取逻辑
      const contentSelectors = [
        '.markdown-body',  // GitHub Pages 和 GitBook 常用
        '.content',
        'main',
        'article', 
        '.main-content',
        '.doc-content',
        '.post-content',
        '#content',
        '.container .row',  // Bootstrap 布局
        '.container'
      ];
      
      let mainContent = null;
      let bestMatch = null;
      let maxContentLength = 0;
      
      // 找到内容最多的元素作为主内容
      for (const selector of contentSelectors) {
        const elements = doc.querySelectorAll(selector);
        for (const element of elements) {
          const textLength = element.textContent.trim().length;
          if (textLength > maxContentLength && textLength > 100) {
            maxContentLength = textLength;
            bestMatch = element;
          }
        }
      }
      
      mainContent = bestMatch;
      
      // 如果还是没找到，尝试找到最大的 div
      if (!mainContent) {
        const divs = doc.querySelectorAll('div');
        for (const div of divs) {
          const textLength = div.textContent.trim().length;
          if (textLength > maxContentLength && textLength > 200) {
            maxContentLength = textLength;
            mainContent = div;
          }
        }
      }
      
      if (!mainContent) {
        console.warn('未找到主内容区域，使用body');
        mainContent = doc.body;
      }
      
      // 克隆并清理内容
      const cloned = mainContent.cloneNode(true);
      this.cleanupContent(cloned);
      
      // 清理标题中的多余符号
      this.cleanupTitles(cloned);
      
      const result = {
        html: cloned.outerHTML,
        title: this.cleanTitle(doc.title || this.extractTitleFromURL(sourceUrl)),
        styles: this.extractStylesFromParsedDocument(doc, sourceUrl),
        textLength: cloned.textContent.trim().length
      };
      
      return result;
      
    } catch (error) {
      console.error('HTML解析失败:', error);
      
      return {
        html: `<div class="parse-error">
          <h3>HTML解析失败</h3>
          <p>URL: ${sourceUrl}</p>
          <p>错误: ${error.message}</p>
        </div>`,
        title: 'HTML解析失败',
        styles: '',
        textLength: 0
      };
    }
  }

  /**
   * 清理标题中的多余符号
   */
  cleanupTitles(element) {
    try {
      // 处理所有标题元素
      const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        const text = heading.textContent || heading.innerText;
        if (text) {
          // 移除开头和结尾的#号和空白字符
          const cleanText = text.replace(/^#+\s*/, '').replace(/\s*#+\s*$/, '').trim();
          heading.textContent = cleanText;
        }
      });
      
      // 处理可能的markdown残留
      const allElements = element.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.children.length === 0) { // 只处理叶子节点
          const text = el.textContent;
          if (text && text.includes('#')) {
            // 移除单独出现的#号
            const cleanText = text.replace(/^#+\s+/, '').replace(/\s+#+\s*$/, '');
            if (cleanText !== text) {
              el.textContent = cleanText;
            }
          }
        }
      });
      
    } catch (error) {
      console.warn('清理标题失败:', error);
    }
  }

  /**
   * 清理标题文本
   */
  cleanTitle(title) {
    if (!title) return '未命名页面';
    
    return title
      .replace(/^#+\s*/, '')      // 移除开头的#号
      .replace(/\s*#+\s*$/, '')   // 移除结尾的#号
      .replace(/\s*#\s*$/, '')    // 移除单个#号
      .trim();
  }

  /**
   * 修复相对URL为绝对URL
   */
  fixRelativeURLs(doc, baseUrl) {
    try {
      const base = new URL(baseUrl);
      
      // 修复图片src
      const images = doc.querySelectorAll('img[src]');
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http')) {
          try {
            img.src = new URL(src, base).href;
          } catch (e) {
            console.warn('无法修复图片URL:', src);
          }
        }
      });
      
      // 修复链接href
      const links = doc.querySelectorAll('a[href]');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#')) {
          try {
            link.href = new URL(href, base).href;
          } catch (e) {
            console.warn('无法修复链接URL:', href);
          }
        }
      });
      
      // 修复CSS背景图片等（如果需要的话）
      
    } catch (error) {
      console.warn('URL修复失败:', error);
    }
  }

  /**
   * 从URL提取标题
   */
  extractTitleFromURL(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/').filter(s => s.length > 0);
      const lastSegment = segments[segments.length - 1];
      
      // 移除文件扩展名并解码
      const title = decodeURIComponent(lastSegment.replace(/\.[^/.]+$/, ""));
      return title || '未命名页面';
    } catch (error) {
      return '未命名页面';
    }
  }

  /**
   * 从解析的文档中提取样式
   */
  extractStylesFromParsedDocument(doc, baseUrl) {
    let styles = '';
    
    try {
      // 基础样式，特别关注代码块
      styles += `
        /* 基础样式重置和文档样式 */
        * { box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
          line-height: 1.6; 
          margin: 0; 
          padding: 20px; 
        }
        
        /* 代码块样式优化 */
        pre {
          position: relative;
          background: #f8f8f8;
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          font-size: 85%;
          line-height: 1.45;
          overflow: auto;
          padding: 16px;
          margin: 1em 0;
        }
        
        code {
          background: rgba(175,184,193,0.2);
          padding: 0.2em 0.4em;
          border-radius: 6px;
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
          font-size: 85%;
        }
        
        pre code {
          background: transparent;
          border: 0;
          display: inline;
          max-width: auto;
          padding: 0;
          margin: 0;
          overflow: visible;
          line-height: inherit;
          word-wrap: normal;
        }
        
        /* 行号样式 */
        .highlight pre,
        .codehilite pre,
        .highlight-pre {
          position: relative;
          counter-reset: line;
        }
        
        .highlight pre code .line,
        .codehilite pre code .line,
        .highlight-pre code .line {
          counter-increment: line;
          position: relative;
          display: block;
        }
        
        .highlight pre code .line:before,
        .codehilite pre code .line:before,
        .highlight-pre code .line:before {
          counter-increment: line;
          content: counter(line);
          position: absolute;
          left: -50px;
          top: 0;
          width: 40px;
          text-align: right;
          color: #999;
          border-right: 1px solid #ddd;
          padding-right: 8px;
          user-select: none;
        }
        
        /* GitHub风格代码块 */
        .highlight .lineno,
        .codehilite .lineno,
        .linenodiv pre {
          color: #999;
          border-right: 1px solid #ddd;
          padding-right: 8px;
          margin-right: 8px;
          user-select: none;
        }
        
        /* Prism.js样式支持 */
        .line-numbers .line-numbers-rows {
          position: absolute;
          pointer-events: none;
          top: 0;
          font-size: 100%;
          left: -3.8em;
          width: 3em;
          letter-spacing: -1px;
          border-right: 1px solid #999;
          user-select: none;
        }
        
        .line-numbers .line-numbers-rows > span {
          pointer-events: none;
          display: block;
          counter-increment: linenumber;
        }
        
        .line-numbers .line-numbers-rows > span:before {
          content: counter(linenumber);
          color: #999;
          display: block;
          padding-right: 0.8em;
          text-align: right;
        }
        
        /* 纯文本行号样式 - 最简单方法，行号和代码在同一行 */
        .line-numbers-simple-fixed {
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace !important;
          white-space: pre !important;
          overflow-x: auto;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          padding: 12px;
          line-height: 1.4;
          font-size: 14px;
          color: #212529;
        }
        
        .line-numbers-simple-fixed code {
          white-space: pre !important;
          display: block !important;
          padding: 0 !important;
          background: transparent !important;
          font-family: inherit !important;
          font-size: inherit !important;
          color: inherit !important;
          line-height: inherit !important;
        }
        
        /* 修复分离的行号 */
        .has-line-numbers {
          position: relative;
          display: flex !important;
          align-items: stretch;
        }
        
        .has-line-numbers .line-numbers-rows,
        .has-line-numbers .linenodiv {
          flex-shrink: 0 !important;
          min-width: 3em !important;
          text-align: right !important;
          padding-right: 8px !important;
          border-right: 1px solid #ddd !important;
          color: #666 !important;
          user-select: none !important;
          background: #f8f9fa !important;
          margin-right: 8px !important;
        }
        
        .has-line-numbers pre,
        .has-line-numbers code {
          flex: 1 !important;
          margin: 0 !important;
          padding-left: 0 !important;
          overflow: auto !important;
        }
      `;
      
      // 提取内联样式
      const styleTags = doc.querySelectorAll('style');
      styleTags.forEach(style => {
        const content = style.textContent;
        if (content && !content.includes('@import')) {
          styles += content + '\n';
        }
      });
      
      // 提取link标签中的CSS（需要转换为绝对URL）
      const linkTags = doc.querySelectorAll('link[rel="stylesheet"]');
      linkTags.forEach(link => {
        const href = link.href;
        if (href) {
          try {
            const absoluteUrl = new URL(href, baseUrl).href;
            styles += `@import url("${absoluteUrl}");\n`;
          } catch (e) {
            console.warn('无法处理CSS链接:', href);
          }
        }
      });
      
    } catch (error) {
      console.warn('样式提取失败:', error);
    }
    
    return styles;
  }
  
  cleanupContent(element) {
    // 更精确的清理 - 只移除明确不需要的元素
    const unwantedSelectors = [
      'script', 
      'style',
      '.ads', 
      '.advertisement', 
      '.social-share',
      '.comments',
      '.popup', 
      '.modal', 
      '.overlay',
      '.sidebar-toggle',  // 移动端侧边栏开关
      '.search-box',      // 搜索框
      '.edit-page'        // 编辑页面链接
    ];
    
    // 不要移除 nav 和 .sidebar，因为它们可能包含重要的文档结构
    // 只移除明确的广告和不相关元素
    
    unwantedSelectors.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // 处理代码块行号问题
    this.fixCodeLineNumbers(element);
    
    // 移除空的元素（但保留有意义的空白）
    const emptyElements = element.querySelectorAll('*');
    emptyElements.forEach(el => {
      if (el.children.length === 0 && 
          el.textContent.trim() === '' && 
          !['img', 'br', 'hr', 'input'].includes(el.tagName.toLowerCase())) {
        el.remove();
      }
    });
  }

  /**
   * 修复代码块的行号显示问题 - 完全重构版本
   */
  fixCodeLineNumbers(element) {
    try {
      console.log('🔧 开始修复代码行号 - 完全重构版本...');
      
      // 1. 首先移除所有可能的行号元素
      this.removeAllLineNumbers(element);
      
      // 2. 然后重新处理所有代码块
      this.addSimpleLineNumbers(element);
      
      console.log('✅ 代码行号修复完成');
      
    } catch (error) {
      console.error('❌ 修复代码行号失败:', error);
    }
  }

  /**
   * 移除所有可能的行号相关元素
   */
  removeAllLineNumbers(element) {
    console.log('🧹 清理所有行号元素...');
    
    // 移除常见的行号相关类和元素
    const lineNumberSelectors = [
      '.line-number',
      '.line-numbers',
      '.lineno',
      '.linenos',
      '.ln',
      '.gutter',
      '.line-numbers-rows',
      '.hljs-ln-numbers',
      '.hljs-ln-line',
      '.rouge-gutter',
      '.highlight .gutter',
      '.codehilite .gutter'
    ];
    
    lineNumberSelectors.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => {
        console.log(`移除行号元素: ${selector}`);
        el.remove();
      });
    });
    
    // 移除可能的行号表格结构
    const tables = element.querySelectorAll('table.highlight, table.codehilitetable');
    tables.forEach(table => {
      const code = table.querySelector('pre, code');
      if (code) {
        console.log('移除表格结构，保留代码');
        table.parentNode.insertBefore(code, table);
        table.remove();
      }
    });
    
    console.log('✅ 清理完成');
  }

  /**
   * 添加简单的行号
   */
  addSimpleLineNumbers(element) {
    console.log('📝 添加简单行号...');
    
    // 查找所有真正的代码块
    const codeBlocks = this.findAllCodeBlocks(element);
    
    console.log(`找到 ${codeBlocks.length} 个代码块`);
    
    codeBlocks.forEach((block, index) => {
      try {
        const textContent = this.extractCleanCodeText(block);
        
        if (!textContent || textContent.trim().length < 10) {
          console.log(`跳过代码块 ${index + 1}: 内容太短`);
          return;
        }
        
        const lines = textContent.split('\n');
        if (lines.length < 2) {
          console.log(`跳过代码块 ${index + 1}: 行数太少`);
          return;
        }
        
        console.log(`处理代码块 ${index + 1}: ${lines.length} 行`);
        
        // 构建带行号的内容
        let numberedContent = '';
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // 跳过最后的空行
          if (i === lines.length - 1 && line.trim() === '') {
            continue;
          }
          
          const lineNum = (i + 1).toString().padStart(3, ' ');
          numberedContent += lineNum + '  ' + line;
          
          if (i < lines.length - 1) {
            numberedContent += '\n';
          }
        }
        
        // 应用到代码块
        block.textContent = numberedContent;
        block.classList.add('line-numbers-simple-fixed');
        
        console.log(`✅ 代码块 ${index + 1} 处理完成`);
        
      } catch (error) {
        console.error(`处理代码块 ${index + 1} 失败:`, error);
      }
    });
  }

  /**
   * 查找所有真正的代码块
   */
  findAllCodeBlocks(element) {
    const blocks = [];
    
    // 优先查找 pre > code 结构
    const preWithCode = element.querySelectorAll('pre code');
    preWithCode.forEach(code => {
      if (!this.isInsideProcessedBlock(code, blocks)) {
        blocks.push(code);
      }
    });
    
    // 然后查找单独的 pre 元素
    const preElements = element.querySelectorAll('pre');
    preElements.forEach(pre => {
      // 如果 pre 里没有 code，且不在已处理列表中
      if (!pre.querySelector('code') && !this.isInsideProcessedBlock(pre, blocks)) {
        blocks.push(pre);
      }
    });
    
    return blocks;
  }

  /**
   * 检查元素是否已经在处理列表中
   */
  isInsideProcessedBlock(element, processedBlocks) {
    return processedBlocks.some(block => 
      block === element || block.contains(element) || element.contains(block)
    );
  }

  /**
   * 提取干净的代码文本
   */
  extractCleanCodeText(element) {
    let text = element.textContent || '';
    
    // 移除已有的行号（各种格式）
    const lines = text.split('\n');
    const cleanLines = lines.map(line => {
      // 移除开头的数字和各种分隔符
      return line.replace(/^\s*\d+[\s\|\.\-\:\t]+/, '');
    });
    
    return cleanLines.join('\n');
  }




  /**
   * HTML转义函数
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * 创建完整的PDF文档
   */
  async createCompletePDF(pageContents, options) {
    this.updateProgress('正在生成PDF文档...');
    
    // 构建完整的HTML文档
    const completeHtml = this.buildCompleteDocument(pageContents, options);
    
    // 创建PDF预览窗口
    this.createPDFPreviewWindow(completeHtml, options);
    
    this.hideProgressPanel();
    console.log('✅ PDF电子书生成完成');
  }
  
  buildCompleteDocument(pageContents, options) {
    let allStyles = '';
    let allContent = '';
    let tocHtml = '';
    let bookmarkStructure = [];
    
    // 合并所有样式
    pageContents.forEach(page => {
      if (page.content && page.content.styles) {
        allStyles += page.content.styles + '\n';
      }
    });
    
    // 生成目录和书签结构
    tocHtml = `<div class="table-of-contents">
      <h1>📚 目录</h1>
      <div class="toc-description">
        <p>本电子书包含 ${pageContents.length} 个章节，点击标题可跳转到对应章节</p>
      </div>
      <ul class="toc-list">`;
    
    pageContents.forEach((page, index) => {
      // 确保level存在，如果不存在则设为1  
      const level = Math.min(Math.max(page.level || 1, 1), 6); // 限制在1-6级
      const indent = Math.max(0, level - 1) * 20; // 每级缩进20px
      const levelClass = `toc-level-${level}`;
      
      // 构建书签结构数据
      bookmarkStructure.push({
        index,
        level,
        title: page.title || '未命名页面',
        url: page.url
      });
      
      tocHtml += `
        <li class="toc-item ${levelClass}" style="margin-left: ${indent}px;">
          <a href="#chapter-${index}" class="toc-link">
            <span class="toc-number">${index + 1}.</span>
            <span class="toc-title">${page.title || '未命名页面'}</span>
          </a>
        </li>`;
    });
    
    tocHtml += `</ul></div><div class="page-break"></div>`;
    
    // 生成带有正确标题层级的内容（用于PDF书签）
    pageContents.forEach((page, index) => {
      if (page.content) {
        const level = Math.min(Math.max(page.level || 1, 1), 6);
        const headingTag = `h${level}`;
        
        allContent += `
          <div class="page-section" id="chapter-${index}">
            <!-- PDF书签标题 -->
            <${headingTag} class="chapter-title" id="bookmark-${index}">
              ${index + 1}. ${page.title || '未命名页面'}
            </${headingTag}>
            
            <div class="page-meta">
              <p class="page-url">来源: ${page.url}</p>
            </div>
            
            <div class="page-content">
              ${page.content.html}
            </div>
          </div>
          <div class="page-break"></div>
        `;
      }
    });
    
    return this.generateCompleteHTML(allStyles, tocHtml + allContent, options, bookmarkStructure);
  }
  
  generateCompleteHTML(styles, content, options, bookmarkStructure) {
    // 生成书签meta信息和数据
    let bookmarkMeta = '';
    const chapterCount = bookmarkStructure ? bookmarkStructure.length : 0;
    
    if (bookmarkStructure && bookmarkStructure.length > 0) {
      bookmarkMeta = `
        <!-- PDF书签元数据 -->
        <meta name="pdf-bookmarks" content="enabled">
        <script type="application/json" id="bookmark-data">
          ${JSON.stringify(bookmarkStructure, null, 2)}
        </script>`;
    }
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${bookmarkMeta}
    <title>${options.title}</title>
    <style>
        ${styles}
        ${this.getEnhancedPrintStyles()}
        
        /* 章节标题样式 */
        .chapter-title {
          color: #2c3e50 !important;
          border-bottom: 2px solid #3498db !important;
          padding-bottom: 10px !important;
          margin: 20px 0 15px 0 !important;
          font-weight: bold !important;
        }
        
        .chapter-title:first-of-type {
          margin-top: 0 !important;
        }
        
        /* 不同层级的章节标题 */
        h1.chapter-title { 
          font-size: 24px !important; 
          color: #2c3e50 !important;
          border-bottom: 3px solid #3498db !important;
        }
        h2.chapter-title { 
          font-size: 20px !important; 
          color: #34495e !important;
          border-bottom: 2px solid #3498db !important;
          margin-left: 20px !important;
        }
        h3.chapter-title { 
          font-size: 18px !important; 
          color: #5d6d7e !important;
          border-bottom: 1px solid #85c1e9 !important;
          margin-left: 40px !important;
        }
        h4.chapter-title { 
          font-size: 16px !important; 
          color: #6c7b7f !important;
          border-bottom: 1px dotted #85c1e9 !important;
          margin-left: 60px !important;
        }
        h5.chapter-title { 
          font-size: 15px !important; 
          color: #7b8a8b !important;
          margin-left: 80px !important;
        }
        h6.chapter-title { 
          font-size: 14px !important; 
          color: #85929e !important;
          margin-left: 100px !important;
        }
        
        .page-meta {
          margin-bottom: 20px !important;
          padding: 8px 12px !important;
          background: #f8f9fa !important;
          border-left: 4px solid #3498db !important;
          font-size: 12px !important;
          color: #666 !important;
        }
        
        .page-url {
          margin: 0 !important;
          font-family: 'Courier New', monospace !important;
          word-break: break-all !important;
        }
    </style>
</head>
<body>
    <div class="pdf-controls no-print">
        <h3>📚 ${options.title}</h3>
        <p>完整的PDF电子书已生成，包含侧边栏书签导航</p>
        <button onclick="console.log('Print button clicked'); window.print();" class="print-btn">🖨️ 保存为PDF</button>
        <button onclick="window.close()" class="close-btn">❌ 关闭</button>
        <div class="pdf-tips">
          <p><strong>💡 使用提示：</strong></p>
          <ul>
            <li>打印时选择"保存为PDF"</li>
            <li>在"更多设置"中启用"页眉和页脚"</li>
            <li><strong>重要：</strong>现代浏览器会自动识别HTML标题标签生成PDF书签</li>
            <li>保存PDF后，在PDF阅读器中查看"书签"或"大纲"面板</li>
            <li>如果书签未生成，请尝试使用Chrome浏览器的打印功能</li>
          </ul>
          <p><strong>🔖 书签说明：</strong></p>
          <p>本文档使用标准HTML标题标签（h1-h6）结构化内容，支持PDF书签自动生成。各章节标题按层级缩进显示，便于在PDF阅读器侧边栏中快速导航。</p>
        </div>
    </div>
    
    ${content}
    
    <script>
        // 从数据中获取章节数量
        const bookmarkData = document.getElementById('bookmark-data');
        const chapterCount = ${chapterCount};
        
        // PDF书签优化脚本
        document.addEventListener('DOMContentLoaded', function() {
          console.log('PDF页面加载完成, 包含', chapterCount, '个章节');
          
          // 确保所有章节标题都有正确的id和属性用于书签
          const chapterTitles = document.querySelectorAll('.chapter-title');
          chapterTitles.forEach((title, index) => {
            // 设置唯一ID
            if (!title.id) {
              title.id = 'bookmark-chapter-' + index;
            }
            
            // 添加书签属性
            title.setAttribute('data-bookmark', 'true');
            title.setAttribute('data-chapter', index + 1);
            
            // 确保标题可见性
            title.style.pageBreakInside = 'avoid';
            title.style.breakInside = 'avoid';
          });
          
          // 优化文档结构以便PDF书签识别
          const tocLinks = document.querySelectorAll('.toc-link');
          tocLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
              e.preventDefault();
              const targetId = this.getAttribute('href').substring(1);
              const target = document.getElementById(targetId);
              if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // 高亮目标章节
                target.style.backgroundColor = '#fff3cd';
                setTimeout(function() {
                  target.style.backgroundColor = '';
                }, 2000);
              }
            });
          });
          
          // 检测浏览器并提供专门的书签生成建议
          const isFirefox = /Firefox/.test(navigator.userAgent);
          
          if (isFirefox) {
            const firefoxNote = document.createElement('div');
            firefoxNote.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; border-radius: 4px; font-size: 12px;';
            firefoxNote.innerHTML = '<strong>Firefox用户提示：</strong> Firefox的PDF书签生成可能不如Chrome完善，建议使用Chrome浏览器以获得最佳书签效果。';
            const controls = document.querySelector('.pdf-controls');
            if (controls) {
              controls.appendChild(firefoxNote);
            }
          }
        });
        
        // 延迟显示提示信息
        setTimeout(function() {
          console.log('显示PDF生成确认提示');
          const confirmMessage = '📚 PDF电子书已准备就绪！\\n\\n' +
            '✅ 包含 ' + chapterCount + ' 个章节\\n' +
            '✅ 使用标准HTML标题层级结构\\n' +
            '✅ 支持现代浏览器PDF书签生成\\n\\n' +
            '点击页面上的"保存为PDF"按钮开始打印\\n' +
            '或者按Ctrl+P快捷键打印';
            
          alert(confirmMessage);
        }, 2000);
    </script>
</body>
</html>`;
  }
  
  getEnhancedPrintStyles() {
    return `
      /* 打印样式优化 */
      @media print {
        .pdf-controls { display: none !important; }
        .no-print { display: none !important; }
        
        body {
          margin: 0;
          padding: 15mm;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          background: #fff;
        }
        
        .page-break {
          page-break-before: always;
          height: 0;
          margin: 0;
          padding: 0;
        }
        
        /* 目录样式 */
        .table-of-contents {
          page-break-after: always;
          margin-bottom: 0;
        }
        
        .table-of-contents h1 {
          font-size: 24pt;
          text-align: center;
          margin: 0 0 20pt 0;
          color: #2c3e50;
          border-bottom: 3pt solid #3498db;
          padding-bottom: 10pt;
        }
        
        .toc-description {
          text-align: center;
          margin-bottom: 30pt;
          color: #666;
          font-style: italic;
        }
        
        .toc-list {
          list-style: none;
          padding-left: 0;
          margin: 0;
        }
        
        .toc-item {
          margin: 8pt 0;
          break-inside: avoid;
        }
        
        .toc-link {
          color: #2c3e50;
          text-decoration: none;
          display: block;
          padding: 4pt 0;
          border-bottom: 1px dotted #bdc3c7;
        }
        
        .toc-link:hover {
          background: #ecf0f1;
        }
        
        .toc-number {
          font-weight: bold;
          color: #3498db;
          margin-right: 8pt;
          min-width: 30pt;
          display: inline-block;
        }
        
        .toc-title {
          color: #2c3e50;
        }
        
        .toc-level-1 { font-weight: bold; font-size: 11pt; }
        .toc-level-2 { font-size: 10pt; }
        .toc-level-3 { font-size: 9pt; color: #666; }
        
        /* 页面样式 */
        .page-section {
          break-inside: avoid;
          margin-bottom: 30pt;
          page-break-inside: avoid;
        }
        
        /* PDF书签章节标题样式 */
        .chapter-title {
          break-after: avoid !important;
          margin-top: 0 !important;
          margin-bottom: 15pt !important;
          padding-bottom: 8pt !important;
          font-weight: bold !important;
          color: #2c3e50 !important;
        }
        
        h1.chapter-title {
          font-size: 18pt !important;
          border-bottom: 2pt solid #2c3e50 !important;
          page-break-before: always;
        }
        
        h2.chapter-title {
          font-size: 16pt !important;
          border-bottom: 1.5pt solid #34495e !important;
          margin-left: 10pt !important;
        }
        
        h3.chapter-title {
          font-size: 14pt !important;
          border-bottom: 1pt solid #5d6d7e !important;
          margin-left: 20pt !important;
        }
        
        h4.chapter-title {
          font-size: 13pt !important;
          border-bottom: 0.5pt solid #6c7b7f !important;
          margin-left: 30pt !important;
        }
        
        h5.chapter-title {
          font-size: 12pt !important;
          margin-left: 40pt !important;
        }
        
        h6.chapter-title {
          font-size: 11pt !important;
          margin-left: 50pt !important;
        }
        
        .page-meta {
          margin-bottom: 15pt !important;
          padding: 6pt 8pt !important;
          background: #f8f9fa !important;
          border-left: 2pt solid #3498db !important;
          font-size: 9pt !important;
          color: #666 !important;
          break-inside: avoid !important;
        }
        
        .page-url {
          margin: 0 !important;
          font-family: 'Courier New', monospace !important;
          word-break: break-all !important;
          font-size: 8pt !important;
        }
        
        .page-content {
          margin-top: 15pt !important;
        }
        
        /* 代码块打印样式优化 */
        pre {
          background: #f8f9fa !important;
          border: 1pt solid #dee2e6 !important;
          border-radius: 0;
          padding: 8pt !important;
          font-size: 9pt !important;
          line-height: 1.3 !important;
          overflow: visible !important;
          break-inside: avoid;
          margin: 8pt 0 !important;
          position: relative;
        }
        
        code {
          font-family: 'Courier New', 'Monaco', monospace !important;
          font-size: 9pt !important;
          background: #f1f3f4 !important;
          padding: 1pt 2pt !important;
        }
        
        pre code {
          background: transparent !important;
          padding: 0 !important;
          font-size: 9pt !important;
        }
        
        /* 行号打印样式 */
        .highlight .lineno,
        .codehilite .lineno,
        .linenodiv pre {
          color: #666 !important;
          border-right: 1pt solid #ccc !important;
          padding-right: 4pt !important;
          margin-right: 6pt !important;
          user-select: none;
          font-size: 8pt !important;
        }
        
        /* 纯文本行号打印样式 - 最简单方法 */
        .line-numbers-simple-fixed {
          font-family: "Courier New", "Monaco", monospace !important;
          white-space: pre !important;
          overflow: visible !important;
          background: #f8f9fa !important;
          border: 1pt solid #dee2e6 !important;
          padding: 8pt !important;
          margin: 8pt 0 !important;
          break-inside: avoid !important;
          line-height: 1.3 !important;
          font-size: 9pt !important;
          color: #212529 !important;
        }
        
        .line-numbers-simple-fixed code {
          white-space: pre !important;
          display: block !important;
          padding: 0 !important;
          background: transparent !important;
          font-family: inherit !important;
          font-size: inherit !important;
          color: inherit !important;
          line-height: inherit !important;
        }
        
        /* 修复分离的行号打印样式 */
        .has-line-numbers {
          display: flex !important;
          align-items: stretch !important;
        }
        
        .has-line-numbers .line-numbers-rows,
        .has-line-numbers .linenodiv {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 3em !important;
          text-align: right !important;
          padding-right: 4pt !important;
          border-right: 1pt solid #ccc !important;
          color: #666 !important;
          user-select: none !important;
          font-size: 8pt !important;
        }
        
        h1, h2, h3, h4, h5, h6 {
          break-after: avoid;
          margin-top: 20pt;
          margin-bottom: 10pt;
          color: #2c3e50;
        }
        
        h1 { font-size: 16pt; }
        h2 { font-size: 14pt; }
        h3 { font-size: 13pt; }
        h4 { font-size: 12pt; }
        h5 { font-size: 11pt; }
        h6 { font-size: 10pt; }
        
        p {
          margin: 0 0 8pt 0;
          text-align: justify;
          orphans: 3;
          widows: 3;
        }
        
        img {
          max-width: 100%;
          height: auto;
          break-inside: avoid;
          margin: 10pt 0;
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 10pt 0;
          font-size: 10pt;
          break-inside: avoid;
        }
        
        th, td {
          border: 1pt solid #333;
          padding: 4pt 8pt;
          text-align: left;
        }
        
        th {
          background-color: #f0f0f0 !important;
          font-weight: bold;
        }
        
        blockquote {
          margin: 10pt 0 10pt 20pt;
          padding-left: 15pt;
          border-left: 3pt solid #3498db;
          font-style: italic;
          color: #666;
        }
        
        ul, ol {
          margin: 8pt 0;
          padding-left: 20pt;
        }
        
        li {
          margin: 4pt 0;
          break-inside: avoid;
        }
        
        /* 避免在标题后立即分页 */
        h1 + *, h2 + *, h3 + *, h4 + *, h5 + *, h6 + * {
          break-before: avoid;
        }
      }
      
      /* 屏幕显示样式 */
      @media screen {
        .pdf-controls {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.95);
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          border: 1px solid #ddd;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 14px;
        }
        
        .pdf-controls h3 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 16px;
        }
        
        .pdf-controls button {
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          margin: 5px 5px 5px 0;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }
        
        .pdf-controls button:hover {
          background: #2980b9;
        }
        
        .pdf-controls button:last-of-type {
          background: #e74c3c;
        }
        
        .pdf-controls button:last-of-type:hover {
          background: #c0392b;
        }
        
        /* 屏幕显示的目录样式 */
        .table-of-contents {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          margin-bottom: 40px;
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        
        .table-of-contents h1 {
          text-align: center;
          color: white;
          margin-bottom: 20px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .toc-description {
          text-align: center;
          margin-bottom: 25px;
          opacity: 0.9;
        }
        
        .toc-link {
          color: white;
          text-decoration: none;
          padding: 8px 12px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        
        .toc-link:hover {
          background: rgba(255,255,255,0.1);
          transform: translateX(5px);
        }
        
        .page-section {
          margin-bottom: 60px;
          padding: 30px 0;
          border-bottom: 1px solid #eee;
        }
        
        .page-header {
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 3px solid #3498db;
        }
        
        .page-title {
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .page-meta {
          color: #666;
          font-size: 12px;
        }
        
        .page-content {
          margin-top: 25px;
        }
      }
    `;
  }
  
  createPDFPreviewWindow(htmlContent, options) {
    const pdfWindow = window.open('', '_blank', 'width=1200,height=800');
    if (pdfWindow) {
      pdfWindow.document.open();
      pdfWindow.document.write(htmlContent);
      pdfWindow.document.close();
    }
  }
  
  // UI辅助方法
  showProgressPanel() {
    const panel = document.createElement('div');
    panel.id = 'pdf-progress-panel';
    panel.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
                  z-index: 999999; font-family: Arial, sans-serif; text-align: center; min-width: 300px;">
        <h3 style="margin: 0 0 15px 0;">📚 正在生成PDF电子书</h3>
        <div id="progress-text" style="margin-bottom: 15px;">准备中...</div>
        <div style="background: #f0f0f0; height: 6px; border-radius: 3px; overflow: hidden;">
          <div id="progress-bar" style="background: #4facfe; height: 100%; width: 0%; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
  }
  
  updateProgress(text) {
    const textEl = document.getElementById('progress-text');
    const barEl = document.getElementById('progress-bar');
    
    if (textEl) textEl.textContent = text;
    if (barEl && this.totalPages > 0) {
      const percent = (this.currentProgress / this.totalPages) * 100;
      barEl.style.width = percent + '%';
    }
  }
  
  hideProgressPanel() {
    const panel = document.getElementById('pdf-progress-panel');
    if (panel) panel.remove();
  }
  
  showError(message) {
    this.hideProgressPanel();
    alert('❌ ' + message);
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  generatePreview() {
    const allPages = this.discoverAllPages();
    return {
      title: document.title,
      totalPages: allPages.length,
      pages: allPages.map(p => ({ title: p.title, level: p.level })),
      url: window.location.href
    };
  }

  /**
   * 提取当前页面内容
   */
  extractCurrentPageContent() {
    // 针对文档网站的改进选择器
    const contentSelectors = [
      '.markdown-body',  // GitHub Pages 和 GitBook 常用
      '.content',
      'main',
      'article', 
      '.main-content',
      '.doc-content',
      '.post-content',
      '#content',
      '.container .row',  // Bootstrap 布局
      '.container'
    ];
    
    let mainContent = null;
    let bestMatch = null;
    let maxContentLength = 0;
    
    // 找到内容最多的元素作为主内容
    for (const selector of contentSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const textLength = element.textContent.trim().length;
        if (textLength > maxContentLength && textLength > 100) {
          maxContentLength = textLength;
          bestMatch = element;
        }
      }
    }
    
    mainContent = bestMatch;
    
    // 如果还是没找到，尝试找到最大的 div
    if (!mainContent) {
      const divs = document.querySelectorAll('div');
      for (const div of divs) {
        const textLength = div.textContent.trim().length;
        if (textLength > maxContentLength && textLength > 200) {
          maxContentLength = textLength;
          mainContent = div;
        }
      }
    }
    
    if (!mainContent) {
      console.warn('未找到主内容区域，使用body');
      mainContent = document.body;
    }

    const cloned = mainContent.cloneNode(true);
    this.cleanupContent(cloned);
    
    const result = {
      html: cloned.outerHTML,
      title: document.title || '未命名页面',
      styles: this.extractStylesFromDocument(document),
      textLength: cloned.textContent.trim().length
    };
    
    console.log(`✅ 提取当前页面内容: ${result.title} (${result.textLength} 字符)`);
    return result;
  }

  /**
   * 提取当前文档的样式
   */
  extractStylesFromDocument(doc) {
    let styles = '';
    
    try {
      // 首先添加基础样式重置和文档样式
      styles += `
        /* 基础样式重置和文档样式 */
        * { box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
          line-height: 1.6; 
          margin: 0; 
          padding: 20px; 
        }
        h1, h2, h3, h4, h5, h6 { margin: 1em 0 0.5em 0; }
        p { margin: 0.5em 0; }
        img { max-width: 100%; height: auto; }
        pre, code { 
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
          background: #f5f5f5; 
          padding: 2px 4px; 
          border-radius: 3px; 
        }
        pre { padding: 10px; overflow-x: auto; }
        blockquote { 
          margin: 0 0 0 20px; 
          padding-left: 15px; 
          border-left: 3px solid #ddd; 
          color: #666; 
        }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
      `;
      
      // 提取外部样式表
      const styleSheets = doc.styleSheets;
      for (let i = 0; i < styleSheets.length; i++) {
        try {
          const sheet = styleSheets[i];
          // 只处理同域或允许访问的样式表
          if (sheet.cssRules) {
            for (let j = 0; j < sheet.cssRules.length; j++) {
              const rule = sheet.cssRules[j];
              if (rule.type === CSSRule.STYLE_RULE) {
                // 过滤掉一些可能影响打印的规则
                const cssText = rule.cssText;
                if (!cssText.includes('transform') && 
                    !cssText.includes('position: fixed') && 
                    !cssText.includes('position: absolute') &&
                    !cssText.includes('animation')) {
                  styles += cssText + '\n';
                }
              } else if (rule.type === CSSRule.MEDIA_RULE) {
                // 处理媒体查询，保留print和all类型
                if (rule.media.mediaText.includes('print') || 
                    rule.media.mediaText.includes('all') ||
                    rule.media.mediaText.includes('screen')) {
                  styles += rule.cssText + '\n';
                }
              }
            }
          }
        } catch (e) {
          console.warn('无法访问外部样式表:', e);
          // 尝试通过link标签获取样式表URL
          const linkTags = doc.querySelectorAll('link[rel="stylesheet"]');
          linkTags.forEach(link => {
            const href = link.href;
            if (href && href.startsWith(window.location.origin)) {
              styles += `@import url("${href}");\n`;
            }
          });
        }
      }
      
      // 提取内联样式
      const styleTags = doc.querySelectorAll('style');
      styleTags.forEach(style => {
        const content = style.textContent;
        if (content && !content.includes('@import')) {  // 避免重复的@import
          styles += content + '\n';
        }
      });
      
      // 提取元素的内联样式属性
      const elementsWithStyle = doc.querySelectorAll('[style]');
      const inlineStyles = [];
      elementsWithStyle.forEach((element, index) => {
        const inlineStyle = element.getAttribute('style');
        if (inlineStyle) {
          const className = `inline-style-${index}`;
          element.classList.add(className);
          inlineStyles.push(`.${className} { ${inlineStyle} }`);
        }
      });
      styles += inlineStyles.join('\n');
      
    } catch (error) {
      console.warn('提取样式失败:', error);
      // 添加基本的后备样式
      styles += `
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #333; }
        h2 { color: #666; border-bottom: 1px solid #666; }
        code { background: #f0f0f0; padding: 2px 4px; }
        pre { background: #f8f8f8; padding: 10px; border: 1px solid #ddd; }
      `;
    }
    
    return styles;
  }

  /**
   * 下载图片为 Blob 对象
   * 处理网络图片的二进制数据获取
   */
  async downloadImageAsBlob(imageUrl) {
    try {
      console.log(`📥 正在下载图片: ${imageUrl}`);
      
      // 使用 fetch API 获取图片数据
      const response = await fetch(imageUrl, {
        method: 'GET',
        credentials: 'same-origin', // 处理需要认证的图片
        cache: 'force-cache' // 优先使用缓存
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // 获取 Content-Type 来确定文件扩展名
      const contentType = response.headers.get('Content-Type') || '';
      const blob = await response.blob();
      
      // 根据 MIME 类型确定扩展名
      let extension = 'png'; // 默认
      if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        extension = 'jpg';
      } else if (contentType.includes('png')) {
        extension = 'png';
      } else if (contentType.includes('gif')) {
        extension = 'gif';
      } else if (contentType.includes('webp')) {
        extension = 'webp';
      } else if (contentType.includes('svg')) {
        extension = 'svg';
      }
      
      // 如果 Content-Type 不可靠，从 URL 推断
      if (!contentType && imageUrl) {
        const urlPath = new URL(imageUrl, window.location.href).pathname;
        const match = urlPath.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
        if (match) {
          extension = match[1].toLowerCase();
        }
      }
      
      return { blob, extension };
    } catch (error) {
      console.error(`❌ 图片下载失败: ${imageUrl}`, error);
      return null;
    }
  }

  /**
   * 生成图片文件名
   * 使用简单的计数器和哈希来避免文件名冲突
   */
  async generateImageFileName(imageUrl, extension) {
    // 使用计数器 + URL 哈希的简化版本
    this.imageCounter++;
    
    // 简单的字符串哈希函数（避免使用 crypto.subtle 的异步复杂性）
    let hash = 0;
    for (let i = 0; i < imageUrl.length; i++) {
      const char = imageUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为 32位整数
    }
    const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
    
    return `img_${this.imageCounter}_${hashHex}.${extension}`;
  }

  /**
   * 从 HTML 内容中收集所有图片
   * 遍历 DOM 结构，提取所有 img 标签的 src 属性和上下文信息
   */
  async collectImagesFromHTML(htmlContent, pageTitle = '未知页面') {
    const images = [];
    
    if (!htmlContent) return images;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const imgElements = doc.querySelectorAll('img');
    
    console.log(`🖼️  发现 ${imgElements.length} 张图片`);
    
    for (const img of imgElements) {
      const originalSrc = img.getAttribute('src');
      if (!originalSrc) continue;
      
      try {
        // 转换为绝对 URL（处理相对路径）
        const absoluteUrl = new URL(originalSrc, window.location.href).href;
        
        // 跳过 data: URL
        if (absoluteUrl.startsWith('data:')) {
          continue;
        }
        
        // 收集上下文信息
        const altText = img.getAttribute('alt') || '';
        const title = img.getAttribute('title') || '';
        
        // 获取前后文本（用于定位）
        let context = '';
        const parentElement = img.parentElement;
        if (parentElement) {
          // 获取图片所在段落的文本（前50个字符）
          const textContent = parentElement.textContent || '';
          context = textContent.substring(0, 50).trim();
        }
        
        images.push({
          url: absoluteUrl,
          altText: altText,
          title: title,
          context: context,
          pageTitle: pageTitle
        });
      } catch (error) {
        console.warn(`⚠️  无效的图片 URL: ${originalSrc}`, error);
      }
    }
    
    return images;
  }

  /**
   * 批量下载图片
   * 使用分批并发控制来优化下载速度，避免同时发起过多请求
   */
  async batchDownloadImages(imageUrls, pageTitle = '未知页面') {
    const BATCH_SIZE = 5; // 每批并发下载 5 张图片
    const downloadedImages = [];
    
    for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
      const batch = imageUrls.slice(i, i + BATCH_SIZE);
      this.updateProgress(`正在下载图片 ${i + 1}-${Math.min(i + BATCH_SIZE, imageUrls.length)}/${imageUrls.length}...`);
      
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          if (this.imageMap.has(url)) {
            return { success: true, data: this.imageMap.get(url) };
          }
          
          const result = await this.downloadImageAsBlob(url);
          if (result && result.blob) {
            const fileName = await this.generateImageFileName(url, result.extension);
            const relativePath = `./images/${fileName}`;
            
            const imageInfo = {
              localPath: relativePath,
              blob: result.blob,
              fileName: fileName,
              originalUrl: url
            };
            
            this.imageMap.set(url, imageInfo);
            return { success: true, data: imageInfo };
          }
          return { success: false, url: url, error: '下载失败' };
        })
      );
      
      // 收集成功下载的图片和失败信息
      results.forEach((result, index) => {
        const url = batch[index];
        
        if (result.status === 'fulfilled' && result.value) {
          if (result.value.success) {
            downloadedImages.push(result.value.data);
          } else {
            // 记录失败的图片
            this.failedImages.push({
              url: url,
              error: result.value.error || '未知错误',
              pageTitle: pageTitle,
              altText: ''
            });
            console.warn(`⚠️  图片下载失败: ${url}`);
          }
        } else if (result.status === 'rejected') {
          // Promise 被拒绝
          this.failedImages.push({
            url: url,
            error: result.reason?.message || '下载异常',
            pageTitle: pageTitle,
            altText: ''
          });
          console.error(`❌ 图片下载异常: ${url}`, result.reason);
        }
      });
      
      // 短暂延迟，避免请求过快
      if (i + BATCH_SIZE < imageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    const successCount = downloadedImages.length;
    const failCount = imageUrls.length - successCount;
    
    if (failCount > 0) {
      console.log(`⚠️  下载完成: 成功 ${successCount} 张, 失败 ${failCount} 张`);
    } else {
      console.log(`✅ 成功下载 ${successCount}/${imageUrls.length} 张图片`);
    }
    
    return downloadedImages;
  }

  /**
   * 替换 Markdown 中的图片路径
   * 将原始 URL 替换为本地相对路径，对失败的图片添加警告标记
   */
  replaceImagePaths(markdownContent) {
    let updatedContent = markdownContent;
    
    // 遍历所有已下载的图片，进行路径替换
    for (const [originalUrl, imageInfo] of this.imageMap) {
      // 转义特殊字符，用于正则表达式
      const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 匹配 Markdown 图片语法：![alt](url)
      const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedUrl}\\)`, 'g');
      updatedContent = updatedContent.replace(regex, `![$1](${imageInfo.localPath})`);
    }
    
    // 对失败的图片添加醒目标记
    for (const failedImg of this.failedImages) {
      const escapedUrl = failedImg.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedUrl}\\)`, 'g');
      
      // 添加警告标记和原始 URL
      const replacement = `\n\n> ⚠️ **图片加载失败** - 请手动处理\n> \n> 原因: ${failedImg.error}\n> \n> 原始链接: [点击查看](<${failedImg.url}>)\n\n![$1](${failedImg.url} "❌ 下载失败")`;
      
      updatedContent = updatedContent.replace(regex, replacement);
    }
    
    return updatedContent;
  }

  /**
   * 生成失败图片报告
   * 创建一个详细的失败清单，方便用户手动处理
   */
  generateFailureReport() {
    if (this.failedImages.length === 0) {
      return null;
    }
    
    let report = `# 图片下载失败报告\n\n`;
    report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    report += `共有 **${this.failedImages.length}** 张图片下载失败，需要手动处理。\n\n`;
    report += `---\n\n`;
    
    // 按页面分组
    const groupedByPage = new Map();
    for (const img of this.failedImages) {
      const pageTitle = img.pageTitle || '未知页面';
      if (!groupedByPage.has(pageTitle)) {
        groupedByPage.set(pageTitle, []);
      }
      groupedByPage.get(pageTitle).push(img);
    }
    
    let index = 1;
    for (const [pageTitle, images] of groupedByPage) {
      report += `## 📄 ${pageTitle}\n\n`;
      report += `该页面有 ${images.length} 张图片下载失败：\n\n`;
      
      for (const img of images) {
        report += `### ${index}. 图片信息\n\n`;
        
        if (img.altText) {
          report += `- **图片描述**: ${img.altText}\n`;
        }
        
        if (img.context) {
          report += `- **上下文**: ${img.context}...\n`;
        }
        
        report += `- **失败原因**: \`${img.error}\`\n`;
        report += `- **原始链接**: \n  \`\`\`\n  ${img.url}\n  \`\`\`\n`;
        
        // 分析错误类型并给出建议
        report += `\n**处理建议**:\n`;
        
        if (img.error.includes('CORS') || img.error.includes('blocked')) {
          report += `- ✅ 在浏览器中打开链接，右键保存图片\n`;
          report += `- ✅ 使用截图工具截取网页上的图片\n`;
          report += `- ✅ 使用浏览器的"检查元素"功能，在Network标签中找到图片并保存\n`;
        } else if (img.error.includes('404') || img.error.includes('HTTP')) {
          report += `- ⚠️ 图片链接已失效，无法访问\n`;
          report += `- ✅ 检查网页上是否还能看到这张图片\n`;
          report += `- ✅ 如果图片重要，尝试使用互联网档案馆（Wayback Machine）查找历史版本\n`;
        } else {
          report += `- ✅ 在浏览器中直接打开链接尝试访问\n`;
          report += `- ✅ 如果能访问，手动右键保存图片\n`;
        }
        
        report += `\n**替换步骤**:\n`;
        report += `1. 下载或截取图片，保存到 \`images/\` 文件夹\n`;
        report += `2. 将图片重命名为 \`manual_${index}.jpg\` (或对应格式)\n`;
        report += `3. 在 Markdown 文件中搜索上述链接\n`;
        report += `4. 替换为: \`![${img.altText || '图片'}](./images/manual_${index}.jpg)\`\n`;
        
        report += `\n---\n\n`;
        index++;
      }
    }
    
    // 添加批量处理脚本（可选）
    report += `## 📋 批量处理清单\n\n`;
    report += `可以复制以下链接列表，使用下载工具批量下载：\n\n`;
    report += `\`\`\`text\n`;
    for (const img of this.failedImages) {
      report += `${img.url}\n`;
    }
    report += `\`\`\`\n\n`;
    
    report += `---\n\n`;
    report += `💡 **提示**: 在 Markdown 文件中搜索 "⚠️ **图片加载失败**" 可以快速定位所有失败的图片位置。\n`;
    
    return report;
  }
}

// 初始化增强版PDF生成器
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new EnhancedPDFGenerator();
  });
} else {
  new EnhancedPDFGenerator();
} 