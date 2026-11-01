import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StudyAudio, speechChunks } from "./study-audio";

const synth = { speak: vi.fn(), pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), getVoices: () => [] };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", class { text: string; onend: (()=>void) | null = null; onerror: (()=>void) | null = null; constructor(text: string) { this.text = text; } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("reads sequential chunks only after play, pauses/resumes and stops without replaying stale callbacks", () => {
  const text = "Read the passage and reflect on it. ".repeat(25);
  render(<StudyAudio text={text} studyId="one" />);
  expect(synth.speak).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Listen to study"}));
  expect(synth.speak).toHaveBeenCalledTimes(1);expect(synth.speak.mock.calls[0][0].text).toBe(speechChunks(text)[0]);
  const first=synth.speak.mock.calls[0][0];
  fireEvent.click(screen.getByRole("button",{name:"Pause"}));expect(synth.pause).toHaveBeenCalledTimes(1);
  act(()=>first.onend());expect(synth.speak).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button",{name:"Resume"}));expect(synth.speak).toHaveBeenCalledTimes(2);
  const second=synth.speak.mock.calls[1][0];
  fireEvent.click(screen.getByRole("button",{name:"Stop"}));act(()=>second.onend());
  expect(synth.speak).toHaveBeenCalledTimes(2);expect(screen.getByRole("button",{name:"Listen to study"})).toBeEnabled();
});
it("cancels speech when the study changes or the reader leaves", () => {
  const view=render(<StudyAudio text="First study" studyId="one" />);
  fireEvent.click(screen.getByRole("button",{name:"Listen to study"}));const first=synth.speak.mock.calls[0][0];
  view.rerender(<StudyAudio text="Second study" studyId="two" />);act(()=>first.onend());
  expect(synth.cancel).toHaveBeenCalledTimes(2);expect(screen.getByRole("button",{name:"Listen to study"})).toBeEnabled();
  fireEvent.click(screen.getByRole("button",{name:"Listen to study"}));view.unmount();expect(synth.cancel).toHaveBeenCalledTimes(4);
});
it("handles device errors and unavailable speech without hiding the study", () => {
  const view=render(<StudyAudio text="A short study" studyId="one" />);
  fireEvent.click(screen.getByRole("button",{name:"Listen to study"}));act(()=>synth.speak.mock.calls[0][0].onerror());
  expect(screen.getByRole("status")).toHaveTextContent("could not continue");view.unmount();
  vi.stubGlobal("speechSynthesis",undefined);render(<StudyAudio text="A short study" studyId="two" />);
  expect(screen.getByRole("button",{name:"Listen to study"})).toBeDisabled();expect(screen.getByRole("status")).toHaveTextContent("isn’t supported");
});
