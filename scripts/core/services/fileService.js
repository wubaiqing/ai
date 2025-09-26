/**
 * 文件操作服务模块
 * 
 * 提供完整的文件管理功能，包括：
 * - 报告文件的创建和保存
 * - 文件读取和内容验证
 * - 文件列表管理和查询
 * - 文件清理和维护
 * - 错误处理和日志记录
 * 
 * @fileoverview 文件系统访问层，封装所有与文件操作相关的功能
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 * @requires fs/promises
 * @requires path
 * @requires ../utils.js
 */

const fs = require('fs').promises;
const path = require('path');
const { applicationConfig, getReportFilePath } = require('../reports/config');
const { Logger, TimeUtils, ValidationUtils, ErrorHandler } = require('../lib/utils');

/**
 * 文件操作服务管理类
 * 
 * 提供完整的文件系统操作接口，支持：
 * - 文件和目录的创建、读取、删除
 * - 文件内容的验证和格式化
 * - 批量文件操作和管理
 * - 文件系统错误处理
 * - 文件统计和监控
 * 
 * @class FileOperationService
 * @example
 * const fileService = new FileOperationService(config);
 * await fileService.saveReportToFile('report content', '/path/to/file.txt');
 * const files = await fileService.getReportFileList();
 */
class FileOperationService {
  /**
   * 构造文件操作服务实例
   * 
   * @constructor
   * @param {Object} configuration - 文件操作配置对象
   * @param {Object} configuration.file - 文件操作配置
   * @param {string} configuration.file.outputDirectory - 输出目录路径
   * @param {string} configuration.file.fileNamePrefix - 文件名前缀
   * @param {string} configuration.file.fileExtension - 文件扩展名
   * @param {number} configuration.file.maxFileRetention - 最大文件保留数量
   * @throws {Error} 当配置无效时抛出错误
   * @example
   * const service = new FileOperationService({
   *   file: {
   *     outputDirectory: './outputs',
   *     fileNamePrefix: 'daily_report_',
   *     fileExtension: '.txt',
   *     maxFileRetention: 30
   *   }
   * });
   */
  constructor() {
    this.config = applicationConfig;
    this.reportDirectory = applicationConfig.output.baseDirectory;
    this.encoding = applicationConfig.output.encoding;
  }

  /**
   * 确保指定目录路径存在（公共方法）
   * @param {string} [targetDirectoryPath] - 目录路径，默认为报告目录
   * @returns {Promise<void>}
   */
  async ensureDirectoryPathExists(targetDirectoryPath = null) {
    const resolvedDirectoryPath = targetDirectoryPath || this.config.output.baseDirectory;
    
    try {
      await fs.access(resolvedDirectoryPath);
      Logger.info(`目录已存在: ${resolvedDirectoryPath}`);
    } catch (directoryAccessError) {
      await fs.mkdir(resolvedDirectoryPath, { recursive: true });
      Logger.info(`创建目录: ${resolvedDirectoryPath}`);
    }
  }

  /**
   * 确保报告输出目录存在并可访问
   * @private
   */
  async ensureReportOutputDirectoryExists() {
    try {
      if (ValidationUtils.isEmptyOrWhitespace(this.reportDirectory)) {
      throw ErrorHandler.createStandardizedError('目录路径不能为空', 'EMPTY_DIRECTORY_PATH');
      }
      
      await fs.access(this.reportDirectory);
      Logger.info(`目录已存在: ${this.reportDirectory}`);
    } catch (directoryAccessError) {
      if (directoryAccessError.code === 'ENOENT') {
        // 目录不存在，创建目录
        try {
          await fs.mkdir(this.reportDirectory, { recursive: true });
          Logger.info(`成功创建目录: ${this.reportDirectory}`);
        } catch (directoryCreationError) {
          throw ErrorHandler.createStandardizedError(
            `创建目录失败: ${directoryCreationError.message}`,
            'DIRECTORY_CREATION_ERROR',
            directoryCreationError
          );
        }
      } else {
        throw ErrorHandler.createStandardizedError(
          `检查目录失败: ${directoryAccessError.message}`,
          'DIRECTORY_ACCESS_ERROR',
          directoryAccessError
        );
      }
    }
  }

  /**
   * 生成格式化的完整报告文件内容
   * @param {string} aiGeneratedContent - AI生成的报告内容
   * @param {Object} [reportMetadata] - 报告元数据
   * @returns {string} 完整的报告文件内容
   */
  generateFormattedReportContent(aiGeneratedContent, reportMetadata = {}) {
    if (ValidationUtils.isEmptyOrWhitespace(aiGeneratedContent)) {
      throw ErrorHandler.createStandardizedError('报告内容不能为空', 'EMPTY_REPORT_CONTENT');
    }
    
    const reportGenerationTimestamp = new Date();
    const formattedReportDate = TimeUtils.formatDateToLocalizedString(reportGenerationTimestamp);
    const formattedGenerationDateTime = TimeUtils.formatDateTimeToLocalizedString(reportGenerationTimestamp);
    
    // 文档标题
    const reportHeaderSection = `# 📊 AI科技简报 - ${formattedReportDate}\n\n`;
    
    // 生成内容概览部分（替代原摘要）
    const overviewSection = this.generateContentOverview(aiGeneratedContent, reportMetadata);
    
    // 元数据信息
    const metadataSection = `## 📋 报告信息\n\n` +
      `- **生成时间**: ${formattedGenerationDateTime}\n` +
      (reportMetadata.tweetsCount ? `- **数据来源**: ${reportMetadata.tweetsCount} 条推文\n` : '') +
      `- **报告类型**: 每日科技动态简报\n\n`;
    
    // 内容分隔符
    const contentSeparator = '---\n\n';
    
    // 页脚
    const reportFooterSection = '\n\n---\n\n' +
      `> 📅 **更新时间**: ${formattedGenerationDateTime}`;
    
    return reportHeaderSection + overviewSection + metadataSection + contentSeparator + aiGeneratedContent + reportFooterSection;
  }

  /**
   * 生成内容概览（200字以内）
   * @param {string} aiGeneratedContent - AI生成的内容
   * @param {Object} reportMetadata - 报告元数据
   * @returns {string} 内容概览
   */
  generateContentOverview(aiGeneratedContent, reportMetadata) {
    // 提取主要话题数量
    const topicMatches = aiGeneratedContent.match(/##\s+[^\n]+/g) || [];
    const topicCount = topicMatches.length;
    
    // 提取主要话题标题（前3个），去掉 emoji 表情符号
    const mainTopics = topicMatches.slice(0, 3).map(topic => 
      topic.replace(/##\s+/, '')
           .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu, '')
           .trim()
    );
    
    let overview = `## 内容概览\n\n`;
    overview += `基于`;
    
    if (reportMetadata.tweetsCount) {
      overview += ` **${reportMetadata.tweetsCount}** 条推文数据深度分析，`;
    }
    
    overview += `重点关注：`;
    
    if (mainTopics.length > 0) {
      overview += mainTopics.slice(0, 2).join('、');
      if (mainTopics.length > 2) {
        overview += `、${mainTopics[2]}`;
      }
      overview += `等领域`;
    } else {
      overview += `人工智能、云计算、区块链等前沿技术`;
    }
    
    overview += `的最新动态，为您提供精准的行业洞察和趋势分析。\n\n`;
    
    return overview;
  }



  /**
   * 保存报告内容到指定文件
   * 
   * 将生成的报告内容写入文件系统，自动创建目录结构
   * 
   * @async
   * @method saveReportToFile
   * @param {string} reportContentData - 要保存的报告内容
   * @param {Object} [saveOptions] - 保存选项
   * @returns {Promise<string>} 保存的文件路径
   * @throws {Error} 当文件保存失败时抛出错误
   * @example
   * const result = await fileService.saveReportToFile(
   *   'Daily Report Content',
   *   '/outputs/daily_report_2024-01-01.txt'
   * );
   * console.log(`文件已保存: ${result.filePath}`);
   */
  async saveReportToFile(reportContentData, saveOptions = {}) {
    try {
      if (ValidationUtils.isEmptyOrWhitespace(reportContentData)) {
      throw ErrorHandler.createStandardizedError('报告内容不能为空', 'EMPTY_REPORT_CONTENT');
      }
      
      Logger.info('开始保存报告文件...');
      
      // 确保输出目录存在
      await this.ensureReportOutputDirectoryExists();
      
      // 生成文件路径
      const reportFilePath = saveOptions.customPath || getReportFilePath();
      
      // 生成完整的报告内容
      const completeReportContent = this.generateFormattedReportContent(reportContentData, saveOptions.metadata);
      
      // 写入文件
      await fs.writeFile(reportFilePath, completeReportContent, this.encoding);
      
      Logger.info(`报告文件保存成功: ${reportFilePath}`);
      
      // 生成并保存文件列表 JSON
      await this.generateAndSaveFileListJson();
      
      return reportFilePath;
    } catch (fileSaveError) {
      Logger.error('保存报告文件失败', { error: fileSaveError.message });
      throw ErrorHandler.createStandardizedError(
        `保存报告文件失败: ${fileSaveError.message}`,
        'FILE_SAVE_ERROR',
        fileSaveError
      );
    }
  }

  /**
   * 保存报告内容到指定文件（别名方法，保持向后兼容）
   * @param {string} reportContentData - 要保存的报告内容
   * @param {Object} [saveOptions] - 保存选项
   * @returns {Promise<string>} 保存的文件路径
   */
  async saveReportContentToFile(reportContentData, saveOptions = {}) {
    return this.saveReportToFile(reportContentData, saveOptions);
  }

  /**
   * 读取指定报告文件的内容
   * 
   * 从文件系统读取报告文件，并进行内容验证
   * 
   * @async
   * @method readReportFromFile
   * @param {string} reportFileName - 要读取的文件完整路径
   * @returns {Promise<string>} 文件的文本内容
   * @throws {Error} 当文件不存在或读取失败时抛出错误
   * @example
   * const content = await fileService.readReportFromFile(
   *   '/outputs/daily_report_2024-01-01.txt'
   * );
   * console.log('文件内容:', content);
   */
  async readReportFileContent(reportFileName) {
    try {
      if (ValidationUtils.isEmptyOrWhitespace(reportFileName)) {
      throw ErrorHandler.createStandardizedError('文件路径不能为空', 'EMPTY_FILE_PATH');
      }
      
      Logger.info(`读取报告文件: ${reportFileName}`);
      
      const fileContentData = await fs.readFile(reportFileName, this.encoding);
      
      Logger.info('报告文件读取成功');
      
      return fileContentData;
    } catch (fileReadError) {
      Logger.error('读取报告文件失败', { error: fileReadError.message });
      throw ErrorHandler.createStandardizedError(
        `读取报告文件失败: ${fileReadError.message}`,
        'FILE_READ_ERROR',
        fileReadError
      );
    }
  }

  /**
   * 检查指定文件是否存在
   * @param {string} targetFileName - 文件名
   * @returns {Promise<boolean>} 文件是否存在
   */
  async checkReportFileExists(targetFileName) {
    try {
      if (ValidationUtils.isEmptyOrWhitespace(targetFileName)) {
        return false;
      }
      
      const targetFilePath = path.join(this.reportDirectory, targetFileName);
      await fs.access(targetFilePath);
      return true;
    } catch (fileAccessError) {
      return false;
    }
  }

  /**
   * 获取报告目录下的所有文件列表
   * 
   * 扫描报告目录，返回所有报告文件的详细信息
   * 
   * @async
   * @method getReportFileList
   * @returns {Promise<Array<Object>>} 文件信息数组
   * @throws {Error} 当目录读取失败时抛出错误
   * @example
   * const files = await fileService.getReportFileList();
   * files.forEach(file => {
   *   console.log(`${file.name} - ${file.size} bytes`);
   * });
   */
  async getReportFilesList() {
    try {
      Logger.info(`获取报告目录文件列表: ${this.reportDirectory}`);
      
      // 确保目录存在
      await this.ensureReportOutputDirectoryExists();
      
      const directoryFiles = await fs.readdir(this.reportDirectory);
      
      // 过滤出.md文件
      const markdownReportFiles = directoryFiles
        .filter(fileName => fileName.endsWith('.md'))
        .map(fileName => ({
          fileName,
          fullPath: path.join(this.reportDirectory, fileName),
          baseName: path.basename(fileName, '.md')
        }))
        .sort((a, b) => b.fileName.localeCompare(a.fileName)); // 按文件名倒序排列
      
      Logger.info(`找到 ${markdownReportFiles.length} 个报告文件`);
      
      return markdownReportFiles;
    } catch (directoryReadError) {
      Logger.error('获取报告文件列表失败', { error: directoryReadError.message });
      throw ErrorHandler.createStandardizedError(
        `获取报告文件列表失败: ${directoryReadError.message}`,
        'LIST_FILES_ERROR',
        directoryReadError
      );
    }
  }

  /**
   * 删除指定的报告文件
   * 
   * 安全地删除文件，包含路径验证和错误处理
   * 
   * @async
   * @method deleteReportFile
   * @param {string} targetFileName - 要删除的文件名
   * @returns {Promise<boolean>} 删除成功返回true，失败返回false
   * @throws {Error} 当文件删除操作失败时抛出错误
   * @example
   * const deleted = await fileService.deleteReportFile(
   *   'old_report.txt'
   * );
   * if (deleted) {
   *   console.log('文件删除成功');
   * }
   */
  async deleteSpecificReportFile(targetFileName) {
    try {
      if (ValidationUtils.isEmptyOrWhitespace(targetFileName)) {
      throw ErrorHandler.createStandardizedError('文件路径不能为空', 'EMPTY_FILE_PATH');
      }
      
      const targetFilePath = path.join(this.reportDirectory, targetFileName);
      const fileExists = await this.checkFileExists(targetFilePath);
      if (!fileExists) {
        Logger.warn(`文件不存在，无需删除: ${targetFilePath}`);
        return false;
      }
      
      await fs.unlink(targetFilePath);
      Logger.info(`报告文件删除成功: ${targetFilePath}`);
      
      return true;
    } catch (fileDeletionError) {
      Logger.error('删除报告文件失败', { error: fileDeletionError.message });
      throw ErrorHandler.createStandardizedError(
        `删除报告文件失败: ${fileDeletionError.message}`,
        'FILE_DELETE_ERROR',
        fileDeletionError
      );
    }
  }

  /**
   * 获取指定文件的详细统计信息
   * 
   * 分析指定文件，提供文件大小、创建时间等统计数据
   * 
   * @async
   * @method getFileStatistics
   * @param {string} targetFileName - 文件名
   * @returns {Promise<Object>} 文件统计信息
   * @throws {Error} 当统计计算失败时抛出错误
   * @example
   * const stats = await fileService.getFileStatistics('report.txt');
   * console.log(`文件大小 ${stats.fileSize} bytes`);
   */
  async getReportFileStatistics(targetFileName) {
    try {
      if (ValidationUtils.isEmptyOrWhitespace(targetFileName)) {
      throw ErrorHandler.createStandardizedError('文件路径不能为空', 'EMPTY_FILE_PATH');
      }
      
      const targetFilePath = path.join(this.reportDirectory, targetFileName);
      const fileStatistics = await fs.stat(targetFilePath);
      
      return {
        fileSize: fileStatistics.size,
        sizeInKB: Math.round(fileStatistics.size / 1024 * 100) / 100,
        creationTime: fileStatistics.birthtime,
        lastModifiedTime: fileStatistics.mtime,
        isRegularFile: fileStatistics.isFile(),
        isDirectoryPath: fileStatistics.isDirectory()
      };
    } catch (fileStatsError) {
      Logger.error('获取文件统计信息失败', { error: fileStatsError.message });
      throw ErrorHandler.createStandardizedError(
        `获取文件统计信息失败: ${fileStatsError.message}`,
        'FILE_STATS_ERROR',
        fileStatsError
      );
    }
  }

  /**
   * 清理过期的报告文件
   * 
   * 根据配置的保留策略，自动删除过期的报告文件
   * 
   * @async
   * @method cleanupOldReportFiles
   * @param {number} [maxRetainedFiles=10] - 保留的最大文件数
   * @returns {Promise<number>} 删除的文件数量
   * @throws {Error} 当清理操作失败时抛出错误
   * @example
   * const deletedCount = await fileService.cleanupOldReportFiles(30);
   * console.log(`清理了 ${deletedCount} 个过期文件`);
   */
  async cleanupExpiredReportFiles(maxRetainedFiles = 10) {
    try {
      const allReportFiles = await this.getReportFilesList();
      
      if (allReportFiles.length <= maxRetainedFiles) {
        Logger.info(`文件数量 (${allReportFiles.length}) 未超过限制 (${maxRetainedFiles})，无需清理`);
        return 0;
      }
      
      // 按修改时间排序，保留最新的文件
      const chronologicallySortedFiles = allReportFiles.sort((a, b) => b.modifiedAt - a.modifiedAt);
      const expiredFilesToDelete = chronologicallySortedFiles.slice(maxRetainedFiles);
      
      let successfullyDeletedCount = 0;
      for (const expiredFile of expiredFilesToDelete) {
        try {
          await this.deleteSpecificReportFile(expiredFile.fileName);
          successfullyDeletedCount++;
        } catch (fileDeletionError) {
          Logger.error(`删除文件失败: ${expiredFile.fileName}`, { error: fileDeletionError.message });
        }
      }
      
      Logger.info(`清理完成，删除了 ${successfullyDeletedCount} 个旧文件`);
      return successfullyDeletedCount;
    } catch (cleanupOperationError) {
      throw ErrorHandler.createStandardizedError(
        `清理旧文件失败: ${cleanupOperationError.message}`,
        'CLEANUP_ERROR',
        cleanupOperationError
      );
    }
  }

  /**
   * 生成并保存文件列表 JSON
   * 
   * 扫描报告目录，生成包含所有文件信息的 JSON 文件
   * 
   * @async
   * @method generateAndSaveFileListJson
   * @returns {Promise<void>}
   * @throws {Error} 当生成 JSON 文件失败时抛出错误
   */
  async generateAndSaveFileListJson() {
    try {
      Logger.info('开始生成文件列表 JSON...');
      
      const reportFiles = await this.getReportFilesList();
      const fileList = [];
      
      for (const fileInfo of reportFiles) {
        try {
          const fileStats = await fs.stat(fileInfo.fullPath);
          
          // 读取文件内容以提取标题
          let title = fileInfo.baseName;
          try {
            const content = await fs.readFile(fileInfo.fullPath, this.encoding);
            const titleMatch = content.match(/^#\s+(.+)$/m);
            if (titleMatch) {
              title = titleMatch[1].trim();
            }
          } catch (contentReadError) {
            Logger.warn(`无法读取文件 ${fileInfo.fileName} 的标题: ${contentReadError.message}`);
          }
          
          fileList.push({
            filename: fileInfo.fileName,
            title: title,
            date: fileStats.mtime.toISOString().split('T')[0],
            path: `/outputs/${fileInfo.fileName}`,
            size: fileStats.size,
            lastModified: fileStats.mtime.toISOString(),
            slug: fileInfo.baseName
          });
        } catch (fileStatsError) {
          Logger.warn(`无法获取文件 ${fileInfo.fileName} 的统计信息: ${fileStatsError.message}`);
        }
      }
      
      // 按日期排序（最新的在前）
      fileList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const jsonContent = JSON.stringify({
        lastUpdated: new Date().toISOString(),
        totalFiles: fileList.length,
        files: fileList
      }, null, 2);
      
      const frontendOutputsDir = path.join(__dirname, '../../../frontend/public/outputs');
      await fs.mkdir(frontendOutputsDir, { recursive: true });
      const jsonFilePath = path.join(frontendOutputsDir, 'file-list.json');
      await fs.writeFile(jsonFilePath, jsonContent, this.encoding);
      
      Logger.info(`文件列表 JSON 已保存到: ${jsonFilePath}`);
      
      // JSON 文件已直接保存到前端目录，无需复制
    } catch (error) {
      Logger.error('生成文件列表 JSON 失败', { error: error.message });
      throw ErrorHandler.createStandardizedError(
        `生成文件列表 JSON 失败: ${error.message}`,
        'JSON_GENERATION_ERROR',
        error
      );
    }
  }


}

// 创建单例实例
const fileOperationService = new FileOperationService();

module.exports = {
  FileOperationService,
  fileOperationService
};