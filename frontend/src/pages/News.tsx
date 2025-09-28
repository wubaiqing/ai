import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, User } from 'lucide-react';
import { ArticleListItem } from '../types/article';
import { getArticles, searchArticles } from '../utils/fileReader';

const News: React.FC = () => {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const data = await getArticles();
        setArticles(data);
        setFilteredArticles(data);
      } catch (err) {
        setError('Failed to load articles');
        console.error('Error fetching articles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  useEffect(() => {
    let filtered = articles;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(article =>
        article.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.metadata.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.metadata.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by selected tag
    if (selectedTag) {
      filtered = filtered.filter(article =>
        article.metadata.tags?.includes(selectedTag)
      );
    }

    setFilteredArticles(filtered);
  }, [articles, searchQuery, selectedTag]);

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
    return `像素简报 ${formatDateCompact(date)}`;
  };

  const getAllTags = () => {
    const tagSet = new Set<string>();
    articles.forEach(article => {
      article.metadata.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await searchArticles(query);
        setFilteredArticles(results);
      } catch (err) {
        console.error('Search error:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6 w-48"></div>
            <div className="h-10 bg-gray-200 rounded mb-8"></div>
            <div className="grid gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={`loading-${i}`} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="h-6 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">像素日报</h1>
          
          {/* 搜索栏 */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="搜索新闻..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 标签过滤 */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedTag('')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedTag === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {getAllTags().map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 文章列表 */}
        <div className="space-y-6">
          {filteredArticles.map((article) => (
            <Link
              key={article.metadata.slug}
              to={`/article/${article.metadata.slug}`}
              className="group block"
            >
              <article className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 mb-2">
                      {formatTitle(article.metadata.date)}
                    </h2>
                    <p className="text-gray-600 text-sm mb-4" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                      {article.metadata.summary}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(article.metadata.date)}
                    </span>
                    <span className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {article.metadata.author || '像素简报'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {article.metadata.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* No Results */}
        {filteredArticles.length === 0 && !loading && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              未找到文章
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedTag
                ? '请尝试调整搜索条件或筛选器。'
                : '暂时没有可用的文章。'}
            </p>
            {(searchQuery || selectedTag) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag('');
                }}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                清除所有筛选
              </button>
            )}
          </div>
        )}

        {/* Results Count */}
        {!loading && filteredArticles.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            显示 {filteredArticles.length} / {articles.length} 篇文章
          </div>
        )}
      </div>
    </div>
  );
};

export default News;