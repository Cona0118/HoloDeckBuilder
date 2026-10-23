import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  onClose: () => void;
  /** 코드 텍스트로 덱을 만든다. 실패하면 Error를 던지고, 메시지를 대화상자에 표시한다. */
  onSubmit: (text: string) => void;
}

/** 홀로부리(holoburi.com) 덱 코드를 붙여넣어 새 덱으로 불러오는 대화상자. */
export default function HoloburiImportDialog({ onClose, onSubmit }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  // 입력란에서 드래그하다 바깥에서 놓아도 닫히지 않도록, 누르기·떼기가 모두 배경일 때만 닫는다.
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function pasteFromClipboard() {
    try {
      setCode((await navigator.clipboard.readText()).trim());
      setError(null);
    } catch {
      setError("클립보드를 읽을 수 없습니다. 입력란에 직접 붙여넣어 주세요.");
    }
  }

  function handleSubmit() {
    try {
      onSubmit(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "덱 코드를 읽을 수 없습니다.");
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white">홀로부리 덱 코드로 불러오기</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2 p-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            홀로부리 덱 화면의 「덱 코드 복사」로 받은 코드(
            <code className="font-mono text-gray-300">hocg1.</code>로 시작)를
            붙여넣으면 새 덱으로 추가됩니다.
          </p>
          <textarea
            autoFocus
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            rows={4}
            spellCheck={false}
            placeholder="hocg1.…"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs font-mono text-white break-all resize-none focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={pasteFromClipboard}
            className="self-start px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs rounded border border-gray-700 transition-colors"
          >
            클립보드에서 붙여넣기
          </button>
          {error && <div className="text-xs text-red-400 break-words">{error}</div>}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!code.trim()}
            className="flex-1 py-2 rounded-lg text-sm bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-40"
          >
            불러오기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
