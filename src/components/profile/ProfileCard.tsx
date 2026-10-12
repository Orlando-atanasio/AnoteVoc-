import React, { useEffect, useRef, useState } from 'react';
import { BottomSheet } from '../common/BottomSheet';
import {
  DEFAULT_TRANSFORM,
  canvasToPhotoDataUrl,
  fileToPhotoDataUrl,
  type PhotoTransform,
  type UserProfile,
} from '../../utils/profile';

interface ProfileCardProps {
  isOpen: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
  onOpenBackup: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onClose,
  onSave,
  onOpenBackup,
}) => {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [photo, setPhoto] = useState(profile.photo);
  const [transform, setTransform] = useState<PhotoTransform>(
    profile.photoTransform ?? { ...DEFAULT_TRANSFORM }
  );
  const [photoError, setPhotoError] = useState('');
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraIdRef = useRef(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Safety: never leave the camera running
  useEffect(() => {
    return () => {
      cameraIdRef.current++;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const stopCamera = () => {
    cameraIdRef.current++;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async () => {
    const id = ++cameraIdRef.current;
    setCameraError('');
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
      });
      if (id !== cameraIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      // Wait a tick so the video element exists (camera UI just opened)
      setTimeout(() => {
        if (videoRef.current && id === cameraIdRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch {
      if (id !== cameraIdRef.current) return;
      setCameraError(
        'Não foi possível abrir a câmera. Verifique a permissão nas Configurações do aparelho.'
      );
    }
  };

  const closeCamera = () => {
    stopCamera();
    setIsCameraOpen(false);
    setCameraError('');
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;
    if (!video.videoWidth || !video.videoHeight) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const dataUrl = await canvasToPhotoDataUrl(canvas);
      setPhoto(dataUrl);
      setTransform({ ...DEFAULT_TRANSFORM });
      setPhotoError('');
      closeCamera();
    } catch {
      setCameraError('Não foi possível capturar a foto.');
    }
  };

  // Safety: never leave the camera running
  useEffect(() => {
    return () => {
      cameraIdRef.current++;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError('');
    try {
      const dataUrl = await fileToPhotoDataUrl(file);
      setPhoto(dataUrl);
      setTransform({ ...DEFAULT_TRANSFORM });
    } catch {
      setPhotoError('Não foi possível carregar a foto.');
    }
  };

  const handleSave = () => {
    onSave({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      photo,
      photoTransform: photo ? transform : undefined,
    });
    onClose();
  };

  const previewTransform = `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotate}deg) scale(${transform.scale})`;

  return (
    <BottomSheet onClose={onClose} label="Perfil do usuário" panelClass="max-h-[90%]">
      <div className="flex flex-col">
        {/* Navigation Bar */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-[17px] text-[#D97706] hover:opacity-80 transition"
          >
            Cancelar
          </button>
          <span className="text-[17px] font-semibold text-black">Perfil</span>
          <button
            onClick={handleSave}
            className="text-[17px] font-semibold text-[#D97706] hover:opacity-80 transition"
          >
            OK
          </button>
        </div>

        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          {/* Photo studio */}
          <div className="bg-white rounded-[16px] p-4 shadow-xs border border-[#E5E5EA] flex flex-col items-center">
            <div
              className="w-[120px] h-[120px] rounded-full overflow-hidden bg-[#E5E5EA] relative touch-none cursor-move select-none"
              onPointerDown={(e) => {
                dragRef.current = { x: e.clientX, y: e.clientY, ox: transform.x, oy: transform.y };
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
              }}
              onPointerMove={(e) => {
                const d = dragRef.current;
                if (!d) return;
                setTransform((t) => ({
                  ...t,
                  x: d.ox + (e.clientX - d.x),
                  y: d.oy + (e.clientY - d.y),
                }));
              }}
              onPointerUp={() => {
                dragRef.current = null;
              }}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
              aria-label="Arrastar para centralizar a foto"
            >
              {photo ? (
                <img
                  src={photo}
                  alt="Foto do usuário"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                  style={{ transform: previewTransform }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[44px] text-[#8E8E93]">
                  {name.trim() ? name.trim()[0].toUpperCase() : '👤'}
                </div>
              )}
            </div>

            {photoError && (
              <p className="text-[13px] text-[#FF3B30] mt-2">{photoError}</p>
            )}

            <p className="text-[12px] text-[#8E8E93] mt-2">
              Arraste para centralizar
            </p>

            {/* Zoom */}
            {photo && (
              <div className="w-full flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() =>
                    setTransform((t) => ({ ...t, scale: Math.max(0.5, +(t.scale - 0.1).toFixed(2)) }))
                  }
                  aria-label="Diminuir foto"
                  className="w-8 h-8 rounded-full bg-[#E5E5EA] text-black text-[18px] leading-none"
                >
                  −
                </button>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.05}
                  value={transform.scale}
                  onChange={(e) =>
                    setTransform((t) => ({ ...t, scale: Number(e.target.value) }))
                  }
                  aria-label="Zoom da foto"
                  className="flex-1 accent-[#D97706]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setTransform((t) => ({ ...t, scale: Math.min(3, +(t.scale + 0.1).toFixed(2)) }))
                  }
                  aria-label="Aumentar foto"
                  className="w-8 h-8 rounded-full bg-[#E5E5EA] text-black text-[18px] leading-none"
                >
                  +
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="px-4 h-[36px] rounded-[10px] bg-[#D97706] text-white text-[15px] font-semibold active:opacity-90 transition"
              >
                {photo ? 'Trocar foto' : 'Escolher foto'}
              </button>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 h-[36px] rounded-[10px] bg-white border border-[#E5E5EA] text-[15px] font-medium text-black active:bg-black/5 transition"
              >
                Tirar foto
              </button>
              {photo && (
                <>
                  <button
                    type="button"
                    onClick={() => setTransform((t) => ({ ...t, rotate: (t.rotate + 90) % 360 }))}
                    className="px-4 h-[36px] rounded-[10px] bg-white border border-[#E5E5EA] text-[15px] font-medium text-black active:bg-black/5 transition"
                  >
                    Girar
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransform({ ...DEFAULT_TRANSFORM })}
                    className="px-4 h-[36px] rounded-[10px] bg-white border border-[#E5E5EA] text-[15px] font-medium text-black active:bg-black/5 transition"
                  >
                    Centralizar
                  </button>
                </>
              )}
            </div>
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          {/* In-app selfie camera (the capture attribute is ignored by WebViews) */}
          {isCameraOpen && (
            <div className="bg-black rounded-[16px] overflow-hidden">
              <div className="relative bg-black" style={{ aspectRatio: '3/4' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas ref={captureCanvasRef} className="hidden" />
                {cameraError && (
                  <div className="absolute inset-x-4 top-1/3 bg-white/95 rounded-[12px] p-4 text-center">
                    <p className="text-[14px] text-black">{cameraError}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-black">
                <button
                  type="button"
                  onClick={closeCamera}
                  className="text-[16px] text-[#E49F13]"
                >
                  Voltar
                </button>
                {!cameraError && (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    aria-label="Capturar foto"
                    className="w-[60px] h-[60px] rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition"
                  >
                    <div className="w-[46px] h-[46px] bg-white rounded-full" />
                  </button>
                )}
                <div className="w-[52px]" />
              </div>
            </div>
          )}

          {/* Identity fields (Apple grouped style) */}
          <div className="bg-white rounded-[12px] overflow-hidden border border-[#E5E5EA] divide-y divide-[#E5E5EA]">
            <div className="flex items-center px-4 py-3">
              <span className="w-[90px] text-[17px] text-black font-normal">Nome</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                aria-label="Nome"
                className="flex-1 text-[17px] text-black placeholder-[#C7C7CC] outline-hidden bg-transparent"
              />
            </div>
            <div className="flex items-center px-4 py-3">
              <span className="w-[90px] text-[17px] text-black font-normal">Telefone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                aria-label="Telefone"
                className="flex-1 text-[17px] text-black placeholder-[#C7C7CC] outline-hidden bg-transparent"
              />
            </div>
            <div className="flex items-center px-4 py-3">
              <span className="w-[90px] text-[17px] text-black font-normal">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                aria-label="E-mail"
                className="flex-1 text-[17px] text-black placeholder-[#C7C7CC] outline-hidden bg-transparent"
              />
            </div>
          </div>

          {/* Backup entry */}
          <button
            type="button"
            onClick={onOpenBackup}
            className="w-full bg-white rounded-[12px] px-4 py-3 flex items-center justify-between border border-[#E5E5EA] active:bg-black/5 transition"
          >
            <span className="text-[17px] text-black">Backup das notas</span>
            <span className="text-[#C7C7CC] text-[18px] font-light">›</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
