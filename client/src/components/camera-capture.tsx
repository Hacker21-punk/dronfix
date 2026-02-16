import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Camera, X, RotateCcw, Check, Loader2 } from "lucide-react";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  isUploading?: boolean;
}

export function CameraCapture({ open, onClose, onCapture, isUploading }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      setError(null);
      setCapturedImage(null);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError") {
        setError("Camera access was denied. Please allow camera permission in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Could not access camera. Please check permissions and try again.");
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [open, facingMode, startCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    const byteString = atob(capturedImage.split(",")[1]);
    const mimeString = capturedImage.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file);
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === "user" ? "environment" : "user"));
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCapturedImage(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Take Photo
          </DialogTitle>
        </DialogHeader>
        <div className="relative bg-black">
          {error ? (
            <div className="flex items-center justify-center h-64 p-6 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full max-h-[60vh] object-contain"
              data-testid="img-camera-preview"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[60vh] object-contain"
              data-testid="video-camera-feed"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center justify-center gap-3 p-4">
          {error ? (
            <Button variant="outline" onClick={handleClose} data-testid="button-camera-close">
              Close
            </Button>
          ) : capturedImage ? (
            <>
              <Button
                variant="outline"
                onClick={handleRetake}
                disabled={isUploading}
                data-testid="button-camera-retake"
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Retake
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isUploading}
                data-testid="button-camera-confirm"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                {isUploading ? "Uploading..." : "Use Photo"}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="icon"
                variant="outline"
                onClick={toggleFacingMode}
                data-testid="button-camera-flip"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                onClick={handleCapture}
                className="rounded-full w-14 h-14"
                data-testid="button-camera-shutter"
              >
                <Camera className="h-6 w-6" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={handleClose}
                data-testid="button-camera-cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
