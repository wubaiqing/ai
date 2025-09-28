import { Article, ArticleMetadata, ArticleListItem } from '../types/article';

// 解析 markdown 文件的 frontmatter
function parseFrontmatter(content: string, filename?: string): { metadata: ArticleMetadata; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    // 如果没有 frontmatter，从内容中智能提取信息
    let title = 'AI科技简报';
    let date = new Date().toISOString().split('T')[0];
    let summary = '';
    
    // 从第一行提取标题（如果是 # 格式）
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    // 从文件名提取日期
    if (filename) {
      const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        date = dateMatch[1];
      }
    }
    
    // 从内容概览部分提取摘要
    const summaryMatch = content.match(/##\s*📝\s*内容概览[\s\S]*?\n([\s\S]*?)(?=\n##|$)/);
    if (summaryMatch) {
      summary = summaryMatch[1].trim().replace(/^-\s*/gm, '').substring(0, 200);
    }
    
    return {
      metadata: {
        title,
        date,
        author: '像素简报',
        summary,
        tags: [],
        slug: filename ? generateSlug(filename) : ''
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
      tags: metadata.tags || [],
      slug: filename ? generateSlug(filename) : ''
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
    // 优先尝试读取 JSON 文件列表
    try {
      const jsonResponse = await fetch('/outputs/file-list.json');
      if (jsonResponse.ok) {
        const fileList = await jsonResponse.json();
        console.log('使用 JSON 文件列表获取文章');
        
        // 直接使用 JSON 文件中的元数据，无需重新解析每个文件
        const articles: ArticleListItem[] = fileList.files.map((file: any) => ({
          metadata: {
            title: file.title,
            date: file.date,
            author: file.author || '像素简报',
            summary: file.summary || '',
            tags: file.tags || [],
            slug: file.slug
          },
          filename: `${file.slug}.md`
        }));
        
        return articles.sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime());
      }
    } catch (jsonError) {
      console.warn('无法读取 JSON 文件列表，使用传统方式:', jsonError);
    }
    
    // 如果 JSON 文件不存在或读取失败，使用传统方式（向后兼容）
    console.log('使用传统方式获取文章列表');
    
    // 获取 outputs 目录下的所有 markdown 文件
    const response = await fetch('/outputs/');
    if (!response.ok) {
      // 如果无法获取目录列表，返回已知的文件
      const knownFiles = ['ai-report-2025-01-25.md', 'ai-report-2025-09-25.md', '2025-09-25-ai-tech-brief.md'];
      const articles: ArticleListItem[] = [];
      
      for (const filename of knownFiles) {
        try {
          const fileResponse = await fetch(`/outputs/${filename}`);
          if (fileResponse.ok) {
            const content = await fileResponse.text();
            const { metadata } = parseFrontmatter(content, filename);
            articles.push({
              metadata: {
                ...metadata,
                slug: generateSlug(filename)
              },
              filename
            });
          }
        } catch (error) {
          console.warn(`Failed to load ${filename}:`, error);
        }
      }
      
      return articles.sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime());
    }
    
    // 这里应该解析目录列表，但由于浏览器限制，我们使用已知文件列表
    const knownFiles = ['ai-report-2025-01-25.md', 'ai-report-2025-09-25.md', '2025-09-25-ai-tech-brief.md'];
    const articles: ArticleListItem[] = [];
    
    for (const filename of knownFiles) {
      try {
        const fileResponse = await fetch(`/outputs/${filename}`);
        if (fileResponse.ok) {
          const content = await fileResponse.text();
          const { metadata } = parseFrontmatter(content, filename);
          articles.push({
            metadata: {
              ...metadata,
              slug: generateSlug(filename)
            },
            filename
          });
        }
      } catch (error) {
        console.warn(`Failed to load ${filename}:`, error);
      }
    }
    
    return articles.sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime());
  } catch (error) {
    console.error('Failed to get articles:', error);
    return [];
  }
}

// 根据 slug 获取单篇文章
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const filename = `${slug}.md`;
    
    // 优先尝试从 JSON 文件中获取元数据
    let jsonMetadata = null;
    try {
      const jsonResponse = await fetch('/outputs/file-list.json');
      if (jsonResponse.ok) {
        const fileList = await jsonResponse.json();
        const fileInfo = fileList.files.find((file: any) => file.slug === slug);
        if (fileInfo) {
          jsonMetadata = {
            title: fileInfo.title,
            date: fileInfo.date,
            author: fileInfo.author || '像素简报',
            summary: fileInfo.summary || '',
            tags: fileInfo.tags || [],
            slug: fileInfo.slug
          };
        }
      }
    } catch (jsonError) {
      console.warn('无法读取 JSON 元数据:', jsonError);
    }
    
    const response = await fetch(`/outputs/${filename}`);
    
    if (!response.ok) {
      return null;
    }
    
    const content = await response.text();
    
    // 如果有 JSON 元数据，使用它；否则解析 markdown
    let metadata, body;
    if (jsonMetadata) {
      metadata = jsonMetadata;
      body = content;
    } else {
      const parsed = parseFrontmatter(content, filename);
      metadata = parsed.metadata;
      body = parsed.body;
    }
    
    return {
      metadata: {
        ...metadata,
        slug
      },
      content: body,
      filename
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
    article.metadata.title.toLowerCase().includes(searchTerm) ||
    article.metadata.summary?.toLowerCase().includes(searchTerm) ||
    article.metadata.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm))
  );
}