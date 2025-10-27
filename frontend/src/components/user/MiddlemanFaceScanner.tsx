import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MiddlemanFaceScannerProps {
  onComplete?: (faceImages: File[]) => void;
  onCancel?: () => void;
}

export function MiddlemanFaceScanner({
  onComplete,
  onCancel
}: MiddlemanFaceScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const [currentPhotoPreview, setCurrentPhotoPreview] = useState<string | null>(null);
  const [captureStep, setCaptureStep] = useState<'camera' | 'preview'>('camera');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Play video when stream is available
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(error => {
          console.error('Error playing video:', error);
          setCameraError('Failed to start video playback. Please try again.');
        });
      };
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user', // Use front camera
          frameRate: { ideal: 30, min: 15 }
        }
      });

      setStream(mediaStream);
      setIsCameraActive(true);

      // Note: Video playback is handled by useEffect when stream changes
    } catch (error) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Unable to access camera. ';

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera device found.';
        } else if (error.name === 'NotReadableError') {
          errorMessage += 'Camera is already in use by another application.';
        } else {
          errorMessage += error.message;
        }
      }

      setCameraError(errorMessage);
      toast.error('Camera access failed. Please check your permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob and create File
    canvas.toBlob(async (blob) => {
      if (blob) {
        // Create a File object from the blob
        const file = new File([blob], `face-verification-${Date.now()}.jpg`, { type: 'image/jpeg' });

        // Convert to base64 for preview
        const reader = new FileReader();
        reader.onload = () => {
          setCurrentPhotoPreview(reader.result as string);
          setCaptureStep('preview');
        };
        reader.readAsDataURL(blob);

        // Store the file temporarily
        setCapturedPhotos([file]);
      } else {
        toast.error('Failed to capture photo. Please try again.');
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.9);
  }, []);

  const retakePhoto = useCallback(() => {
    setCurrentPhotoPreview(null);
    setCapturedPhotos([]);
    setCaptureStep('camera');
    
    // Ensure video is playing when returning to camera mode
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(error => {
        console.error('Error restarting video after retake:', error);
        setCameraError('Failed to restart camera preview. Please try starting the camera again.');
      });
    }
  }, [stream]);

  const confirmPhoto = useCallback(() => {
    if (capturedPhotos.length > 0 && onComplete) {
      stopCamera();
      onComplete(capturedPhotos);
      toast.success('Face verification photo captured successfully!');
    }
  }, [capturedPhotos, onComplete, stopCamera]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-6 h-6 text-blue-500" />
            Face Verification Capture
          </CardTitle>
          <CardDescription>
            Capture and review your face verification photo for your middleman application.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Face Verification Instructions</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-4 mt-2 space-y-1">
            <li>Position yourself in front of the camera with good lighting</li>
            <li>Make sure your face is clearly visible and centered</li>
            <li>Click "Take Photo" when you're ready</li>
            <li>Review the captured photo and choose to "Confirm" or "Retake"</li>
            <li>The photo will be saved locally until you submit your application</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Camera Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {captureStep === 'camera' ? 'Camera Preview' : 'Photo Preview'}
          </CardTitle>
          <CardDescription>
            {captureStep === 'camera' 
              ? 'Live camera feed for face verification photo capture'
              : 'Review your captured photo'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Controls */}
          {captureStep === 'camera' ? (
            <div className="flex flex-wrap justify-center gap-3">
              {!isCameraActive ? (
                <Button
                  onClick={startCamera}
                  className="flex items-center gap-2"
                  size="lg"
                >
                  <Camera className="w-5 h-5" />
                  Start Camera
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button
                    onClick={capturePhoto}
                    disabled={isCapturing}
                    className="flex items-center gap-2"
                    size="lg"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {isCapturing ? 'Capturing...' : 'Take Photo'}
                  </Button>
                  <Button
                    onClick={stopCamera}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Stop Camera
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={confirmPhoto}
                className="flex items-center gap-2"
                size="lg"
              >
                <CheckCircle className="w-5 h-5" />
                Confirm Photo
              </Button>
              <Button
                onClick={retakePhoto}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Retake Photo
              </Button>
            </div>
          )}

          {/* Camera Error */}
          {cameraError && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Camera Error</AlertTitle>
              <AlertDescription>{cameraError}</AlertDescription>
            </Alert>
          )}

          {/* Video Feed or Photo Preview */}
          {captureStep === 'camera' && isCameraActive && (
            <div className="flex justify-center">
              <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                  style={{ width: '640px', height: '480px', objectFit: 'cover' }}
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  Live Camera Feed
                </div>
                <div className="absolute top-2 right-2 bg-green-500 bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                  Ready to Capture
                </div>
              </div>
            </div>
          )}

          {captureStep === 'preview' && currentPhotoPreview && (
            <div className="flex justify-center">
              <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden">
                <img
                  src={currentPhotoPreview}
                  alt="Captured face verification photo"
                  className="w-full h-auto"
                  style={{ width: '640px', height: '480px', objectFit: 'cover' }}
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  Captured Photo
                </div>
                <div className="absolute top-2 right-2 bg-blue-500 bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                  Ready to Confirm
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap justify-center gap-4">
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}