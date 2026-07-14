// 密码哈希生成工具
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔐 密码哈希生成工具');
console.log('='.repeat(50));

rl.question('请输入要加密的密码: ', async (password) => {
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        console.log('\n✅ 密码哈希生成成功!');
        console.log('原始密码:', password);
        console.log('哈希密码:', hashedPassword);
        console.log('\n使用方法：');
        console.log('1. 复制上面的哈希密码');
        console.log('2. 替换 server.js 中 users 数组的 password 字段');
        console.log('3. 重启服务器');

    } catch (error) {
        console.error('❌ 生成哈希时出错:', error);
    } finally {
        rl.close();
    }
});