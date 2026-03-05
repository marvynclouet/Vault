import { useState, useRef, useCallback, useEffect } from "react";
import { Platform } from "react-native";

const CHUNK_INTERVAL_MS = 3000;

function useNativeRecorder(onChunkReady) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUri, setAudioUri] = useState(null);
  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const chunkTimerRef = useRef(null);
  const fullChunksUris = useRef([]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(chunkTimerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startNewSegment = useCallback(async () => {
    const { Audio } = require("expo-av");
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
  }, []);

  const flushSegment = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        fullChunksUris.current.push(uri);
        if (onChunkReady) onChunkReady(uri, null);
      }
    } catch (err) {
      console.error("Flush segment error:", err);
    }
  }, [onChunkReady]);

  const startRecording = useCallback(async () => {
    const { Audio } = require("expo-av");

    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Accès au microphone refusé");
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    fullChunksUris.current = [];
    setIsRecording(true);
    setDuration(0);
    setAudioUri(null);

    await startNewSegment();

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    chunkTimerRef.current = setInterval(async () => {
      await flushSegment();
      await startNewSegment();
    }, CHUNK_INTERVAL_MS);
  }, [startNewSegment, flushSegment]);

  const stopRecording = useCallback(async () => {
    const { Audio } = require("expo-av");
    clearInterval(timerRef.current);
    clearInterval(chunkTimerRef.current);

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        if (uri) {
          fullChunksUris.current.push(uri);
          if (onChunkReady) onChunkReady(uri, null);
        }
      } catch (err) {
        console.error("Stop recording error:", err);
      }
      recordingRef.current = null;
    }

    setIsRecording(false);
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const lastUri =
      fullChunksUris.current[fullChunksUris.current.length - 1] || null;
    setAudioUri(lastUri);
  }, [onChunkReady]);

  const resetRecording = useCallback(() => {
    setAudioUri(null);
    setDuration(0);
    fullChunksUris.current = [];
  }, []);

  return {
    isRecording,
    duration,
    audioUri,
    audioBlob: null,
    startRecording,
    stopRecording,
    resetRecording,
  };
}

function useWebRecorder(onChunkReady) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorder = useRef(null);
  const allChunks = useRef([]);
  const pendingChunks = useRef([]);
  const timerRef = useRef(null);
  const chunkTimerRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    mediaRecorder.current = new MediaRecorder(stream, { mimeType });
    allChunks.current = [];
    pendingChunks.current = [];

    mediaRecorder.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        allChunks.current.push(e.data);
        pendingChunks.current.push(e.data);
      }
    };

    mediaRecorder.current.start(500);
    setIsRecording(true);
    setDuration(0);
    setAudioBlob(null);

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    chunkTimerRef.current = setInterval(() => {
      if (pendingChunks.current.length > 0 && onChunkReady) {
        const blob = new Blob([...pendingChunks.current], { type: mimeType });
        pendingChunks.current = [];
        onChunkReady(null, blob);
      }
    }, CHUNK_INTERVAL_MS);
  }, [onChunkReady]);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(chunkTimerRef.current);

    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    setTimeout(() => {
      if (allChunks.current.length > 0) {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const fullBlob = new Blob(allChunks.current, { type: mimeType });
        setAudioBlob(fullBlob);

        if (pendingChunks.current.length > 0 && onChunkReady) {
          const lastChunk = new Blob(pendingChunks.current, { type: mimeType });
          pendingChunks.current = [];
          onChunkReady(null, lastChunk);
        }
      }
    }, 300);

    setIsRecording(false);
  }, [onChunkReady]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    allChunks.current = [];
    pendingChunks.current = [];
  }, []);

  return {
    isRecording,
    duration,
    audioUri: null,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
  };
}

export function useAudioRecorder(onChunkReady) {
  if (Platform.OS === "web") {
    return useWebRecorder(onChunkReady);
  }
  return useNativeRecorder(onChunkReady);
}
