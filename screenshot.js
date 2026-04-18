import { chromium } from 'playwright';

(async () => {
  // 启动浏览器
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 导航到GrapePaper
    await page.goto('http://localhost:5174/');
    await page.waitForLoadState('networkidle');
    
    console.log('1. 获取总览截图...');
    // 截图 1: 总览
    await page.screenshot({
      path: 'demo/screenshots/01-overview.png',
      fullPage: true
    });
    
    console.log('2. 获取标题编辑截图...');
    // 截图 2: 标题编辑
    await page.click('input[placeholder="Untitled Document"]');
    await page.keyboard.press('Meta+A');
    await page.keyboard.type('GrapePaper Demo Draft');
    await page.screenshot({
      path: 'demo/screenshots/02-title-edit.png',
      fullPage: true
    });
    
    console.log('3. 获取段落编辑截图...');
    // 截图 3: 段落编辑
    await page.evaluate(() => {
      const editor = document.querySelector('.tiptap-content');
      if (editor) {
        editor.focus();
      }
    });
    await page.keyboard.type('This is a demo paragraph for the Phase 1 prototype. ');
    await page.screenshot({
      path: 'demo/screenshots/03-paragraph-edit.png',
      fullPage: true
    });
    
    console.log('4. 获取导出动作截图...');
    // 截图 4: 导出动作
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const exportBtn = Array.from(buttons).find(btn => btn.textContent.includes('Export .md'));
      if (exportBtn) {
        exportBtn.click();
      }
    });
    await page.screenshot({
      path: 'demo/screenshots/04-export-actions.png',
      fullPage: true
    });
    
    console.log('所有截图已完成！');
    
  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    // 关闭浏览器
    await browser.close();
  }
})();