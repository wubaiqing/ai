import { Article, ArticleMetadata, ArticleListItem } from '../types/article';

// 解析 markdown 文件的 frontmatter
function parseFrontmatter(content: string): { metadata: ArticleMetadata; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    // 如果没有 frontmatter，返回默认值
    return {
      metadata: {
        title: 'Untitled',
        date: new Date().toISOString().split('T')[0],
        author: 'Unknown',
        summary: '',
        tags: []
      },
      body: content
    };
  }
  
  const frontmatterText = match[1];
  const body = match[2];
  
  // 解析 YAML 格式的 frontmatter
  const metadata: Partial<ArticleMetadata> = {};
  const lines = frontmatterText.split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    
    if (key === 'tags') {
      // 解析数组格式的 tags
      const tagsMatch = value.match(/\[([^\]]+)\]/);
      if (tagsMatch) {
        metadata.tags = tagsMatch[1].split(',').map(tag => tag.trim().replace(/["']/g, ''));
      } else {
        metadata.tags = [];
      }
    } else {
      (metadata as any)[key] = value.replace(/["']/g, '');
    }
  }
  
  return {
    metadata: {
      title: metadata.title || 'Untitled',
      date: metadata.date || new Date().toISOString().split('T')[0],
      author: metadata.author || 'Unknown',
      summary: metadata.summary || '',
      tags: metadata.tags || []
    },
    body
  };
}

// 从文件名生成 slug
function generateSlug(filename: string): string {
  return filename.replace(/\.md$/, '');
}

// 获取所有文章列表
export async function getArticles(): Promise<ArticleListItem[]> {
  try {
    // 获取 outputs 目录下的所有 markdown 文件
    const response = await fetch('/outputs/');
    if (!response.ok) {
      // 如果无法获取目录列表，返回已知的文件
      const knownFiles = ['ai-report-2025-01-25.md', 'ai-report-2025-09-25.md'];
      const articles: ArticleListItem[] = [];
      
      for (const filename of knownFiles) {
        try {
          const fileResponse = await fetch(`/outputs/${filename}`);
          if (fileResponse.ok) {
            const content = await fileResponse.text();
            const { metadata } = parseFrontmatter(content);
            articles.push({
              slug: generateSlug(filename),
              title: metadata.title,
              date: metadata.date,
              author: metadata.author,
              summary: metadata.summary,
              tags: metadata.tags
            });
          }
        } catch (error) {
          console.warn(`Failed to load ${filename}:`, error);
        }
      }
      
      return articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    // 这里应该解析目录列表，但由于浏览器限制，我们使用已知文件列表
    const knownFiles = ['ai-report-2025-01-25.md', 'ai-report-2025-09-25.md'];
    const articles: ArticleListItem[] = [];
    
    for (const filename of knownFiles) {
      try {
        const fileResponse = await fetch(`/outputs/${filename}`);
        if (fileResponse.ok) {
          const content = await fileResponse.text();
          const { metadata } = parseFrontmatter(content);
          articles.push({
            slug: generateSlug(filename),
            title: metadata.title,
            date: metadata.date,
            author: metadata.author,
            summary: metadata.summary,
            tags: metadata.tags
          });
        }
      } catch (error) {
        console.warn(`Failed to load ${filename}:`, error);
      }
    }
    
    return articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Failed to get articles:', error);
    return [];
  }
}

// 根据 slug 获取单篇文章
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const filename = `${slug}.md`;
    const response = await fetch(`/outputs/${filename}`);
    
    if (!response.ok) {
      return null;
    }
    
    const content = await response.text();
    const { metadata, body } = parseFrontmatter(content);
    
    return {
      slug,
      title: metadata.title,
      date: metadata.date,
      author: metadata.author,
      summary: metadata.summary,
      tags: metadata.tags,
      content: body
    };
  } catch (error) {
    console.error(`Failed to get article ${slug}:`, error);
    return null;
  }
}

// 搜索文章
export async function searchArticles(query: string): Promise<ArticleListItem[]> {
  const allArticles = await getArticles();
  
  if (!query.trim()) {
    return allArticles;
  }
  
  const searchTerm = query.toLowerCase();
  
  return allArticles.filter(article => 
    article.title.toLowerCase().includes(searchTerm) ||
    article.summary.toLowerCase().includes(searchTerm) ||
    article.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
}