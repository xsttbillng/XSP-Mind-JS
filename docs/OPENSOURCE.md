# 开源发布清单（最小可对外发布）

Author / 版权署名：**WUYUANBIAO**  
GitHub 用户名：**xsttbillng**  
仓库：https://github.com/xsttbillng/XSP-Mind-JS

按本清单即可把本目录做成独立开源仓库。

## 已具备

- [x] `LICENSE`（MIT，© WUYUANBIAO）
- [x] `README.md` / `SECURITY.md` / `CONTRIBUTING.md`
- [x] `package.json`（author 署名 WUYUANBIAO；repository → xsttbillng）
- [x] 示例 1～4 + Pages 入口 `index.html`
- [x] P0/P1：getData、fitContent、滚动拖拽修正、双击编辑、选中清理、自动布局、平移缩放、导出、updateNode、箭头

## 发布步骤

```bash
# 本目录已有 git remote 时可直接：
git add .
git commit -m "chore: initial open-source release of XSP-Mind-JS"
git branch -M main
git push -u origin main
```

已有 remote 示例：`https://github.com/xsttbillng/XSP-Mind-JS.git`

GitHub Pages：Settings → Pages → `main` / `/ (root)`  
访问：`https://xsttbillng.github.io/XSP-Mind-JS/`

可选 npm：

```bash
npm publish --access public
```

## Checklist

- [x] 版权署名 WUYUANBIAO
- [x] GitHub 账号链接 xsttbillng
- [ ] push 到 GitHub
- [ ] Pages 打开示例正常
- [ ] Issues 已开启（可选）
