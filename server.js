const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const cors = require('cors');

const app = express();
const PORT = 3001;
const OUTPUTS_DIR = path.join(__dirname, 'outputs');

// 中间件
app.use(cors());
app.use(express.json());

// 获取所有文章列表
app.get('/api/articles', async (req, res) => {
  try {
    const files = await fs.readdir(OUTPUTS_DIR);
    const markdownFiles = files.filter(file => file.endsWith('.md') && file !== '.gitkeep');
    
    const articles = [];
    
    for (const file of markdownFiles) {
      try {
        const filePath = path.join(OUTPUTS_DIR, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data: metadata, content } = matter(fileContent);
        
        articles.push({
          filename: file,
          metadata: {
            title: metadata.title || 'Untitled',
            date: metadata.date || new Date().toISOString().split('T')[0],
            author: metadata.author || 'Unknown',
            summary: metadata.summary || '',
            tags: metadata.tags || [],
            slug: metadata.slug || file.replace('.md', '')
          },
          excerpt: content.substring(0, 200) + '...'
        });
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
    
    // 按日期排序（最新的在前）
    articles.sort((a, b) => new Date(b.metadata.date) - new Date(a.metadata.date));
    
    res.json(articles);
  } catch (error) {
    console.error('Error reading articles:', error);
    res.status(500).json({ error: 'Failed to read articles' });
  }
});

// 根据 slug 获取单篇文章
app.get('/api/articles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const files = await fs.readdir(OUTPUTS_DIR);
    const markdownFiles = files.filter(file => file.endsWith('.md') && file !== '.gitkeep');
    
    let foundArticle = null;
    
    for (const file of markdownFiles) {
      try {
        const filePath = path.join(OUTPUTS_DIR, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data: metadata, content } = matter(fileContent);
        
        const articleSlug = metadata.slug || file.replace('.md', '');
        
        if (articleSlug === slug) {
          foundArticle = {
            filename: file,
            metadata: {
              title: metadata.title || 'Untitled',
              date: metadata.date || new Date().toISOString().split('T')[0],
              author: metadata.author || 'Unknown',
              summary: metadata.summary || '',
              tags: metadata.tags || [],
              slug: articleSlug
            },
            content: content
          };
          break;
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
    
    if (foundArticle) {
      res.json(foundArticle);
    } else {
      res.status(404).json({ error: 'Article not found' });
    }
  } catch (error) {
    console.error('Error reading article:', error);
    res.status(500).json({ error: 'Failed to read article' });
  }
});

// 搜索文章
app.get('/api/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.json([]);
    }
    
    const files = await fs.readdir(OUTPUTS_DIR);
    const markdownFiles = files.filter(file => file.endsWith('.md') && file !== '.gitkeep');
    
    const articles = [];
    
    for (const file of markdownFiles) {
      try {
        const filePath = path.join(OUTPUTS_DIR, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data: metadata, content } = matter(fileContent);
        
        const title = metadata.title || 'Untitled';
        const tags = metadata.tags || [];
        
        // 搜索标题、内容和标签
        const searchText = query.toLowerCase();
        const matchesTitle = title.toLowerCase().includes(searchText);
        const matchesContent = content.toLowerCase().includes(searchText);
        const matchesTags = tags.some(tag => tag.toLowerCase().includes(searchText));
        
        if (matchesTitle || matchesContent || matchesTags) {
          articles.push({
            filename: file,
            metadata: {
              title,
              date: metadata.date || new Date().toISOString().split('T')[0],
              author: metadata.author || 'Unknown',
              summary: metadata.summary || '',
              tags,
              slug: metadata.slug || file.replace('.md', '')
            },
            excerpt: content.substring(0, 200) + '...'
          });
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
    
    // 按日期排序（最新的在前）
    articles.sort((a, b) => new Date(b.metadata.date) - new Date(a.metadata.date));
    
    res.json(articles);
  } catch (error) {
    console.error('Error searching articles:', error);
    res.status(500).json({ error: 'Failed to search articles' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Reading articles from: ${OUTPUTS_DIR}`);
});