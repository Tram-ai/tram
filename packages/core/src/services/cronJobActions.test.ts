import { describe, expect, it, vi } from "vitest";
import {
  cronJobActionSummary,
  executeCronServiceAction,
} from "./cronJobActions.js";
import { ServiceRuntimeManager } from "./serviceRuntimeManager.js";

describe("cronJobActions", () => {
  it("summarizes prompt actions", () => {
    expect(
      cronJobActionSummary({ type: "prompt", prompt: "check the server" }),
    ).toBe("check the server");
  });

  it("summarizes service actions", () => {
    expect(
      cronJobActionSummary({
        type: "service_restart",
        serviceName: "minecraft",
      }),
    ).toBe("Restart service minecraft");
  });

  it("executes service restart actions", async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      restartService: vi.fn().mockResolvedValue(undefined),
    };
    const spy = vi
      .spyOn(ServiceRuntimeManager, "forConfig")
      .mockReturnValue(manager as unknown as ServiceRuntimeManager);

    await executeCronServiceAction({} as never, {
      type: "service_restart",
      serviceName: "minecraft",
    });

    expect(manager.initialize).toHaveBeenCalledOnce();
    expect(manager.restartService).toHaveBeenCalledWith("minecraft");
    spy.mockRestore();
  });

  it("executes service send actions", async () => {
    const manager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      sendInput: vi.fn().mockResolvedValue(undefined),
    };
    const spy = vi
      .spyOn(ServiceRuntimeManager, "forConfig")
      .mockReturnValue(manager as unknown as ServiceRuntimeManager);

    await executeCronServiceAction({} as never, {
      type: "service_send",
      serviceName: "minecraft",
      input: "say hello",
    });

    expect(manager.initialize).toHaveBeenCalledOnce();
    expect(manager.sendInput).toHaveBeenCalledWith("minecraft", "say hello");
    spy.mockRestore();
  });
});
