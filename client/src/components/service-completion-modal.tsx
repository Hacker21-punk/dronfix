import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Shield, CheckCircle, PenTool, Camera, MapPin, Loader2, AlertTriangle, MessageSquare } from "lucide-react";
import { useSecureComplete } from "@/hooks/use-service-requests";

interface ServiceCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: number;
}

const STEPS = [
  { id: 1, title: "Engineer Sign", icon: PenTool },
  { id: 2, title: "Customer Sign", icon: PenTool },
  { id: 3, title: "Remarks", icon: MessageSquare },
  { id: 4, title: "Customer Photo", icon: Camera },
];

export function ServiceCompletionModal({ open, onOpenChange, requestId }: ServiceCompletionModalProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Engineer Signature
  const [engineerSignatureData, setEngineerSignatureData] = useState("");
  const engSigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingEng, setIsDrawingEng] = useState(false);
  const [hasDrawnEng, setHasDrawnEng] = useState(false);

  // Step 2: Customer Signature
  const [hasCustomerMobile, setHasCustomerMobile] = useState<boolean | null>(null);
  const [signatureData, setSignatureData] = useState("");
  const [assistedSignature, setAssistedSignature] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Step 3: Remarks
  const [engineerRemarks, setEngineerRemarks] = useState("");
  const [customerRemarks, setCustomerRemarks] = useState("");

  // Step 4: Geo Photo
  const [geoPhotoData, setGeoPhotoData] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoError, setGeoError] = useState("");
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const secureCompleteMutation = useSecureComplete();

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── Generic Signature Canvas Helpers ──────────────────────────────
  const initCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
  };

  // Init engineer signature canvas
  useEffect(() => {
    if (currentStep === 1 && engSigCanvasRef.current) {
      initCanvas(engSigCanvasRef.current);
    }
  }, [currentStep]);

  // Init customer signature canvas
  useEffect(() => {
    if (currentStep === 2 && sigCanvasRef.current && hasCustomerMobile !== null) {
      initCanvas(sigCanvasRef.current);
    }
  }, [currentStep, hasCustomerMobile]);

  const getSigPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ── Engineer Signature Handlers ──────────────────────────────
  const startDrawingEng = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = engSigCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawingEng(true);
    setHasDrawnEng(true);
    const pos = getSigPos(e, engSigCanvasRef.current);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const drawEng = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingEng) return;
    const ctx = engSigCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getSigPos(e, engSigCanvasRef.current);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawingEng = () => setIsDrawingEng(false);

  const clearEngCanvas = () => {
    const canvas = engSigCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnEng(false);
    setEngineerSignatureData("");
  };

  const saveEngSig = () => {
    const canvas = engSigCanvasRef.current;
    if (!canvas) return;
    setEngineerSignatureData(canvas.toDataURL("image/png"));
  };

  // ── Customer Signature Handlers ──────────────────────────────
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = sigCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const pos = getSigPos(e, sigCanvasRef.current);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = sigCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getSigPos(e, sigCanvasRef.current);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSigCanvas = () => {
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureData("");
  };

  const saveSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    setSignatureData(canvas.toDataURL("image/png"));
  };

  // ── Geo Photo Handlers ──────────────────────────────
  const startCamera = async () => {
    setGeoError("");
    setCapturingPhoto(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setGeoError("Camera access denied. Please enable camera permissions.");
      setCapturingPhoto(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = photoCanvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const data = canvas.toDataURL("image/jpeg", 0.85);
    setGeoPhotoData(data);

    // Stop camera
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCapturingPhoto(false);

    // Get GPS
    if (!navigator.geolocation) {
      setGeoError("GPS not supported on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
      },
      (err) => {
        setGeoError("GPS location unavailable: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Final Submit ──────────────────────────────
  const handleFinalSubmit = async () => {
    if (!signatureData || !engineerSignatureData || !geoPhotoData || latitude === null || longitude === null) return;

    await secureCompleteMutation.mutateAsync({
      id: requestId,
      signatureData,
      engineerSignatureData,
      assistedSignature,
      geoPhotoData,
      latitude,
      longitude,
      engineerRemarks,
      customerRemarks,
    });
    onOpenChange(false);
  };

  const canProceedStep1 = !!engineerSignatureData;
  const canProceedStep2 = !!signatureData;
  const canProceedStep3 = true; // Remarks are optional
  const canProceedStep4 = !!geoPhotoData && latitude !== null && longitude !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Secure Service Completion
          </DialogTitle>
        </DialogHeader>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`
                    h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-slate-200 text-slate-500'}
                  `}>
                    {isDone ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[9px] font-medium ${isActive ? 'text-blue-600' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${idx < currentStep - 1 ? 'bg-green-500' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step 1: Engineer Digital Signature */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <PenTool className="h-4 w-4 inline mr-1" />
              <strong>Engineer</strong> — Please sign below to confirm the service work.
            </div>

            {!engineerSignatureData ? (
              <>
                <Label>Engineer Signature</Label>
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-white overflow-hidden">
                  <canvas
                    ref={engSigCanvasRef}
                    className="w-full cursor-crosshair touch-none"
                    style={{ height: "160px" }}
                    onMouseDown={startDrawingEng}
                    onMouseMove={drawEng}
                    onMouseUp={stopDrawingEng}
                    onMouseLeave={stopDrawingEng}
                    onTouchStart={startDrawingEng}
                    onTouchMove={drawEng}
                    onTouchEnd={stopDrawingEng}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearEngCanvas}>Clear</Button>
                  {hasDrawnEng && <Button size="sm" onClick={saveEngSig}>✓ Save Signature</Button>}
                </div>
              </>
            ) : (
              <div className="text-center space-y-3 py-4">
                <div className="h-16 w-16 rounded-full bg-green-100 mx-auto flex items-center justify-center">
                  <PenTool className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg">Engineer Signature Captured ✓</h3>
                <img src={engineerSignatureData} alt="Engineer Signature" className="mx-auto border rounded max-h-24" />
                <Button variant="outline" size="sm" onClick={() => { setEngineerSignatureData(""); setHasDrawnEng(false); }}>
                  Redo Signature
                </Button>
              </div>
            )}

            {canProceedStep1 && (
              <Button className="w-full" onClick={() => setCurrentStep(2)}>
                Continue to Customer Signature →
              </Button>
            )}
          </div>
        )}

        {/* Step 2: Customer Digital Signature */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {!signatureData ? (
              <>
                {hasCustomerMobile === null ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Does the customer have mobile access for signature?</p>
                    <div className="flex gap-3">
                      <Button className="flex-1" variant="outline" onClick={() => { setHasCustomerMobile(true); setAssistedSignature(false); }}>
                        ✅ Yes — Standard
                      </Button>
                      <Button className="flex-1" variant="outline" onClick={() => { setHasCustomerMobile(false); setAssistedSignature(true); }}>
                        ❌ No — Assisted
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {assistedSignature && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        <strong>Assisted Signature Mode</strong> — Signature captured on behalf of customer by engineer.
                      </div>
                    )}
                    <Label>{assistedSignature ? "Engineer signs on behalf of customer" : "Customer Signature"}</Label>
                    <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-white overflow-hidden">
                      <canvas
                        ref={sigCanvasRef}
                        className="w-full cursor-crosshair touch-none"
                        style={{ height: "160px" }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={clearSigCanvas}>Clear</Button>
                      <Button variant="outline" size="sm" onClick={() => { setHasCustomerMobile(null); clearSigCanvas(); }}>Change Mode</Button>
                      {hasDrawn && <Button size="sm" onClick={saveSig}>✓ Save Signature</Button>}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center space-y-3 py-4">
                <div className="h-16 w-16 rounded-full bg-green-100 mx-auto flex items-center justify-center">
                  <PenTool className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg">Customer Signature Captured ✓</h3>
                {assistedSignature && <Badge variant="outline" className="text-amber-700">Assisted Mode</Badge>}
                <img src={signatureData} alt="Customer Signature" className="mx-auto border rounded max-h-24" />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setCurrentStep(1)}>← Back</Button>
              {canProceedStep2 && (
                <Button className="flex-1" onClick={() => setCurrentStep(3)}>
                  Continue to Remarks →
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Engineer & Customer Remarks */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <MessageSquare className="h-4 w-4 inline mr-1" />
              Add any <strong>remarks or observations</strong> about the service.
            </div>

            <div className="space-y-2">
              <Label>Engineer Remarks / Pilot Remarks</Label>
              <Textarea
                placeholder="Enter engineer observations, pilot remarks, or notes about the service..."
                value={engineerRemarks}
                onChange={(e) => setEngineerRemarks(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Customer Remarks (Optional)</Label>
              <Textarea
                placeholder="Customer feedback or comments about the service..."
                value={customerRemarks}
                onChange={(e) => setCustomerRemarks(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setCurrentStep(2)}>← Back</Button>
              <Button className="flex-1" onClick={() => setCurrentStep(4)}>
                Continue to Photo →
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Geo-Tagged Customer Photo */}
        {currentStep === 4 && (
          <div className="space-y-4">
            {!geoPhotoData ? (
              <>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <Camera className="h-4 w-4 inline mr-1" />
                  Capture a <strong>real-time photo</strong> of the customer with GPS location.
                </div>

                {!capturingPhoto ? (
                  <Button className="w-full" onClick={startCamera}>
                    <Camera className="h-4 w-4 mr-2" /> Open Camera
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden bg-black">
                      <video ref={videoRef} className="w-full" autoPlay playsInline muted />
                    </div>
                    <Button className="w-full" onClick={capturePhoto}>
                      📸 Capture Photo
                    </Button>
                  </div>
                )}
                <canvas ref={photoCanvasRef} className="hidden" />

                {geoError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 inline mr-1" /> {geoError}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center space-y-3 py-2">
                <div className="h-16 w-16 rounded-full bg-green-100 mx-auto flex items-center justify-center">
                  <Camera className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg">Photo Captured ✓</h3>
                <img src={geoPhotoData} alt="Customer" className="mx-auto rounded-lg max-h-40 border" />
                {latitude !== null && longitude !== null ? (
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </div>
                ) : (
                  <div className="text-xs text-amber-600">⏳ Acquiring GPS coordinates...</div>
                )}
                <Button variant="outline" size="sm" onClick={() => { setGeoPhotoData(""); setLatitude(null); setLongitude(null); }}>
                  Retake Photo
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setCurrentStep(3)}>← Back</Button>
              {canProceedStep4 && (
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleFinalSubmit}
                  disabled={secureCompleteMutation.isPending}
                >
                  {secureCompleteMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Completing...</>
                  ) : (
                    <>✅ Complete Service</>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
