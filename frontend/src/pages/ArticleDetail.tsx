import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Calendar, User, Clock, ArrowLeft } from 'lucide-react';
import { Article } from '../types/article';
import { getArticleBySlug } from '../utils/fileReader';



const ArticleDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) {
        setError('Article not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const data = await getArticleBySlug(slug);
        if (data) {
          setArticle(data);
        } else {
          setError('Article not found');
        }
      } catch (err) {
        setError('Failed to load article');
        console.error('Error fetching article:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug]);



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            {/* Back button skeleton */}
            <div className="h-6 bg-gray-200 rounded w-24 mb-8"></div>
            
            {/* Article header skeleton */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-48 mb-6"></div>
              <div className="flex gap-2 mb-6">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
            
            {/* Content skeleton */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                <div className="h-32 bg-gray-200 rounded mt-6"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Article Not Found'}
          </h1>
          <p className="text-gray-600 mb-6">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/news"
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-gray-600 hover:bg-gray-900 transition-colors"
          >
            ← Back to News
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {article ? (
          <article className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {article.metadata.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <time dateTime={article.metadata.date}>
                    {new Date(article.metadata.date).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </time>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>{article.metadata.author || '像素日报'}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>5 分钟阅读</span>
                </div>
              </div>
              {article.metadata.tags && article.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {article.metadata.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm border border-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children, ...props }) => (
                  <p {...props} className="mb-4 leading-relaxed text-gray-700">
                    {children}
                  </p>
                ),
                ul: ({ children, ...props }) => (
                  <ul {...props} className="list-disc list-inside mb-4 text-gray-700 space-y-2">
                    {children}
                  </ul>
                ),
                ol: ({ children, ...props }) => (
                  <ol {...props} className="list-decimal list-inside mb-4 text-gray-700 space-y-2">
                    {children}
                  </ol>
                ),
                h1: ({ children, ...props }) => (
                  <h1 {...props} className="text-2xl font-bold mb-4 text-gray-900">
                    {children}
                  </h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2 {...props} className="text-xl font-semibold mb-3 text-gray-900">
                    {children}
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 {...props} className="text-lg font-medium mb-2 text-gray-900">
                    {children}
                  </h3>
                ),
                a: ({ children, href, ...props }) => (
                  <a
                    {...props}
                    href={href}
                    className="text-blue-600 hover:text-blue-800 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children, ...props }) => (
                  <blockquote {...props} className="border-l-4 border-blue-200 pl-4 italic text-gray-600 my-4">
                    {children}
                  </blockquote>
                ),
                code: ({ children, ...props }) => (
                  <code {...props} className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children, ...props }) => (
                  <pre {...props} className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                    {children}
                  </pre>
                ),
                strong: ({ children, ...props }) => (
                  <strong {...props} className="font-bold text-gray-900">
                    {children}
                  </strong>
                ),
                em: ({ children, ...props }) => (
                  <em {...props} className="italic text-gray-700">
                    {children}
                  </em>
                ),
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>
          
          {/* 返回按钮 */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link
              to="/news"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回新闻列表
            </Link>
          </div>
        </article>
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleDetail;