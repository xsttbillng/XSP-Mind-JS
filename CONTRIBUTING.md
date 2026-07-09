# Contributing

感谢关注 XSP-Mind-JS。

## 开发

```bash
npm install
npm test          # 单元测试
npm run build     # 生成 dist/
npm run demo      # http://localhost:5173/
```

改动核心逻辑时请运行 `npm test`，涉及 API 时同步更新 README 与 `src/xsp-mind.d.ts`。

## 原则

1. **展示优先**：默认不做自动布局、不做完整图形编辑器。
2. **API 尽量稳定**：破坏性变更请在 PR / Issue 说明迁移方式。
3. **安全**：不要默认开启 `allowHtmlText`；新增 HTML 能力时更新 `SECURITY.md`。

## PR

- 描述动机与效果（最好附截图）。
- 涉及 API：同步改 README。
- 保持 MIT 许可证不变（© WUYUANBIAO）。
