"use client";

import { useEffect, useRef, useState } from "react";

export function speechChunks(text: string): string[] {
  // Short, sequential utterances avoid handing a whole sermon-sized study to a voice at once.
  return text.replace(/\s+/g, " ").trim().match(/.{1,220}(?:\s|$)|\S{1,220}/gu)?.map(chunk => chunk.trim()).filter(Boolean) ?? [];
}

export function StudyAudio({ text, studyId }: { text: string; studyId: string }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<"ready" | "playing" | "paused">("ready");
  const [error, setError] = useState("");
  const playback = useRef({ generation: 0, index: 0, chunks: [] as string[], paused: false, utterance: null as SpeechSynthesisUtterance | null });

  useEffect(() => {
    const available = typeof window.speechSynthesis?.speak === "function" && typeof window.SpeechSynthesisUtterance === "function";
    setSupported(available); setState("ready"); setError("");
    const current = playback.current;
    const cancel = () => {
      current.generation++;
      if (current.utterance && available) window.speechSynthesis.cancel();
      current.utterance = null; current.chunks = []; current.paused = false;
    };
    const hide = () => { cancel(); setState("ready"); };
    window.addEventListener("pagehide", hide);
    return () => { window.removeEventListener("pagehide", hide); cancel(); };
  }, [studyId, text]);

  function stop() {
    const current = playback.current; current.generation++;
    current.utterance = null; current.chunks = []; current.paused = false;
    window.speechSynthesis.cancel(); setState("ready");
  }
  function readNext(generation: number) {
    const current = playback.current;
    if (generation !== current.generation || current.paused) return;
    if (current.index >= current.chunks.length) { current.utterance = null; setState("ready"); return; }
    const utterance = new SpeechSynthesisUtterance(current.chunks[current.index]);
    current.utterance = utterance; utterance.lang = "en-US";
    const voice = window.speechSynthesis.getVoices().find(item => item.localService && item.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (generation !== current.generation) return;
      current.utterance = null; current.index++; readNext(generation);
    };
    utterance.onerror = () => {
      if (generation !== current.generation) return;
      current.generation++; current.utterance = null; current.chunks = []; current.paused = false;
      setState("ready"); setError("Read-aloud could not continue. Try again or use another browser or device voice.");
    };
    try { window.speechSynthesis.speak(utterance); } catch { utterance.onerror?.(new Event("error") as SpeechSynthesisErrorEvent); }
  }
  function toggle() {
    if (!supported) return;
    const current = playback.current; setError("");
    if (state === "playing") { current.paused = true; window.speechSynthesis.pause(); setState("paused"); return; }
    if (state === "paused") { current.paused = false; window.speechSynthesis.resume(); setState("playing"); if (!current.utterance) readNext(current.generation); return; }
    current.generation++; current.index = 0; current.chunks = speechChunks(text); current.paused = false;
    window.speechSynthesis.cancel(); window.speechSynthesis.resume();
    setState("playing"); readNext(current.generation);
  }
  return <div className="study-audio" role="group" aria-label="Listen to this study"><div><strong>Take the study with you.</strong><p>Listen with your browser’s read-aloud voice.</p></div><div className="study-audio-actions"><button type="button" disabled={!supported || !text.trim()} onClick={toggle}><span aria-hidden="true">{state === "playing" ? "Ⅱ" : "▶"}</span> {state === "playing" ? "Pause" : state === "paused" ? "Resume" : "Listen to study"}</button><button type="button" disabled={state === "ready"} onClick={stop}>Stop</button></div><p className="study-audio-status" role="status">{error || (supported === false ? "Read-aloud isn’t supported in this browser. You can still read the full study below." : state === "playing" ? "Reading your study…" : state === "paused" ? "Reading paused." : "Press play to begin. Audio stops when you leave this study.")}</p></div>;
}
