import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CheckCircle, Upload, Shield, Info, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { useAuth } from '../../App';
import { MiddlemanFaceScanner } from './MiddlemanFaceScanner';

interface MiddlemanApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MiddlemanApplicationForm({ isOpen, onClose }: MiddlemanApplicationFormProps) {
  const { user } = useAuth();
  const [experience, setExperience] = useState('');
  const [availability, setAvailability] = useState('');
  const [whyMiddleman, setWhyMiddleman] = useState('');
  const [referralCodes, setReferralCodes] = useState('');
  const [externalLinks, setExternalLinks] = useState('');
  const [preferredTradeTypes, setPreferredTradeTypes] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<null | {
    status: string;
    submittedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
  }>(null);
  const [faceImages, setFaceImages] = useState<File[]>([]);
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [faceImagesUploaded, setFaceImagesUploaded] = useState(false);
  
  React.useEffect(() => {
    // Only check status when dialog is open
    if (isOpen) {
      // Check if user already has an application
      const checkApplicationStatus = async () => {
        try {
          const response = await apiService.getApplicationStatus();
          setApplicationStatus(response);
        } catch (error) {
          if ((error as Error).message !== 'No application found') {
            console.error('Error checking application status:', error);
          }
        }
      };
      
      checkApplicationStatus();
    }
  }, [isOpen]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      
      // Validate each file
      const invalidFiles = fileArray.filter(
        file => !file.type.match(/image\/(jpeg|png|jpg|gif)|application\/pdf/)
      );
      
      if (invalidFiles.length > 0) {
        toast.error('Only images and PDF files are allowed');
        return;
      }
      
      if (fileArray.length > 5) {
        toast.error('Maximum 5 files allowed');
        return;
      }
      
      setDocuments(fileArray);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!experience.trim()) {
      toast.error('Please provide your trading experience');
      return;
    }
    
    if (!availability.trim()) {
      toast.error('Please provide your availability');
      return;
    }
    
    if (!whyMiddleman.trim()) {
      toast.error('Please explain why you want to be a middleman');
      return;
    }
    
    if (documents.length === 0) {
      toast.error('Please upload at least one verification document');
      return;
    }
    
    if (faceImages.length === 0) {
      toast.error('Please complete face verification first');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Check file sizes before submitting
      const overSizedFiles = documents.filter(file => file.size > 10 * 1024 * 1024);
      if (overSizedFiles.length > 0) {
        toast.error('Some files exceed the 10MB size limit');
        setIsSubmitting(false);
        return;
      }
      
      // Create a loading toast to show progress
      const toastId = toast.loading('Submitting application...');
      
      try {
        await apiService.applyForMiddleman({
          experience,
          availability,
          why_middleman: whyMiddleman,
          referral_codes: referralCodes,
          external_links: externalLinks,
          preferred_trade_types: preferredTradeTypes
        }, documents);
        
        // Upload face images after successful application submission
        if (faceImages.length > 0) {
          await apiService.uploadFaceImages(faceImages);
        }
        
        toast.dismiss(toastId);
        toast.success('Application submitted successfully!');
        
        // Check updated status
        const response = await apiService.getApplicationStatus();
        setApplicationStatus(response);
        
        setIsSubmitting(false);
      } catch (err) {
        toast.dismiss(toastId);
        throw err; // Re-throw to be caught by outer catch block
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error submitting application:', error);
      
      // Provide more specific error message if possible
      const errorMessage = error instanceof Error ? 
        error.message : 'Failed to submit application. Please try again.';
        
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Middleman Application
          </DialogTitle>
          <DialogDescription>
            Apply to become a trusted middleman on BloxMarket
          </DialogDescription>
        </DialogHeader>

        {/* If user has an existing application, show its status */}
        {applicationStatus && applicationStatus.status === 'pending' ? (
          <div className="space-y-6">
            <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
              <Info className="w-5 h-5" />
              <AlertTitle>Application Under Review</AlertTitle>
              <AlertDescription className="mt-2">
                Your application is currently under review by our team.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Submitted</Label>
                <p>{new Date(applicationStatus.submittedAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        ) : applicationStatus && applicationStatus.status === 'approved' && user?.role === 'middleman' ? (
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <AlertTitle>Application Approved</AlertTitle>
              <AlertDescription className="mt-2">
                Congratulations! Your application has been approved and you are now a verified middleman.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Submitted</Label>
                <p>{new Date(applicationStatus.submittedAt).toLocaleDateString()}</p>
              </div>
              
              {applicationStatus.reviewedAt && (
                <div>
                  <Label className="text-sm text-muted-foreground">Approved</Label>
                  <p>{new Date(applicationStatus.reviewedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          /* Show application form for new applications, rejected applications, or approved users who lost middleman status */
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Requirements Alert */}
              <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <Info className="w-5 h-5" />
                <AlertTitle>Application Requirements</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
                    <li>Valid ID documents for verification (passport, driver's license, ID card)</li>
                    <li>Face verification images captured via camera</li>
                    <li>Minimum of 50 completed trades</li>
                    <li>Active account for at least 3 months</li>
                    <li>Clean record with no reported scams or fraud</li>
                    <li>Regular availability for middleman services</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              {/* Trading Experience */}
              <div className="space-y-2">
                <Label htmlFor="experience">Trading Experience <span className="text-red-500">*</span></Label>
                <Textarea 
                  id="experience"
                  placeholder="Describe your trading experience, volume, and history on Roblox and other platforms"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="min-h-[100px]"
                  required
                />
              </div>
              
              {/* Availability */}
              <div className="space-y-2">
                <Label htmlFor="availability">Availability <span className="text-red-500">*</span></Label>
                <Textarea 
                  id="availability"
                  placeholder="What hours/days are you available to serve as a middleman? Include your timezone."
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="min-h-[100px]"
                  required
                />
              </div>
              
              {/* Why Middleman */}
              <div className="space-y-2">
                <Label htmlFor="why-middleman">Why do you want to be a middleman? <span className="text-red-500">*</span></Label>
                <Textarea 
                  id="why-middleman"
                  placeholder="Explain why you want to be a middleman and what qualifies you for this role"
                  value={whyMiddleman}
                  onChange={(e) => setWhyMiddleman(e.target.value)}
                  className="min-h-[100px]"
                  required
                />
              </div>
              
              {/* Referral Codes */}
              <div className="space-y-2">
                <Label htmlFor="referral-codes">Referral Codes (Optional)</Label>
                <Input 
                  id="referral-codes"
                  placeholder="Referral codes or usernames of those who referred you"
                  value={referralCodes}
                  onChange={(e) => setReferralCodes(e.target.value)}
                />
              </div>
              
              {/* External Links */}
              <div className="space-y-2">
                <Label htmlFor="external-links">External Profile Links (Optional)</Label>
                <Textarea 
                  id="external-links"
                  placeholder="Links to your profiles on Roblox, Discord, other trading platforms (one per line)"
                  value={externalLinks}
                  onChange={(e) => setExternalLinks(e.target.value)}
                />
              </div>
              
              {/* Preferred Trade Types */}
              <div className="space-y-2">
                <Label htmlFor="trade-types">Preferred Trade Types (Optional)</Label>
                <Input 
                  id="trade-types"
                  placeholder="What types of trades do you specialize in? (e.g., Limiteds, Robux, Game Items)"
                  value={preferredTradeTypes}
                  onChange={(e) => setPreferredTradeTypes(e.target.value)}
                />
              </div>
              
              {/* Document Upload */}
              <div className="space-y-2">
                <Label htmlFor="documents">Verification Documents <span className="text-red-500">*</span></Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Input
                    id="documents"
                    type="file"
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                    accept="image/jpeg,image/png,image/jpg,image/gif,application/pdf"
                    required
                  />
                  <label htmlFor="documents" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-gray-600 font-medium">
                      Click to upload verification documents
                    </span>
                    <span className="text-sm text-gray-500 mt-1">
                      (Upload valid ID, proof of address, or other verification)
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      Accepts JPG, PNG, GIF or PDF (max 5 files, 10MB each)
                    </span>
                  </label>
                </div>
                
                {/* Document Preview */}
                {documents.length > 0 && (
                  <div className="mt-4">
                    <Label className="block mb-2">Selected Documents:</Label>
                    <div className="flex flex-wrap gap-2">
                      {documents.map((file, index) => (
                        <div 
                          key={index} 
                          className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1"
                        >
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Face Verification Camera */}
              <div className="space-y-2">
                <Label>Face Verification <span className="text-red-500">*</span></Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    {faceImagesUploaded ? (
                      <div className="space-y-3">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                        <p className="text-green-700 font-medium">Face verification completed!</p>
                        <p className="text-sm text-gray-600">Your face images have been uploaded successfully.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Shield className="w-12 h-12 text-blue-500 mx-auto" />
                        <p className="text-gray-600 font-medium">
                          Face verification required
                        </p>
                        <p className="text-sm text-gray-500">
                          Capture your face to verify your identity and prevent fraudulent applications.
                        </p>
                        <Button
                          type="button"
                          onClick={() => setShowFaceScanner(true)}
                          className="flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          Start Face Verification
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                >
                  Cancel
                </Button>
                
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Face Scanner Modal */}
        {showFaceScanner && (
          <MiddlemanFaceScanner
            onComplete={(capturedFaceImages) => {
              setFaceImages(capturedFaceImages);
              setFaceImagesUploaded(true);
              setShowFaceScanner(false);
              toast.success('Face verification completed successfully!');
            }}
            onCancel={() => setShowFaceScanner(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}