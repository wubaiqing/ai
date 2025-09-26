#!/usr/bin/env node

/**
 * Twitter AI Reporter - 长期运行服务
 * 替代cron定时任务，使用Node.js内置定时器实现任务调度
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { TimezoneUtils } = require('./scripts/core/lib/timezone');

// 日志函数
function log(level, message, tag = 'APP') {
    const timestamp = TimezoneUtils.getTimestamp();
    const logMessage = `[${timestamp}] [${level}] [${tag}] ${message}`;
    
    // 根据日志级别输出到不同的流
    if (level === 'ERROR') {
        console.error(logMessage);
    } else {
        console.log(logMessage);
    }
    
    // 安全地写入日志文件
    try {
        const logFile = path.join(__dirname, 'logs', 'app.log');
        fs.appendFileSync(logFile, logMessage + '\n');
    } catch (error) {
        console.error(`Failed to write log: ${error.message}`);
    }
}

// 执行shell命令
function executeCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: __dirname,
            stdio: 'pipe',
            ...options
        });
        
        let stdout = '';
        let stderr = '';
        
        // 设置超时机制
        const timeout = setTimeout(() => {
            child.kill('SIGTERM');
            reject(new Error(`Command timeout: ${command} ${args.join(' ')}`));
        }, 300000); // 5分钟超时
        
        child.stdout?.on('data', (data) => {
            stdout += data.toString();
            console.log(data.toString().trim());
        });
        
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
            console.error(data.toString().trim());
        });
        
        child.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                resolve({ stdout, stderr, code });
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr || 'No error message'}`));
            }
        });
        
        child.on('error', (error) => {
            clearTimeout(timeout);
            reject(new Error(`Command execution error: ${error.message}`));
        });
    });
}

// 任务调度器类
class TaskScheduler {
    constructor() {
        this.tasks = new Map();
        this.running = false;
        this.interval = null;
    }
    
    // 添加定时任务
    addTask(name, cronTime, command, args = []) {
        const nextRun = this.getNextRunTime(cronTime);
        this.tasks.set(name, {
            name,
            cronTime,
            command,
            args,
            lastRun: null,
            nextRun
        });
        log('INFO', `Task added: ${name} - Next run: ${TimezoneUtils.formatDateTime(nextRun)}`);
    }
    
    // 解析cron时间表达式 (简化版，支持 "分 时 日 月 周")
    parseCronTime(cronTime) {
        const parts = cronTime.split(' ');
        return {
            minute: parseInt(parts[0]) || 0,
            hour: parseInt(parts[1]) || 0,
            day: parts[2] === '*' ? null : parseInt(parts[2]),
            month: parts[3] === '*' ? null : parseInt(parts[3]),
            weekday: parts[4] === '*' ? null : parseInt(parts[4])
        };
    }
    
    // 计算下次运行时间
    getNextRunTime(cronTime) {
        const cron = this.parseCronTime(cronTime);
        const now = new Date();
        const next = new Date(now);
        
        // 设置到指定的小时和分钟
        next.setHours(cron.hour, cron.minute, 0, 0);
        
        // 如果今天的时间已经过了，设置为明天
        if (next <= now) {
            next.setDate(next.getDate() + 1);
        }
        
        return next;
    }
    
    // 格式化时间
    formatTime(date) {
        return TimezoneUtils.formatDateTime(date);
    }
    
    // 执行任务
    async executeTask(task) {
        const startTime = new Date();
        log('INFO', `Starting task: ${task.name}`, 'TASK');
        
        try {
            await executeCommand(task.command, task.args);
            const duration = new Date() - startTime;
            log('INFO', `Task completed: ${task.name} (${duration}ms)`, 'TASK');
            
            // 更新任务状态
            task.lastRun = startTime;
            task.nextRun = this.getNextRunTime(task.cronTime);
            
        } catch (error) {
            log('ERROR', `Task failed: ${task.name} - ${error.message}`, 'TASK');
            // 任务失败时，仍然更新下次运行时间，避免重复执行
            task.nextRun = this.getNextRunTime(task.cronTime);
        }
    }
    
    // 启动调度器
    start() {
        if (this.running) {
            log('WARN', 'Scheduler is already running');
            return;
        }
        
        this.running = true;
        log('INFO', 'Task scheduler started');
        
        // 每分钟检查一次任务
        this.interval = setInterval(() => {
            this.checkTasks();
        }, 60000); // 60秒检查一次
        
        // 立即检查一次
        this.checkTasks();
    }
    
    // 检查并执行到期的任务
    checkTasks() {
        const now = new Date();
        
        for (const task of this.tasks.values()) {
            if (task.nextRun <= now) {
                // 异步执行任务，不阻塞其他任务
                this.executeTask(task).catch(error => {
                    log('ERROR', `Task execution error: ${error.message}`, 'SCHEDULER');
                });
            }
        }
    }
    
    // 停止调度器
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.running = false;
        log('INFO', 'Task scheduler stopped');
    }
}



// 主函数
function main() {
    log('INFO', 'Twitter AI Reporter Service Starting...');
    
    // 确保必要的目录存在
    const dirs = ['logs'];
    dirs.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                log('INFO', `Created directory: ${dir}`);
            }
        } catch (error) {
            log('ERROR', `Failed to create directory ${dir}: ${error.message}`);
            process.exit(1);
        }
    });
    
    // 创建任务调度器
    const scheduler = new TaskScheduler();
    
    // 添加定时任务
    
    // 每2小时执行一次数据抓取任务（0点开始，每2小时一次）
    for (let hour = 0; hour < 24; hour += 2) {
        const taskName = `crawl-tweets-${hour.toString().padStart(2, '0')}`;
        const cronTime = `0 ${hour} * * *`;
        scheduler.addTask(taskName, cronTime, 'npm', ['start']);
    }
    
    // 每天晚上11点生成报告
    scheduler.addTask('generate-report', '0 23 * * *', 'npm', ['run', 'generate-report']);
    
    // 启动调度器
    log('INFO', 'Starting task scheduler...');
    scheduler.start();
    
    // 启动时立即执行一次抓取任务
    log('INFO', 'Executing initial crawl task on startup...');
    
    // 直接调用爬取函数，不使用外部脚本
    const { scrapeTwitterListWithAuthentication } = require('./scripts/tasks/crawl-tweets');
    const defaultListId = "1950374938378113192";
    const testScrollCount = 300;
    
    (async () => {
        try {
            log('INFO', 'Starting Twitter scraping task...');
            const scrapedTweets = await scrapeTwitterListWithAuthentication(defaultListId, testScrollCount);
            log('INFO', `Initial crawl task completed successfully - scraped ${scrapedTweets.length} tweets`);
        } catch (error) {
            log('ERROR', `Initial crawl task failed: ${error.message}`);
        }
    })();
    
    // 优雅关闭处理
    process.on('SIGINT', () => {
        log('INFO', 'Received SIGINT, shutting down gracefully...');
        scheduler.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        log('INFO', 'Received SIGTERM, shutting down gracefully...');
        scheduler.stop();
        process.exit(0);
    });
    
    // 保持进程运行
    log('INFO', 'Twitter AI Reporter Service is running...');
    log('INFO', 'Press Ctrl+C to stop the service');
}

// 启动应用
if (require.main === module) {
    main();
}

module.exports = { TaskScheduler, log };