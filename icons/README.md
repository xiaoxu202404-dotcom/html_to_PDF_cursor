# 插件图标文件说明

为了让浏览器插件正常工作，你需要在这个目录下放置以下三个图标文件：

## 📁 需要的文件

### `icon16.png`
- **尺寸**: 16×16 像素
- **用途**: 扩展管理页面的小图标
- **格式**: PNG格式，支持透明背景

### `icon48.png`  
- **尺寸**: 48×48 像素
- **用途**: 扩展管理页面的中等图标
- **格式**: PNG格式，支持透明背景

### `icon128.png`
- **尺寸**: 128×128 像素
- **用途**: Chrome网上应用店图标、扩展详情页
- **格式**: PNG格式，支持透明背景

## 🎨 设计建议

### 图标主题
建议使用与PDF和书籍相关的设计元素：
- 📚 书本图标
- 📄 文档图标  
- 🔄 转换箭头
- 📖 电子书图标

### 色彩方案
推荐使用与插件界面一致的配色：
- 主色调：`#4facfe` (蓝色渐变)
- 辅助色：`#00f2fe` (青色渐变)
- 背景：透明或白色

### 设计规范
- **简洁明了**：图标在小尺寸下也要清晰可见
- **风格统一**：三个尺寸的图标保持一致的设计风格
- **平台适配**：遵循Material Design或类似的现代设计规范

## 🛠️ 制作工具

### 在线工具（推荐）
1. **Favicon.io**
   - 网址：https://favicon.io/
   - 功能：可以从文字、图片或emoji生成各种尺寸的图标

2. **Canva**  
   - 网址：https://canva.com
   - 功能：专业的图标设计工具，有丰富的模板

3. **GIMP**
   - 免费的图像编辑软件
   - 支持批量导出不同尺寸

### 桌面软件
- **Adobe Illustrator**：矢量图标设计
- **Photoshop**：位图图标处理
- **Sketch**（Mac）：UI设计专用工具

## 📐 技术要求

### 文件规格
```
icon16.png:  16×16px,  PNG-24, 透明背景
icon48.png:  48×48px,  PNG-24, 透明背景  
icon128.png: 128×128px, PNG-24, 透明背景
```

### 优化建议
- 使用**PNG-24**格式保证图标质量
- 保持**透明背景**以适应不同主题
- 文件大小控制在**10KB以内**
- 确保在**深色和浅色背景**下都清晰可见

## ⚡ 快速生成

如果你想快速生成一套简单的图标，可以使用以下方法：

### 方法一：使用Emoji（最简单）
1. 访问 https://favicon.io/emoji-favicons/
2. 选择 📚 (书本emoji) 或 📄 (文档emoji)
3. 下载生成的图标包
4. 重命名为对应的文件名

### 方法二：使用文字生成
1. 访问 https://favicon.io/favicon-generator/
2. 输入 "PDF" 或者中文 "书"
3. 选择合适的字体和颜色
4. 生成并下载图标

### 方法三：AI生成（推荐）
使用AI工具生成图标：
```
提示词示例：
"Create a modern, minimalist icon for a PDF generator browser extension. 
The icon should feature a book or document symbol with blue gradient colors 
(#4facfe to #00f2fe). Design should be clean and recognizable at small sizes. 
Background should be transparent."
```

## 🔍 验证图标

安装插件前，请检查：
- ✅ 文件名完全正确（区分大小写）
- ✅ 尺寸精确匹配要求
- ✅ PNG格式，支持透明度
- ✅ 在浅色和深色背景下都清晰
- ✅ 文件大小合理（<10KB）

## 💡 图标创意参考

```
📚 + 🔄  →  书本转换图标
📄 + ⬇️  →  文档下载图标  
🌐 + 📖  →  网页转电子书
📑 + ✨  →  文档美化图标
```

完成图标文件准备后，就可以正常安装和使用浏览器插件了！ 