import React, { useState, useEffect, useRef, useCallback } from 'react';


interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachScanToNote: (scanUrl: string) => void;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen,
  onClose,
  onAttachScanToNote,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // A8: generation token — a slow getUserMedia resolving after close
  // must stop its own tracks instead of leaking an active camera.
  const startIdRef = useRef(0);
  const openRef = useRef(isOpen);
  useEffect(() => {
    openRef.current = isOpen;
  }, [isOpen]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [videoReady, setVideoReady] = useState(false);

  const stopCamera = useCallback(() => {
    startIdRef.current++;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    const id = ++startIdRef.current;
    setCameraError('');
    try {
      // A8: stop any previous stream before replacing it
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      // A8: closed while waiting (permission dialog) → kill the orphan stream
      if (id !== startIdRef.current || !openRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      if (id !== startIdRef.current || !openRef.current) return;
      setCameraError(
        'Não foi possível acessar a câmera. Verifique a permissão nas Configurações do aparelho.'
      );
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCameraError('');
      setVideoReady(false);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      // A8: never capture before metadata — videoWidth 0 yields 'data:,'
      if (!video.videoWidth || !video.videoHeight) return;
      const canvas = canvasRef.current;
      // Cap at 1600px on the long edge to protect the storage quota (C1)
      const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleSave = () => {
    if (capturedImage) {
      onAttachScanToNote(capturedImage);
    }
    onClose();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setVideoReady(false);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escanear documento"
      className="absolute inset-0 z-50 flex flex-col bg-black select-none text-white animate-in fade-in duration-200"
    >
      {/* Top Header */}
      <div className="h-[48px] px-4 flex items-center justify-between border-b border-neutral-800 bg-black/90">
        <button
          onClick={onClose}
          className="text-[17px] text-[#E49F13] hover:opacity-80 active:opacity-60 transition"
        >
          Cancelar
        </button>

        <span className="text-[14px] font-semibold">
          Escanear Documento
        </span>

        {capturedImage ? (
          <button
            onClick={handleSave}
            className="text-[17px] font-semibold text-[#E49F13] hover:opacity-80 active:opacity-60 transition"
          >
            Salvar
          </button>
        ) : (
          <div className="w-[60px]" /> /* Spacer */
        )}
      </div>

      {/* Main Camera / Preview Area */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured scan" className="max-w-full max-h-full object-contain" />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onPlaying={() => setVideoReady(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                videoReady ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {/* Viewfinder while the camera warms up */}
            {!videoReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0C]">
                <div className="relative w-[240px] h-[300px]">
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#E49F13] rounded-tl-[8px]" />
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#E49F13] rounded-tr-[8px]" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#E49F13] rounded-bl-[8px]" />
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#E49F13] rounded-br-[8px]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-[3px] border-neutral-700 border-t-[#E49F13] animate-spin" />
                  </div>
                </div>
                <p className="text-[14px] text-neutral-400 mt-5">Abrindo câmera…</p>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
        {cameraError && !capturedImage && (
          <div className="absolute inset-x-6 top-1/3 bg-white/95 rounded-[12px] p-4 text-center">
            <p className="text-[14px] text-black">{cameraError}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 text-[16px] font-semibold text-[#D97706]"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="h-[100px] bg-black/90 border-t border-neutral-800 px-6 flex items-center justify-center relative">
        {capturedImage ? (
          <button
            onClick={handleRetake}
            className="text-[17px] text-white hover:text-gray-300 absolute left-6"
          >
            Repetir
          </button>
        ) : videoReady ? (
          <button
            onClick={captureImage}
            aria-label="Capturar foto do documento"
            className="w-[68px] h-[68px] rounded-full border-4 border-white flex items-center justify-center hover:opacity-80 active:scale-95 transition-all"
          >
            <div className="w-[54px] h-[54px] bg-white rounded-full" />
          </button>
        ) : (
          <div className="w-[68px] h-[68px]" />
        )}
      </div>
    </div>
  );
};
