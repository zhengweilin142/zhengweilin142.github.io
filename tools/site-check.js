/* ============================================================
   站点自检（Node，零依赖）
   覆盖两个页面：个人主页 index.html 与企业知识库展示页 knowledge-base/index.html

   用法: node tools/site-check.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let fails = [];
function chk(cond, msg) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) fails.push(msg);
}
function section(t) { console.log('\n== ' + t + ' =='); }

// 通用骨架检查
function checkSkeleton(html, label, opts = {}) {
  console.log(`\n--- ${label} ---`);
  chk(html.includes('<!DOCTYPE html>'), 'DOCTYPE');
  chk(html.includes('lang="zh-CN"'), '语言声明');
  chk(html.includes('name="viewport"'), 'viewport（移动端适配）');

  // 标签平衡（用 \b 边界，避免 <p 匹配 <path）
  const TAGS = ['div', 'section', 'article', 'span', 'a', 'svg', 'p', 'h1', 'h2', 'h3', 'h4', 'figure', 'table', 'tr', 'td', 'th', 'pre'];
  let bad = 0;
  TAGS.forEach(tag => {
    const open = (html.match(new RegExp('<' + tag + '\\b(?![^>]*/>)', 'g')) || []).length;
    const close = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    if (open !== close) { bad++; chk(false, `<${tag}> 开 ${open} / 闭 ${close}`); }
  });
  if (!bad) chk(true, `${TAGS.length} 类标签全部闭合`);

  // 隐私（手机号用通用模式，脚本内不含真实号码）
  const phone = html.match(/1[3-9]\d{9}/);
  chk(!phone, `不含手机号${phone ? '（发现 ' + phone[0] + '）' : ''}`);
  ['性别', '政治面貌', '求职意向'].forEach(b => chk(!html.includes(b), `不含「${b}」`));
}

// ==================== 1. 个人主页 ====================
section('个人主页 index.html');
const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
console.log(`  ${home.length.toLocaleString()} 字符, ${home.split('\n').length} 行`);
checkSkeleton(home, '个人主页');

console.log('\n  模板占位内容:');
// 检测模板残留时，占位串用 Unicode 转义书写并注明用途，
// 这样仓库里不会出现模板作者本人的姓名等无关信息。
const TPL_NAME = '\u674e\u5c0f\u821f';   // 模板的示例人名
const TPL_SURNAME = '\u674e';            // 模板作者的姓氏（散落在导航标记与页面图标里）
const TPL_MAIL = 'hello@example.com';    // 模板的示例邮箱
[TPL_NAME, TPL_SURNAME, TPL_MAIL, '你的名字', '改这里']
  .forEach(b => chk(!home.includes(b), `不含模板占位串 ${JSON.stringify(b)}`));
chk(!home.includes('%E6%9D%8E'), '页面图标不含模板姓氏的字形编码');
chk(home.includes('%E9%83%91'), '页面图标字形为「郑」（%E9%83%91）');
chk(!home.includes('>李<') && !home.includes('"dot">李'), '导航栏标记与正文姓名均已替换');

console.log('\n  链接:');
const badAnchors = home.match(/<a\b[^>]*href="#"[^>]*>/g) || [];
chk(badAnchors.length === 0, `没有 href="#" 占位链接（找到 ${badAnchors.length} 个）`);
['Knowledge-Base.demo', 'ppt-studio', 'dorm-management-system', 'wechat-checkin']
  .forEach(p => chk(home.includes('github.com/zhengweilin142/' + p), 'github.com/zhengweilin142/' + p));
chk(home.includes('href="knowledge-base/"'), '有跳转到知识库详情页的入口');

// ==================== 2. 知识库展示页 ====================
section('企业知识库展示页 knowledge-base/index.html');
const kbPath = path.join(ROOT, 'knowledge-base', 'index.html');
chk(fs.existsSync(kbPath), '页面存在');
if (fs.existsSync(kbPath)) {
  const kb = fs.readFileSync(kbPath, 'utf8');
  console.log(`  ${kb.length.toLocaleString()} 字符, ${kb.split('\n').length} 行`);
  checkSkeleton(kb, '知识库展示页');

  console.log('\n  引用资源是否存在:');
  const imgs = [...new Set((kb.match(/src="([^"]+)"/g) || []).map(s => s.replace(/^src="|"$/g, '')))];
  chk(imgs.length >= 2, `引用了 ${imgs.length} 个本地图片`);
  imgs.forEach(src => {
    if (/^https?:/.test(src) || src.startsWith('data:')) return;
    chk(fs.existsSync(path.join(ROOT, 'knowledge-base', src)), `文件存在: knowledge-base/${src}`);
  });

  console.log('\n  关键数据是否与 README 一致:');
  const kbN = kb.replace(/\s+/g, '');   // 去掉空白再比对，避免「750 MB / 750MB」这类写法差异
  [['0.6370', '无关问题余弦 0.6370'], ['0.4537', '相关问题余弦 0.4537'],
   ['-0.043', '无关问题重排分 -0.043'], ['0.5', '阈值 0.5'],
   ['750MB', '内存 750MB'], ['7.6GB', '内存 7.6GB']]
    .forEach(([needle, label]) => chk(kbN.includes(needle), label));

  console.log('\n  导航与免责:');
  chk(kb.includes('href="../"'), '有返回个人主页的链接');
  chk(kb.includes('静态展示，非在线服务'), '明确标注这是静态展示页');
  chk(kb.includes('虚构内容'), '示例文档标注为虚构内容');
  chk(kb.includes('github.com/zhengweilin142/Knowledge-Base.demo'), '有源码仓库链接');
}

console.log();
if (fails.length) {
  console.log(`✗ ${fails.length} 项未通过`);
  fails.forEach(f => console.log('   - ' + f));
  process.exit(1);
}
console.log('✓ 全部通过');
