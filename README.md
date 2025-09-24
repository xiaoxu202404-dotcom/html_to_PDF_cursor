# 📚 网页转电子书生成器 (PDF & Markdown)

一个强大的Chrome浏览器扩展程序，能够将整个文档站点或网页内容智能转换为结构化的PDF电子书或Markdown文档，带有完整的目录导航。

## ✨ 核心特性

### 🎯 智能内容识别
- **自动内容提取**：使用先进的启发式算法智能识别网页主要内容区域
- **标题层级分析**：自动解析H1-H6标题结构，构建文档层次
- **内容密度评分**：通过算法评估不同区域的内容价值，过滤广告和导航元素

### 📖 专业排版系统
- **多种页面格式**：支持A4、Letter、Legal等标准纸张尺寸
- **书籍式排版**：模拟传统书籍的排版风格，包含封面、目录、正文分离
- **字体优化配置**：针对不同内容类型（标题、正文、代码）使用最适合的字体和大小

### 🗂️ 完整目录系统
- **自动目录生成**：根据标题层级自动构建可点击的目录
- **页码同步**：实时计算并同步目录中的页码信息
- **PDF书签功能**：生成PDF内置书签，支持快速跳转

### 📄 多格式导出
- **PDF电子书**：生成带目录和书签的专业PDF文档，适合阅读和打印。
- **Markdown文档**：导出一整个站点的结构化Markdown文件，保留标题层级，便于二次编辑和版本控制。

### 🖼️ 多媒体支持
- **图片智能处理**：自动调整图片尺寸，保持纵横比
- **代码块优化**：特殊处理代码内容，使用等宽字体和背景高亮
- **列表格式保持**：完整保留有序和无序列表的层级结构

## 🚀 技术架构

### 前端技术栈
```
├── Manifest V3          # Chrome扩展最新规范
├── JavaScript ES6+      # 现代JavaScript特性
├── CSS3 Grid/Flexbox   # 响应式布局系统
├── Chrome Extensions API # 浏览器扩展接口
└── jsPDF Library       # PDF生成核心库
```

### 核心算法
- **DOM遍历算法**：深度优先搜索遍历整个文档结构
- **内容评分系统**：基于内容长度、标题密度、链接密度的综合评分
- **层级构建算法**：使用栈数据结构构建标题的层级关系
- **布局计算引擎**：动态计算PDF页面布局和分页位置

## 🛠️ 安装与使用

### 系统要求
- Chrome浏览器版本 ≥ 88
- 支持Manifest V3的现代浏览器
- 建议内存 ≥ 4GB（处理大型文档时）

### 安装步骤

#### 方式一：开发者模式安装（推荐）
1. **下载源码**
   ```bash
   git clone https://github.com/your-repo/html-to-pdf-extension.git
   cd html-to-pdf-extension
   ```

2. **打开Chrome扩展管理**
   - 地址栏输入：`chrome://extensions/`
   - 或者：Chrome菜单 → 更多工具 → 扩展程序

3. **启用开发者模式**
   - 点击右上角的"开发者模式"切换开关

4. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

5. **完成安装**
   - 在浏览器工具栏看到📚图标即安装成功

#### 方式二：打包安装
```bash
# 如果你想打包为.crx文件
# 在扩展管理页面点击"打包扩展程序"
# 选择项目文件夹，生成.crx安装包
```

### 图标文件准备
在`icons/`目录下放置以下尺寸的PNG图标文件：
- `icon16.png` - 16×16像素
- `icon48.png` - 48×48像素  
- `icon128.png` - 128×128像素

> 📌 **提示**：可以使用[favicon生成器](https://favicon.io/)创建不同尺寸的图标

## 📖 使用指南

### 基础操作
1. **打开目标网页**
   - 浏览到要转换的网页（如技术文档、教程等）
   
2. **启动转换**
   - 点击浏览器工具栏的扩展图标
   - 插件会自动检测页面信息
   
3. **配置选项**
   ```
   📖 电子书标题: [自动检测或手动输入]
   ✍️ 作者: [可选，显示在封面]
   📄 页面大小: A4 / Letter / Legal
   
   选项:
   ☑️ 包含图片    - 是否包含页面中的图片
   ☑️ 生成目录    - 自动生成可点击的目录
   ☑️ 保留内部链接 - 保持文档内的跳转链接
   ```

4. **生成文档**
   - **选项A：生成PDF**
     - 点击"🚀 生成PDF电子书"
     - 等待处理完成（显示进度条）
     - 自动下载生成的PDF文件
   - **选项B：导出Markdown**
     - 点击"📄 导出为Markdown"
     - 插件将抓取所有相关页面并转换为Markdown格式
     - 自动下载包含完整内容的`.md`文件

### 高级功能

#### 预览功能
- 点击"👀 预览内容"查看将要转换的内容结构
- 确认标题层级和内容完整性

#### 批量处理
```javascript
// 可以通过控制台脚本批量处理多个页面
// 适合处理系列教程或文档集合
const pages = ['url1', 'url2', 'url3'];
// 具体实现可参考源码中的批处理模块
```

## 🎯 适用场景

### 📚 在线文档转换
- **技术文档**：将GitHub Wiki、GitBook等转为PDF
- **API文档**：保存Swagger、Postman文档
- **教程指南**：转换在线编程教程、使用手册

### 📰 内容归档
- **博客文章**：保存喜爱的技术博客文章
- **新闻报道**：归档重要新闻和分析文章
- **研究资料**：保存学术论文、研究报告

### 📖 学习资料
- **在线课程**：转换课程讲义和笔记
- **知识库**：整理个人知识库内容
- **参考手册**：制作便于查阅的技术手册

## ⚙️ 配置说明

### 默认设置
```json
{
  "defaultPageSize": "a4",
  "includeImages": true,
  "includeToc": true,
  "includeLinks": true,
  "maxFileSize": "50MB",
  "defaultAuthor": ""
}
```

### 高级配置
可以通过扩展的设置页面调整：
- **内容识别精度**：调整算法的内容识别准确性
- **排版参数**：自定义字体大小、行间距、页边距
- **输出质量**：平衡文件大小和显示质量

## 🔧 开发指南

### 项目结构
```
html_to_PDF_cursor/
├── manifest.json          # 扩展配置文件
├── popup.html             # 弹窗界面
├── popup.js              # 弹窗逻辑
├── popup.css             # 弹窗样式
├── content.js            # 内容脚本（核心算法）
├── content.css           # 内容样式
├── background.js         # 后台服务脚本
├── icons/                # 图标文件夹
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # 说明文档
```

### 核心类说明

#### `HTMLToPDFGenerator`类
```javascript
class HTMLToPDFGenerator {
  // 主要方法：
  - findMainContent()      // 智能内容识别
  - extractHeadings()      // 标题层级分析  
  - generatePDF()          // PDF生成核心
  - buildHierarchy()       // 层级结构构建
}
```

#### `PDFGeneratorPopup`类
```javascript
class PDFGeneratorPopup {
  // 界面控制：
  - handleGenerate()       // 处理生成请求
  - updateProgress()       // 更新进度显示
  - saveSettings()         // 保存用户设置
}
```

### 代码风格
- **注释风格**：采用详细的技术注释，类似C++风格
- **变量命名**：使用有意义的变量名，体现技术含义
- **架构设计**：模块化设计，松耦合，高内聚
- **错误处理**：完整的异常处理和用户反馈机制

## 🐛 故障排除

### 常见问题

#### Q: 生成的PDF缺少内容？
**A**: 检查以下几点：
1. 页面是否完全加载
2. 是否存在动态加载的内容
3. 网站是否使用了反爬虫机制

#### Q: 图片显示不正常？
**A**: 可能的原因：
- 图片跨域限制
- 图片格式不支持
- 网络连接问题

**解决方案**：
```javascript
// 在控制台运行，检查图片加载状态
document.querySelectorAll('img').forEach(img => {
  console.log(img.src, img.complete, img.naturalWidth);
});
```

#### Q: 扩展无法在某些网站工作？
**A**: 可能原因：
- 网站使用了严格的CSP策略
- 页面使用了Shadow DOM
- 网站阻止了扩展脚本执行

### 调试模式
开启开发者工具调试：
```javascript
// 在页面控制台中启用详细日志
localStorage.setItem('pdf-generator-debug', 'true');
```

## 🤝 贡献指南

### 开发环境搭建
```bash
# 1. 克隆仓库
git clone <repo-url>
cd html-to-pdf-extension

# 2. 安装开发依赖（如果有）
# npm install  # 目前项目为纯前端，暂不需要

# 3. 启动开发模式
# 直接在Chrome中加载开发版本即可
```

### 代码规范
- 遵循JavaScript ES6+标准
- 使用有意义的变量和函数命名
- 添加详细的技术注释
- 保持代码的模块化和可读性

### 提交流程
1. Fork项目仓库
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m "Add: 新功能描述"`
4. 推送分支：`git push origin feature/new-feature`
5. 创建Pull Request

## 📄 开源协议

本项目采用MIT开源协议，详情请参阅[LICENSE](LICENSE)文件。

## 🎉 致谢

- [jsPDF](https://github.com/MrRio/jsPDF) - PDF生成核心库
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/) - 浏览器扩展平台
- 所有参与测试和反馈的用户

## 📞 联系方式

- **问题报告**：通过GitHub Issues提交
- **功能建议**：欢迎在Issues中讨论
- **技术交流**：可以通过项目讨论区交流

---

**享受将网页转换为精美电子书的过程！** 📚✨ 