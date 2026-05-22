#!/usr/bin/env node

/**
 * @file scripts/check-headers.js
 * @description YYC³ 规范检查工具 - 检查代码和文档文件标头是否符合规范
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags utils,nodejs,validation,critical,public
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 代码文件必需字段
const codeRequiredFields = [
  '@file',
  '@description',
  '@author',
  '@version',
  '@created',
  '@updated',
  '@status',
];

// 文档文件必需字段
const docRequiredFields = [
  'file:',
  'description:',
  'author:',
  'version:',
  'created:',
  'updated:',
  'status:',
  'tags:',
  'category:',
  'language:',
];

// 代码文件扩展名
const codeExtensions = [
  '.ts', '.tsx', '.js', '.jsx',
  '.py', '.java', '.go', '.rs',
  '.sh', '.bash', '.zsh',
];

// 文档文件扩展名
const docExtensions = [
  '.md', '.mdx', '.rst',
];

// 版本号正则表达式 (SemVer)
const versionRegex = /^v\d+\.\d+\.\d+$/;

// 日期正则表达式 (YYYY-MM-DD)
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// 状态值
const validStatuses = ['draft', 'dev', 'test', 'stable', 'deprecated', 'review'];

// 文档分类
const validCategories = ['general', 'technical', 'api', 'project', 'design', 'guide', 'policy'];

// 文档语言
const validLanguages = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES'];

// 检查结果统计
let totalFiles = 0;
let passedFiles = 0;
let failedFiles = 0;
let skippedFiles = 0;

// 检查单个文件
function checkFile(filePath) {
  const ext = path.extname(filePath);
  const isCodeFile = codeExtensions.includes(ext);
  const isDocFile = docExtensions.includes(ext);

  if (!isCodeFile && !isDocFile) {
    skippedFiles++;
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = {
      filePath,
      type: isCodeFile ? 'code' : 'doc',
      errors: [],
      warnings: [],
    };

    if (isCodeFile) {
      checkCodeFile(content, result);
    } else {
      checkDocFile(content, result);
    }

    return result;
  } catch (error) {
    log(`❌ 无法读取文件: ${filePath}`, 'red');
    return {
      filePath,
      type: 'unknown',
      errors: [`无法读取文件: ${error.message}`],
      warnings: [],
    };
  }
}

// 检查代码文件
function checkCodeFile(content, result) {
  // 检查必需字段
  codeRequiredFields.forEach(field => {
    if (!content.includes(field)) {
      result.errors.push(`缺少必需字段: ${field}`);
    }
  });

  // 检查版本号格式
  const versionMatch = content.match(/@version\s+(v\d+\.\d+\.\d+)/);
  if (!versionMatch) {
    result.errors.push('版本号格式不正确，应为 vMAJOR.MINOR.PATCH');
  } else if (!versionRegex.test(versionMatch[1])) {
    result.errors.push('版本号不符合 SemVer 规范');
  }

  // 检查日期格式
  const createdMatch = content.match(/@created\s+(\d{4}-\d{2}-\d{2})/);
  const updatedMatch = content.match(/@updated\s+(\d{4}-\d{2}-\d{2})/);
  
  if (!createdMatch || !dateRegex.test(createdMatch[1])) {
    result.errors.push('@created 日期格式不正确，应为 YYYY-MM-DD');
  }
  
  if (!updatedMatch || !dateRegex.test(updatedMatch[1])) {
    result.errors.push('@updated 日期格式不正确，应为 YYYY-MM-DD');
  }

  // 检查状态值
  const statusMatch = content.match(/@status\s+(\w+)/);
  if (statusMatch) {
    const status = statusMatch[1];
    if (!validStatuses.includes(status)) {
      result.warnings.push(`@status 状态值 "${status}" 不在推荐列表中`);
    }
  }

  // 检查作者邮箱
  const authorMatch = content.match(/@author\s+([^<]+)<([^>]+)>/);
  if (!authorMatch) {
    result.errors.push('@author 格式不正确，应为 "姓名 <邮箱>"');
  } else {
    const email = authorMatch[2];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      result.errors.push('@author 邮箱格式不正确');
    }
  }
}

// 检查文档文件
function checkDocFile(content, result) {
  // 检查必需字段
  docRequiredFields.forEach(field => {
    if (!content.includes(field)) {
      result.errors.push(`缺少必需字段: ${field}`);
    }
  });

  // 检查版本号格式
  const versionMatch = content.match(/version:\s+(v\d+\.\d+\.\d+)/);
  if (!versionMatch) {
    result.errors.push('version: 格式不正确，应为 vMAJOR.MINOR.PATCH');
  } else if (!versionRegex.test(versionMatch[1])) {
    result.errors.push('version: 不符合 SemVer 规范');
  }

  // 检查日期格式
  const createdMatch = content.match(/created:\s+(\d{4}-\d{2}-\d{2})/);
  const updatedMatch = content.match(/updated:\s+(\d{4}-\d{2}-\d{2})/);
  
  if (!createdMatch || !dateRegex.test(createdMatch[1])) {
    result.errors.push('created: 日期格式不正确，应为 YYYY-MM-DD');
  }
  
  if (!updatedMatch || !dateRegex.test(updatedMatch[1])) {
    result.errors.push('updated: 日期格式不正确，应为 YYYY-MM-DD');
  }

  // 检查状态值
  const statusMatch = content.match(/status:\s+(\w+)/);
  if (statusMatch) {
    const status = statusMatch[1];
    if (!validStatuses.includes(status)) {
      result.warnings.push(`status: 状态值 "${status}" 不在推荐列表中`);
    }
  }

  // 检查分类
  const categoryMatch = content.match(/category:\s+(\w+)/);
  if (categoryMatch) {
    const category = categoryMatch[1];
    if (!validCategories.includes(category)) {
      result.warnings.push(`category: 分类 "${category}" 不在推荐列表中`);
    }
  }

  // 检查语言
  const languageMatch = content.match(/language:\s+([\w-]+)/);
  if (languageMatch) {
    const language = languageMatch[1];
    if (!validLanguages.includes(language)) {
      result.warnings.push(`language: 语言 "${language}" 不在推荐列表中`);
    }
  }

  // 检查作者邮箱
  const authorMatch = content.match(/author:\s+([^<]+)<([^>]+)>/);
  if (!authorMatch) {
    result.errors.push('author: 格式不正确，应为 "姓名 <邮箱>"');
  } else {
    const email = authorMatch[2];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      result.errors.push('author: 邮箱格式不正确');
    }
  }

  // 检查 YYC³ 标语
  const yyc3Quote = 'YanYuCloudCube';
  if (!content.includes(yyc3Quote)) {
    result.warnings.push('文档缺少 YYC³ 品牌标识');
  }
}

// 递归检查目录
function checkDirectory(dir, maxDepth = 10, currentDepth = 0) {
  if (currentDepth > maxDepth) {
    return [];
  }

  const results = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // 跳过 node_modules、.git 等目录
        if (['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
          continue;
        }
        results.push(...checkDirectory(fullPath, maxDepth, currentDepth + 1));
      } else if (entry.isFile()) {
        const result = checkFile(fullPath);
        if (result) {
          results.push(result);
        }
      }
    }
  } catch (error) {
    log(`❌ 无法读取目录: ${dir}`, 'red');
  }
  
  return results;
}

// 打印检查结果
function printResults(results) {
  totalFiles = results.length;
  failedFiles = results.filter(r => r.errors.length > 0).length;
  passedFiles = results.filter(r => r.errors.length === 0).length;

  console.log('\n' + '='.repeat(80));
  log('📊 YYC³ 规范检查结果', 'cyan');
  console.log('='.repeat(80) + '\n');

  console.log(`📁 总文件数: ${totalFiles}`);
  console.log(`✅ 通过: ${passedFiles}`);
  console.log(`❌ 失败: ${failedFiles}`);
  console.log(`⏭️ 跳过: ${skippedFiles}\n`);

  if (failedFiles > 0) {
    log('❌ 发现以下问题:\n', 'red');
  }

  results.forEach(result => {
    if (result.errors.length > 0 || result.warnings.length > 0) {
      const relativePath = path.relative(process.cwd(), result.filePath);
      log(`\n📄 ${relativePath} (${result.type})`, 'yellow');
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          log(`  ❌ ${error}`, 'red');
        });
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          log(`  ⚠️  ${warning}`, 'yellow');
        });
      }
    }
  });

  console.log('\n' + '='.repeat(80));
  
  if (failedFiles === 0 && passedFiles > 0) {
    log('✅ 所有文件都符合规范！', 'green');
  } else if (failedFiles === 0) {
    log('✅ 所有文件都通过了必需字段检查！', 'green');
  } else {
    log('❌ 部分文件不符合规范，请修复后重试', 'red');
  }
  
  console.log('='.repeat(80) + '\n');
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  let targetDir = process.cwd();
  
  if (args.length > 0) {
    targetDir = args[0];
  }

  log(`🔍 开始检查目录: ${targetDir}\n`, 'blue');
  
  const results = checkDirectory(targetDir);
  
  if (results.length === 0) {
    log('⚠️ 未找到任何代码或文档文件', 'yellow');
    process.exit(0);
  }
  
  printResults(results);
  
  // 返回退出码
  process.exit(failedFiles > 0 ? 1 : 0);
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  checkFile,
  checkDirectory,
  printResults,
};