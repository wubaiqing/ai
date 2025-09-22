#!/usr/bin/env node

/**
 * Twitter AI Reporter - 长期运行服务
 * 替代cron定时任务，使用Node.js内置定时器实现任务调度
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 日志函数
function log(level, message, tag = 'APP') {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logMessage = `[${timestamp}] [${tag}] ${message}`;
    console.log(logMessage);
    
    // 写入日志文件
    const logFile = path.join(__dirname, 'logs', 'app.log');
    fs.appendFileSync(logFile, logMessage + '\n');
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
        
        child.stdout?.on('data', (data) => {
            stdout += data.toString();
            console.log(data.toString().trim());
        });
        
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
            console.error(data.toString().trim());
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr, code });
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

// 任务执行函数
class TaskScheduler {
    constructor() {
        this.tasks = [];
        this.running = false;
    }
    
    // 添加定时任务
    addTask(name, cronTime, command, args = []) {
        this.tasks.push({
            name,
            cronTime,
            command,
            args,
            lastRun: null,
            nextRun: this.getNextRunTime(cronTime)
        });
        log('INFO', `Task added: ${name} - Next run: ${this.formatTime(this.getNextRunTime(cronTime))}`);
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
        return date.toISOString().replace('T', ' ').substring(0, 19);
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
        
        for (const task of this.tasks) {
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

// 日志清理函数
function cleanupLogs() {
    const logsDir = path.join(__dirname, 'logs');
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    
    files.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            log('INFO', `Cleaned up old log file: ${file}`, 'CLEANUP');
        }
    });
}

// 主函数
function main() {
    log('INFO', 'Twitter AI Reporter Service Starting...');
    
    // 确保必要的目录存在
    const dirs = ['logs', 'reports'];
    dirs.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            log('INFO', `Created directory: ${dir}`);
        }
    });
    
    // 创建任务调度器
    const scheduler = new TaskScheduler();
    
    // 添加定时任务（对应原来的cron任务）
    
    // 每天凌晨2点清理日志
    scheduler.addTask('cleanup-logs', '0 2 * * *', 'node', ['-e', `
        const fs = require('fs');
        const path = require('path');
        const logsDir = path.join('${__dirname}', 'logs');
        const files = fs.readdirSync(logsDir);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        files.forEach(file => {
            const filePath = path.join(logsDir, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filePath);
                console.log('Cleaned up:', file);
            }
        });
    `]);
    
    // 每天上午9点执行爬取推文任务
    scheduler.addTask('crawl-tweets-morning', '0 9 * * *', 'npm', ['start']);
    
    // 每天下午4点执行爬取推文任务
    scheduler.addTask('crawl-tweets-afternoon', '0 16 * * *', 'npm', ['start']);
    
    // 每天晚上11点生成报告
    scheduler.addTask('generate-report', '0 23 * * *', 'npm', ['run', 'generate-report']);
    
    // 启动调度器
    scheduler.start();
    
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