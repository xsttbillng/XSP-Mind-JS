# 开源发布清单

Author / 版权署名：**WUYUANBIAO**  
GitHub：**xsttbillng** · https://github.com/xsttbillng/XSP-Mind-JS

## 已具备

- [x] `LICENSE`（MIT）· `README.md` · `SECURITY.md` · `CONTRIBUTING.md` · `CHANGELOG.md`
- [x] `package.json` v0.3.0 · `src/xsp-mind.d.ts`
- [x] 示例 1～11 + 首页 / 示例目录
- [x] 渲染：线型 / 箭头 / 主题 / 动画 / 折叠 / 搜索
- [x] 交互：拖拽 / 平移缩放 / 快捷键 / 触摸捏合
- [x] API：增删改查 / 布局 / 导入导出 / 配置生成器

## 发布步骤

```bash
git add .
git commit -m "chore: release v0.3.0"
git push origin main
```

GitHub Pages：Settings → Pages → `main` / `/ (root)`  
访问：https://xsttbillng.github.io/XSP-Mind-JS/

可选 npm：`npm publish --access public`

## 待办（后续版本）

- [ ] 单元测试 + GitHub Actions
- [ ] ESM/CJS 构建产物
- [ ] npm 正式发布
