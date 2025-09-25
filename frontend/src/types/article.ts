// Article metadata interface
export interface ArticleMetadata {
  title: string;
  date: string;
  author?: string;
  summary?: string;
  tags?: string[];
  slug: string;
}

// Full article interface
export interface Article {
  metadata: ArticleMetadata;
  content: string;
  filename: string;
}

// Article list item interface
export interface ArticleListItem {
  metadata: ArticleMetadata;
  filename: string;
  excerpt?: string;
}