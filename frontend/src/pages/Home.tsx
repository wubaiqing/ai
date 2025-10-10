import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArticleListItem } from '../types/article';
import { getArticles } from '../utils/fileReader';

const Home: React.FC = () => {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const data = await getArticles();
        // 只显示最新的10篇文章
        setArticles(data.slice(0, 10));
      } catch (err) {
        setError('Failed to load articles');
        console.error('Error fetching articles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
  };

  const formatDateCompact = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '');
  };

  const formatTitle = (date: string) => {
    return `AI 简报 ${formatDateCompact(date)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-8"></div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 简化的标题区域 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            像素简报
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            像素看AI，洞见新未来。
          </p>
          <Link
            to="/news"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            查看所有文章 →
          </Link>
        </div>
      </div>

      {/* 最新文章 */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">最新文章</h2>
          <Link
            to="/news"
            className="text-gray-600 hover:text-gray-900 font-medium text-sm"
          >
            查看全部 →
          </Link>
        </div>

        <div className="space-y-4">
          {articles.map((article) => (
            <article
              key={article.metadata.slug}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link
                    to={`/article/${article.metadata.slug}`}
                    className="block group"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-600 transition-colors">
                      {formatTitle(article.metadata.date)}
                    </h3>
                  </Link>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <time dateTime={article.metadata.date}>
                      {formatDate(article.metadata.date)}
                    </time>
                    {article.metadata.author && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{article.metadata.author}</span>
                      </>
                    )}
                  </div>

                  {article.metadata.summary && (
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {article.metadata.summary}
                    </p>
                  )}

                  {article.metadata.tags && article.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {article.metadata.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {articles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无文章</p>
          </div>
        )}
      </div>


    </div>
  );
};

export default Home;