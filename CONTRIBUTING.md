# Contributing

感谢关注 XSP-Mind-JS。

## 开发

```bash
npm run demo
# 打开 http://localhost:5173/
```

改动核心逻辑时优先保证 4 个示例仍可直接用 `file://` 打开（示例数据内嵌）。

## 原则

1. **展示优先**：默认不做自动布局、不做完整图形编辑器。
2. **API 尽量稳定**：破坏性变更请在 PR / Issue 说明迁移方式。
3. **安全**：不要默认开启 `allowHtmlText`；新增 HTML 能力时更新 `SECURITY.md`。

## PR

- 描述动机与效果（最好附截图）。
- 涉及 API：同步改 README。
- 保持 MIT 许可证不变（© WUYUANBIAO）。
