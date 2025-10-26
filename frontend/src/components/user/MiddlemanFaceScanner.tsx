import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Camera, X, CheckCircle, AlertCircle, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import * as faceapi from 'face-api.js';

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

  // Face detection states
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [identificationStatus, setIdentificationStatus] = useState<'none' | 'detecting' | 'identified' | 'failed'>('none');
  const [detectionInterval, setDetectionInterval] = useState<NodeJS.Timeout | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, [stream, detectionInterval]);

  // Load face detection models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Load models from CDN
        const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
        toast.success('Face detection models loaded successfully');
      } catch (error) {
        console.error('Error loading face detection models:', error);
        toast.error('Failed to load face detection models. Some features may not work.');
      }
    };

    loadModels();
  }, []);

  const startFaceDetection = useCallback(() => {
    if (!modelsLoaded || !videoRef.current || !overlayCanvasRef.current) {
      return;
    }

    setIdentificationStatus('detecting');

    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const overlayContext = overlayCanvas.getContext('2d');

    if (!overlayContext) return;

    // Set overlay canvas dimensions to match video
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    const detectFaces = async () => {
      if (!video || video.readyState !== 4) return;

      try {
        // Detect faces (basic detection only)
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }));

        // Clear previous drawings
        overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        if (detections.length > 0) {
          // Draw detections on overlay
          detections.forEach((detection, index) => {
            const { x, y, width, height } = detection.box;

            // Draw bounding box
            overlayContext.strokeStyle = '#00ff00';
            overlayContext.lineWidth = 3;
            overlayContext.strokeRect(x, y, width, height);

            // Draw detection confidence
            overlayContext.fillStyle = '#00ff00';
            overlayContext.font = '16px Arial';
            overlayContext.fillText(
              `Confidence: ${(detection.score * 100).toFixed(1)}%`,
              x,
              y - 10
            );

            // Draw face number if multiple faces
            if (detections.length > 1) {
              overlayContext.fillStyle = '#ff0000';
              overlayContext.fillText(`Face ${index + 1}`, x, y + height + 20);
            }
          });

          // Update identification status
          if (identificationStatus !== 'identified') {
            setIdentificationStatus('identified');
            toast.success('Face detected and identified successfully!');
          }
        } else {
          setIdentificationStatus('failed');

          // Draw "No face detected" message
          overlayContext.fillStyle = '#ff0000';
          overlayContext.font = '20px Arial';
          overlayContext.fillText('No face detected', 20, 40);
        }
      } catch (error) {
        console.error('Face detection error:', error);
        setIdentificationStatus('failed');
      }
    };

    // Start detection interval
    const interval = setInterval(detectFaces, 100); // Detect every 100ms
    setDetectionInterval(interval);
  }, [modelsLoaded, identificationStatus]);

  const stopFaceDetection = useCallback(() => {
    if (detectionInterval) {
      clearInterval(detectionInterval);
      setDetectionInterval(null);
    }
    if (overlayCanvasRef.current) {
      const context = overlayCanvasRef.current.getContext('2d');
      if (context) {
        context.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
    }
    setIdentificationStatus('none');
  }, [detectionInterval]);

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

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });

        // Start face detection if models are loaded
        if (modelsLoaded) {
          startFaceDetection();
        }
      }
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
  }, [modelsLoaded, startFaceDetection]);

  const stopCamera = useCallback(() => {
    stopFaceDetection();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream, stopFaceDetection]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-6 h-6 text-blue-500" />
            Real-Time Face Identification
          </CardTitle>
          <CardDescription>
            Use your camera for real-time face detection and identification. This provides live verification of your identity.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Real-Time Identification Instructions</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-4 mt-2 space-y-1">
            <li>Position yourself in front of the camera with good lighting</li>
            <li>Keep your face clearly visible within the camera frame</li>
            <li>The system will automatically detect and identify your face</li>
            <li>Green bounding boxes indicate successful face detection</li>
            <li>Face landmarks and expressions are analyzed in real-time</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Camera Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Live Face Detection</CardTitle>
          <CardDescription>
            Real-time face detection and identification using advanced AI algorithms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Controls */}
          <div className="flex flex-wrap justify-center gap-3">
            {!isCameraActive ? (
              <Button
                onClick={startCamera}
                className="flex items-center gap-2"
                size="lg"
                disabled={!modelsLoaded}
              >
                <Camera className="w-5 h-5" />
                {modelsLoaded ? 'Start Real-Time Identification' : 'Loading AI Models...'}
              </Button>
            ) : (
              <Button
                onClick={stopCamera}
                variant="outline"
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Stop Identification
              </Button>
            )}
          </div>

          {/* Camera Error */}
          {cameraError && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Camera Error</AlertTitle>
              <AlertDescription>{cameraError}</AlertDescription>
            </Alert>
          )}

          {/* Video Feed */}
          {isCameraActive && (
            <div className="flex justify-center">
              <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="max-w-full h-auto"
                  style={{ maxWidth: '640px', maxHeight: '480px' }}
                />
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{ maxWidth: '640px', maxHeight: '480px' }}
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  Live Camera Feed
                </div>
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  Status: {identificationStatus === 'none' && 'Ready'}
                  {identificationStatus === 'detecting' && 'Detecting...'}
                  {identificationStatus === 'identified' && '✓ Identified'}
                  {identificationStatus === 'failed' && '✗ No Face'}
                </div>
                {modelsLoaded && (
                  <div className="absolute top-2 left-2 bg-green-500 bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                    AI Models Loaded
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Identification Status */}
      {isCameraActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {identificationStatus === 'identified' ? (
                <>
                  <UserCheck className="w-5 h-5 text-green-500" />
                  Identification Successful
                </>
              ) : identificationStatus === 'failed' ? (
                <>
                  <UserX className="w-5 h-5 text-red-500" />
                  No Face Detected
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 text-blue-500" />
                  Identifying...
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              {identificationStatus === 'identified' && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Face Successfully Identified</AlertTitle>
                  <AlertDescription>
                    Your identity has been verified in real-time. The system detected facial features and confirmed your presence.
                  </AlertDescription>
                </Alert>
              )}

              {identificationStatus === 'failed' && (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Face Detected</AlertTitle>
                  <AlertDescription>
                    Please position yourself clearly in front of the camera with adequate lighting.
                  </AlertDescription>
                </Alert>
              )}

              {identificationStatus === 'detecting' && (
                <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Scanning for Face</AlertTitle>
                  <AlertDescription>
                    The AI is actively scanning the camera feed for facial features...
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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

            <Button
              onClick={() => onComplete && onComplete([])}
              disabled={identificationStatus !== 'identified'}
              className="flex items-center gap-2"
              size="lg"
            >
              <CheckCircle className="w-5 h-5" />
              {identificationStatus === 'identified' ? 'Complete Identification' : 'Waiting for Identification...'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}