import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, CheckCircle2, Clock, XCircle, ShieldCheck, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sendTelegramNotification } from "@/lib/telegram";

const STEPS = [
  { key: "aadhaar_front", label: "Aadhaar Front", instruction: "Place the FRONT of your Aadhaar card in the frame and capture" },
  { key: "aadhaar_back", label: "Aadhaar Back", instruction: "Now flip and place the BACK of your Aadhaar card in the frame" },
  { key: "pan_card", label: "PAN Card", instruction: "Place your PAN card in the frame and capture" },
  { key: "passbook", label: "Bank Passbook", instruction: "Place the first page of your bank passbook in the frame and capture" },
  { key: "selfie", label: "Live Selfie", instruction: "Look straight at the camera and take a clear selfie", facing: "user" },
];

const KYCVerification = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [captures, setCaptures] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) navigate("/login");
      else setUser(data.session.user);
    });
  }, [navigate]);

  const { data: existingKyc, isLoading } = useQuery({
    queryKey: ["kyc-status", user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("kyc_documents" as any) as any)
        .select("*").eq("user_id", user!.id).order("submitted_at", { ascending: false }).limit(1).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const startCamera = useCallback(async (facingMode: string = "environment") => {
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraReady(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      // Wait for ref to be available
      const attachStream = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              setCameraReady(true);
            }).catch(() => {
              setCameraReady(true);
            });
          };
        }
      };

      setCameraActive(true);
      // Small delay to let React render the video element
      setTimeout(attachStream, 100);
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Camera access denied. Please allow camera permissions in your browser settings.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const stepKey = STEPS[currentStep].key;
    setCaptures(prev => ({ ...prev, [stepKey]: dataUrl }));
    stopCamera();
  };

  const retake = () => {
    const stepKey = STEPS[currentStep].key;
    setCaptures(prev => {
      const next = { ...prev };
      delete next[stepKey];
      return next;
    });
    const facingMode = STEPS[currentStep].facing === "user" ? "user" : "environment";
    startCamera(facingMode);
  };

  const dataURLtoBlob = (dataURL: string) => {
    const parts = dataURL.split(",");
    const mime = parts[0].match(/:(.*?);/)![1];
    const bstr = atob(parts[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    return new Blob([u8arr], { type: mime });
  };

  const handleSubmit = async () => {
    if (!user) return;
    const requiredKeys = STEPS.map(s => s.key);
    const missing = requiredKeys.filter(k => !captures[k]);
    if (missing.length > 0) {
      toast.error("Please capture all documents before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const urls: Record<string, string> = {};
      for (const step of STEPS) {
        const blob = dataURLtoBlob(captures[step.key]);
        const path = `${user.id}/${step.key}_${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("kyc-documents")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: signedData } = await supabase.storage
          .from("kyc-documents")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        urls[step.key] = signedData?.signedUrl || path;
      }

      const { error } = await (supabase.from("kyc_documents" as any) as any).insert({
        user_id: user.id,
        aadhaar_front_url: urls.aadhaar_front,
        aadhaar_back_url: urls.aadhaar_back,
        pan_card_url: urls.pan_card,
        selfie_url: urls.selfie,
        passbook_url: urls.passbook,
        status: "pending",
      });
      if (error) throw error;

      await (supabase.from("profiles" as any) as any)
        .update({ kyc_status: "pending" })
        .eq("id", user.id);

      try {
        const { data: profile } = await (supabase.from("profiles" as any) as any)
          .select("username").eq("id", user.id).single();
        await sendTelegramNotification("kyc_submitted", {
          username: profile?.username || user.email,
          email: user.email,
          user_id: user.id,
        });
      } catch {}

      queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
      queryClient.invalidateQueries({ queryKey: ["profile-data"] });
      toast.success("KYC documents submitted successfully! Under review.");
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If KYC already submitted, show status
  if (existingKyc) {
    const statusConfig: Record<string, { icon: any; color: string; label: string; desc: string }> = {
      pending: { icon: Clock, color: "text-amber-400", label: "Under Review", desc: "Your KYC documents are being reviewed. This usually takes 24-48 hours." },
      verified: { icon: ShieldCheck, color: "text-primary", label: "Verified", desc: "Your KYC has been verified. You can now make withdrawals." },
      rejected: { icon: XCircle, color: "text-destructive", label: "Rejected", desc: existingKyc.admin_note || "Your KYC was rejected. Please resubmit with clear documents." },
    };
    const config = statusConfig[existingKyc.status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <div className="min-h-screen relative overflow-hidden">
        <header className="sticky top-0 z-40 border-b border-border/30" style={{
          background: "linear-gradient(180deg, hsl(228 18% 5% / 0.95), hsl(228 18% 5% / 0.8))",
          backdropFilter: "blur(20px)",
        }}>
          <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-display text-lg font-bold">KYC Verification</h1>
          </div>
        </header>
        <div className="mx-auto max-w-lg px-4 py-8 flex flex-col items-center gap-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4">
            <div className={`h-20 w-20 rounded-full bg-secondary flex items-center justify-center ${config.color}`}>
              <Icon className="h-10 w-10" />
            </div>
            <h2 className="font-display text-xl font-bold">{config.label}</h2>
            <p className="text-sm text-muted-foreground text-center max-w-xs">{config.desc}</p>
            {existingKyc.status === "rejected" && (
              <Button onClick={() => {
                queryClient.setQueryData(["kyc-status", user?.id], null);
              }} className="gradient-primary mt-4">
                Resubmit KYC
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  const stepKey = STEPS[currentStep]?.key;
  const hasCaptured = !!captures[stepKey];
  const allCaptured = STEPS.every(s => captures[s.key]);
  const capturedCount = STEPS.filter(s => captures[s.key]).length;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-border/30" style={{
        background: "linear-gradient(180deg, hsl(228 18% 5% / 0.95), hsl(228 18% 5% / 0.8))",
        backdropFilter: "blur(20px)",
      }}>
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => {
            stopCamera();
            navigate("/profile");
          }} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-lg font-bold">KYC Verification</h1>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {capturedCount}/{STEPS.length} Done
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4 pb-6">
        {/* Progress */}
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`flex-1 h-1.5 rounded-full transition-all ${
              captures[s.key] ? "bg-primary" : i === currentStep ? "bg-primary/40" : "bg-secondary"
            }`} />
          ))}
        </div>

        {/* Step info */}
        <Card className="glass-card p-4">
          <h2 className="font-display font-bold text-lg">{STEPS[currentStep].label}</h2>
          <p className="text-xs text-muted-foreground mt-1">{STEPS[currentStep].instruction}</p>
        </Card>

        {/* Camera / Preview */}
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-secondary border border-border/30">
          {cameraActive && !hasCaptured ? (
            <div className="absolute inset-0">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Camera frame overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-white/30 rounded-xl" />
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
              </div>
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-secondary/80">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ) : hasCaptured ? (
            <div className="absolute inset-0">
              <img src={captures[stepKey]} alt={STEPS[currentStep].label} className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3">
                <Badge className="bg-primary/90 text-primary-foreground gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Captured
                </Badge>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Camera className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Tap "Open Camera" to begin</p>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Action buttons */}
        <div className="flex gap-3">
          {!cameraActive && !hasCaptured && (
            <Button
              onClick={() => startCamera(STEPS[currentStep].facing === "user" ? "user" : "environment")}
              className="flex-1 gradient-primary h-12 rounded-xl font-bold gap-2"
            >
              <Camera className="h-4 w-4" /> Open Camera
            </Button>
          )}
          {cameraActive && !hasCaptured && (
            <Button
              onClick={capturePhoto}
              disabled={!cameraReady}
              className="flex-1 h-12 rounded-xl font-bold gap-2 bg-white text-black hover:bg-white/90"
            >
              <Camera className="h-4 w-4" /> Capture Photo
            </Button>
          )}
          {hasCaptured && (
            <>
              <Button onClick={retake} variant="outline" className="flex-1 h-12 rounded-xl font-bold gap-2">
                <RotateCcw className="h-4 w-4" /> Retake
              </Button>
              {currentStep < STEPS.length - 1 && (
                <Button onClick={() => setCurrentStep(prev => prev + 1)} className="flex-1 gradient-primary h-12 rounded-xl font-bold">
                  Next Step →
                </Button>
              )}
            </>
          )}
        </div>

        {/* Step thumbnails */}
        <div className="grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => { stopCamera(); setCurrentStep(i); }}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                i === currentStep ? "border-primary" : captures[s.key] ? "border-primary/30" : "border-border/30"
              }`}
            >
              {captures[s.key] ? (
                <img src={captures[s.key]} alt={s.label} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <Camera className="h-4 w-4 text-muted-foreground/30" />
                </div>
              )}
              {captures[s.key] && (
                <div className="absolute top-0.5 right-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <p className="absolute bottom-0 inset-x-0 text-[6px] text-center bg-black/60 text-white py-0.5 truncate px-0.5">
                {s.label}
              </p>
            </button>
          ))}
        </div>

        {/* Submit Button - inline, visible when all captured */}
        {allCaptured && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="pt-2"
          >
            <Card className="glass-card p-4 border-primary/30">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">All documents captured!</p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full gradient-primary h-14 rounded-2xl font-bold text-base gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" /> Submit KYC Documents
                  </>
                )}
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default KYCVerification;
