// Mock environment variables first
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

// Mock Supabase client
const mockInsert = jest.fn();
const mockLimit = jest.fn();
const mockOrder = jest.fn(() => ({ limit: mockLimit }));
const mockSelect = jest.fn(() => ({ order: mockOrder }));
const mockFrom = jest.fn(() => ({ insert: mockInsert, select: mockSelect }));
const mockSupabaseClient = { from: mockFrom };

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

const {
  storeTweetsToSupabase,
  getTweetsFromSupabase,
} = require('../lib/database');

describe('Database Functions', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('storeTweetsToSupabase', () => {
    it('should successfully store tweets to Supabase', async () => {
      // Arrange
      const mockTweets = [
        { id: '1', text: 'Test tweet 1', author: 'user1' },
        { id: '2', text: 'Test tweet 2', author: 'user2' },
      ];

      const mockResponse = {
        data: mockTweets,
        error: null,
      };

      mockInsert.mockResolvedValue(mockResponse);

      // Act
      const result = await storeTweetsToSupabase(mockTweets);

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('tweets');
      expect(mockInsert).toHaveBeenCalledWith(mockTweets);
      expect(result).toEqual({ success: true, data: mockTweets });
    });

    it('should throw error when Supabase returns error', async () => {
      // Arrange
      const mockTweets = [{ id: '1', text: 'Test tweet' }];
      const mockError = new Error('Database error');

      mockInsert.mockResolvedValue({
        data: null,
        error: mockError,
      });

      // Act & Assert
      await expect(storeTweetsToSupabase(mockTweets)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getTweetsFromSupabase', () => {
    it('should successfully retrieve tweets from Supabase', async () => {
      // Arrange
      const mockTweets = [
        { id: '1', text: 'Test tweet 1', created_at: '2024-01-01' },
        { id: '2', text: 'Test tweet 2', created_at: '2024-01-02' },
      ];

      const mockResponse = {
        data: mockTweets,
        error: null,
      };

      mockLimit.mockResolvedValue(mockResponse);

      // Act
      const result = await getTweetsFromSupabase(10);

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('tweets');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockTweets);
    });

    it('should return empty array when no data found', async () => {
      // Arrange
      const mockResponse = {
        data: [],
        error: null,
      };

      mockLimit.mockResolvedValue(mockResponse);

      // Act
      const result = await getTweetsFromSupabase();

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when Supabase returns error', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');

      mockLimit.mockResolvedValue({
        data: null,
        error: mockError,
      });

      // Act & Assert
      await expect(getTweetsFromSupabase(10)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should use default limit of 100 when no limit provided', async () => {
      // Arrange
      const mockTweets = [{ id: '1', text: 'Test tweet' }];
      const mockResponse = {
        data: mockTweets,
        error: null,
      };

      mockLimit.mockResolvedValue(mockResponse);

      // Act
      await getTweetsFromSupabase();

      // Assert
      expect(mockLimit).toHaveBeenCalledWith(100);
    });
  });
});
