import { createPausableAnimationLoop } from "./animated-chart-hero";

function createFrameScheduler() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const cancelled: number[] = [];

  return {
    scheduler: {
      request(callback: FrameRequestCallback) {
        const id = nextId++;
        callbacks.set(id, callback);
        return id;
      },
      cancel(frameId: number) {
        cancelled.push(frameId);
        callbacks.delete(frameId);
      },
    },
    callbacks,
    cancelled,
    runNext(timestamp = 16) {
      const entry = callbacks.entries().next().value as
        | [number, FrameRequestCallback]
        | undefined;
      if (!entry) throw new Error("No animation frame is queued");

      const [id, callback] = entry;
      callbacks.delete(id);
      callback(timestamp);
    },
  };
}

describe("createPausableAnimationLoop", () => {
  test("queues one frame while active and cancels it while paused", () => {
    const frames = createFrameScheduler();
    const draw = jest.fn();
    const loop = createPausableAnimationLoop(draw, frames.scheduler);

    expect(frames.callbacks.size).toBe(0);

    loop.setActive(true);
    loop.setActive(true);
    expect(frames.callbacks.size).toBe(1);

    frames.runNext(42);
    expect(draw).toHaveBeenCalledWith(42);
    expect(frames.callbacks.size).toBe(1);

    const queuedFrameId = [...frames.callbacks.keys()][0];
    loop.setActive(false);
    expect(frames.cancelled).toEqual([queuedFrameId]);
    expect(frames.callbacks.size).toBe(0);
  });

  test("resumes from a fresh frame and disposal prevents further work", () => {
    const frames = createFrameScheduler();
    const draw = jest.fn();
    const loop = createPausableAnimationLoop(draw, frames.scheduler);

    loop.setActive(true);
    loop.setActive(false);
    loop.setActive(true);
    frames.runNext();

    expect(draw).toHaveBeenCalledTimes(1);
    expect(frames.callbacks.size).toBe(1);

    loop.dispose();
    expect(frames.callbacks.size).toBe(0);

    loop.setActive(true);
    expect(() => frames.runNext()).toThrow("No animation frame is queued");
    expect(draw).toHaveBeenCalledTimes(1);
  });
});
