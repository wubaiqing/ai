/**
 * Supabase数据库连接和查询功能测试
 * 测试Supabase配置、连接、数据查询等功能
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../core/lib/config');

describe('Supabase数据库连接测试', () => {
    let supabase;
    let supabaseConfig;

    beforeAll(async () => {
        // 在所有测试开始前获取配置
        try {
            supabaseConfig = config.getSupabaseConfiguration();
            supabase = createClient(supabaseConfig.databaseUrl, supabaseConfig.anonymousKey);
        } catch (error) {
            console.error('测试初始化失败:', error);
        }
    });

    describe('配置加载测试', () => {
        test('应该成功加载Supabase配置', () => {
            expect(supabaseConfig).toBeDefined();
            expect(supabaseConfig.databaseUrl).toBeDefined();
            expect(supabaseConfig.anonymousKey).toBeDefined();
            expect(typeof supabaseConfig.databaseUrl).toBe('string');
            expect(typeof supabaseConfig.anonymousKey).toBe('string');
            expect(supabaseConfig.databaseUrl).toMatch(/^https:\/\/.*\.supabase\.co$/);
        });

        test('配置值不应为空或默认值', () => {
            expect(supabaseConfig.databaseUrl).not.toBe('');
            expect(supabaseConfig.anonymousKey).not.toBe('');
            expect(supabaseConfig.databaseUrl).not.toContain('your-project-url');
            expect(supabaseConfig.anonymousKey).not.toContain('your-anon-key');
        });
    });

    describe('Supabase客户端连接测试', () => {
        test('应该成功创建Supabase客户端', () => {
            expect(supabase).toBeDefined();
            expect(supabase.from).toBeDefined();
            expect(typeof supabase.from).toBe('function');
        });

        test('客户端应该有正确的配置', () => {
            expect(supabase.supabaseUrl).toBe(supabaseConfig.databaseUrl);
            expect(supabase.supabaseKey).toBe(supabaseConfig.anonymousKey);
        });
    });

    describe('tweets表查询功能测试', () => {
        test('应该能够连接到tweets表', async () => {
            const { data, error } = await supabase
                .from('tweets')
                .select('count', { count: 'exact', head: true });
            
            expect(error).toBeNull();
            expect(data).toBeDefined();
        }, 10000);

        test('应该能够查询tweets数据', async () => {
            const { data, error } = await supabase
                .from('tweets')
                .select('*')
                .limit(3)
                .order('created_at', { ascending: false });
            
            expect(error).toBeNull();
            expect(Array.isArray(data)).toBe(true);
            
            if (data.length > 0) {
                // 验证数据结构
                const tweet = data[0];
                expect(tweet).toHaveProperty('id');
                expect(tweet).toHaveProperty('created_at');
                // 其他字段可能为null，所以只检查存在性
                expect(tweet.hasOwnProperty('url') || tweet.url !== undefined).toBe(true);
                expect(tweet.hasOwnProperty('content') || tweet.content !== undefined).toBe(true);
            }
        }, 10000);

        test('查询结果应该按创建时间降序排列', async () => {
            const { data, error } = await supabase
                .from('tweets')
                .select('created_at')
                .limit(5)
                .order('created_at', { ascending: false });
            
            expect(error).toBeNull();
            
            if (data && data.length > 1) {
                for (let i = 0; i < data.length - 1; i++) {
                    const current = new Date(data[i].created_at);
                    const next = new Date(data[i + 1].created_at);
                    expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
                }
            }
        }, 10000);

        test('应该能够根据list_id过滤查询', async () => {
            // 先获取一个存在的list_id
            const { data: allData } = await supabase
                .from('tweets')
                .select('list_id')
                .not('list_id', 'is', null)
                .limit(1);
            
            if (allData && allData.length > 0) {
                const testListId = allData[0].list_id;
                
                const { data, error } = await supabase
                    .from('tweets')
                    .select('*')
                    .eq('list_id', testListId)
                    .limit(3);
                
                expect(error).toBeNull();
                expect(Array.isArray(data)).toBe(true);
                
                if (data.length > 0) {
                    data.forEach(tweet => {
                        expect(tweet.list_id).toBe(testListId);
                    });
                }
            }
        }, 10000);
    });

    describe('错误处理测试', () => {
        test('查询不存在的表应该返回错误', async () => {
            const { data, error } = await supabase
                .from('non_existent_table')
                .select('*')
                .limit(1);
            
            expect(error).not.toBeNull();
            expect(data).toBeNull();
        });

        test('无效的查询字段应该返回错误', async () => {
            const { data, error } = await supabase
                .from('tweets')
                .select('non_existent_field')
                .limit(1);
            
            expect(error).not.toBeNull();
        });

        test('应该处理网络连接问题', async () => {
            // 创建一个使用无效URL的客户端
            const invalidClient = createClient('https://invalid-url.supabase.co', 'invalid-key');
            
            const { data, error } = await invalidClient
                .from('tweets')
                .select('*')
                .limit(1);
            
            expect(error).not.toBeNull();
            expect(data).toBeNull();
        }, 15000);
    });

    describe('数据完整性测试', () => {
        test('tweets表应该有正确的字段结构', async () => {
            const { data, error } = await supabase
                .from('tweets')
                .select('*')
                .limit(1);
            
            expect(error).toBeNull();
            
            if (data && data.length > 0) {
                const tweet = data[0];
                // 根据实际数据库结构检查字段
                const actualFields = Object.keys(tweet);
                const expectedCoreFields = ['id', 'created_at'];
                
                // 检查核心字段存在且不为null
                expectedCoreFields.forEach(field => {
                    expect(tweet).toHaveProperty(field);
                    expect(tweet[field]).not.toBeNull();
                });
                
                // 检查实际字段数量合理（至少包含核心字段）
                expect(actualFields.length).toBeGreaterThanOrEqual(expectedCoreFields.length);
                
                // 验证常见字段类型
                if (tweet.id) expect(typeof tweet.id).toBe('number');
                if (tweet.created_at) expect(typeof tweet.created_at).toBe('string');
                if (tweet.url && tweet.url !== null) expect(typeof tweet.url).toBe('string');
                if (tweet.content && tweet.content !== null) expect(typeof tweet.content).toBe('string');
            }
        }, 10000);

        test('id字段应该是唯一的', async () => {
            const { data, error } = await supabase
                .from('tweets')
                .select('id')
                .limit(10);
            
            expect(error).toBeNull();
            
            if (data && data.length > 1) {
                const ids = data.map(tweet => tweet.id);
                const uniqueIds = [...new Set(ids)];
                expect(ids.length).toBe(uniqueIds.length);
            }
        }, 10000);
    });
});

// 导出用于其他测试文件使用的工具函数
module.exports = {
    createTestSupabaseClient: () => {
        const supabaseConfig = config.getSupabaseConfiguration();
        return createClient(supabaseConfig.databaseUrl, supabaseConfig.anonymousKey);
    },
    
    getTestSupabaseConfig: () => {
        return config.getSupabaseConfiguration();
    }
};