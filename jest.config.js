/**
 * Jest 配置文件
 * 统一测试文件命名规范和测试环境设置
 */

module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // 测试目录
  testPathIgnorePatterns: [
    '/node_modules/',
    '/logs/',
    '/outputs/',
    '/supabase/'
  ],
  
  // 覆盖率配置
  collectCoverage: false,
  collectCoverageFrom: [
    'scripts/core/**/*.js',
    'scripts/tasks/**/*.js',
    '!scripts/**/*.test.js',
    '!scripts/**/*.spec.js',
    '!**/node_modules/**',
    '!**/logs/**',
    '!**/outputs/**'
  ],
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: 'coverage',
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // 测试超时时间（毫秒）
  testTimeout: 30000,
  
  // 详细输出
  verbose: true,
  
  // 设置文件
  setupFilesAfterEnv: [],
  
  // 模块路径映射
  moduleNameMapper: {},
  
  // 清除模拟
  clearMocks: true,
  
  // 恢复模拟
  restoreMocks: true
};