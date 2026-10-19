import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../../src/app/App";

describe("auth and first-enterprise onboarding", () => {
  it("routes a verified new account to required enterprise creation and then home", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("link", { name: "立即注册" }));
    await screen.findByRole("heading", { name: "创建账号" });

    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "new-owner@example.com" } });
    fireEvent.change(screen.getByLabelText("设置密码"), { target: { value: "Example2026!" } });
    fireEvent.change(screen.getByLabelText("确认密码"), { target: { value: "Example2026!" } });
    fireEvent.click(screen.getByRole("button", { name: "创建账号" }));

    await screen.findByRole("heading", { name: "验证邮箱" });
    fireEvent.change(screen.getByLabelText("6 位验证码"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "完成验证" }));

    await screen.findByRole("heading", { name: "先建立你的企业档案" });
    fireEvent.change(screen.getByLabelText("企业名称 *"), { target: { value: "杭州新悦科技有限公司" } });
    fireEvent.change(screen.getByLabelText("省份 *"), { target: { value: "浙江省" } });
    fireEvent.change(screen.getByLabelText("城市 *"), { target: { value: "杭州市" } });
    fireEvent.change(screen.getByLabelText("所属行业 *"), { target: { value: "软件和信息技术服务业" } });
    fireEvent.click(screen.getByRole("button", { name: "创建并进入首页" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "杭州新悦科技有限公司" })).toBeInTheDocument());
    expect(screen.getByText("企业资料用于政策筛选和金额估算；风险等级只由 10 道题决定。")).toBeInTheDocument();
  });
});
