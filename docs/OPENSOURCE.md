# 开源发布清单

Author / 版权署名：**WUYUANBIAO**  
GitHub：**xsttbillng** · https://github.com/xsttbillng/XSP-Mind-JS

## 已具备

- [x] `LICENSE`（MIT）· `README.md` · `SECURITY.md` · `CONTRIBUTING.md` · `CHANGELOG.md`
- [x] `package.json` v0.3.2 · `src/xsp-mind.d.ts` · `package-lock.json`
- [x] 示例 1～12 + 首页 / 示例目录
- [x] 渲染 / 交互 / API（含 `links` 多源汇入，见 README）
- [x] 单元测试 + GitHub Actions CI
- [x] `npm run build` → `dist/`（ESM / CJS / min）

## 发布步骤

```bash
npm ci
npm test
npm run build
git add .
git commit -m "chore: release v0.3.2"
git push origin main
git tag v0.3.2 && git push origin v0.3.2
```

GitHub Pages：Settings → Pages → `main` / `/ (root)`  
访问：https://xsttbillng.github.io/XSP-Mind-JS/

### npm 发布（可选）

```bash
npm login
npm publish --access public
```

## 待办（后续）

- [ ] 更多集成测试（导出 PNG、主题切换）
- [ ] 英文 README
