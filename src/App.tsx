import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, LogOut, User, Bell, Shield } from 'lucide-react';
import { ImageTypeSelector } from './components/ImageTypeSelector';
import { BlogImageForm } from './components/BlogImageForm';
import { InfographicForm } from './components/InfographicForm';
import { ImagePreview } from './components/ImagePreview';
import { ProgressSteps } from './components/ProgressSteps';
import { AuthModal } from './components/AuthModal';
import { AdminPanel } from './components/AdminPanel';
import { NotificationBanner } from './components/NotificationBanner';
import { NotificationSidebar } from './components/NotificationSidebar';
import { ImageTypeSwitch } from './components/ImageTypeSwitch';
import { BulkProcessingStatus } from './components/BulkProcessingStatus';
import { BulkProcessingModal } from './components/BulkProcessingModal';
import { CreditDisplay } from './components/CreditDisplay';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useBulkProcessing } from './hooks/useBulkProcessing';
import { sanitizeFormData } from './utils/textSanitizer';

type Step = 'select' | 'form' | 'result';
type ImageType = 'blog' | 'infographic' | null;

interface GeneratedImage {
  base64: string;
  type: 'blog' | 'infographic';
}

const WEBHOOK_URL = 'https://n8n.seoengine.agency/webhook/6e9e3b30-cb55-4d74-aa9d-68691983455f';

// Credit costs
const CREDIT_COSTS = {
  blog: 5,
  infographic: 10,
};

function App() {
  const { user, isAuthenticated, isLoading: authLoading, signInWithEmail, signUp, signOut, deductCredits } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    soundEnabled, 
    addNotification, 
    markAsRead, 
    markAllAsRead, 
    clearAllNotifications, 
    toggleSound, 
    removeNotification 
  } = useNotifications();
  const {
    isProcessing: isBulkProcessing,
    processedCount,
    totalCount,
    getEstimatedTimeRemaining,
    imageType: bulkImageType,
  } = useBulkProcessing();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showNotificationSidebar, setShowNotificationSidebar] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<ImageType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState<string | null>(null);

  const steps = ['Select Type', 'Provide Content', 'Generate Image'];
  const getStepIndex = () => {
    switch (currentStep) {
      case 'select': return 0;
      case 'form': return 1;
      case 'result': return 2;
      default: return 0;
    }
  };

  // Auto-dismiss banner after specified duration
  useEffect(() => {
    if (activeBanner) {
      const notification = notifications.find(n => n.id === activeBanner);
      const duration = notification?.duration || 3000;
      
      const timer = setTimeout(() => {
        setActiveBanner(null);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [activeBanner, notifications]);

  // Listen for bulk processing completion and send instant notification
  useEffect(() => {
    if (!isBulkProcessing && processedCount === totalCount && totalCount > 0) {
      // Send instant completion notification
      const notificationId = addNotification({
        type: 'success',
        title: 'Bulk Processing Complete!',
        message: `Successfully generated ${totalCount} ${bulkImageType} images. All your images are ready for download.`,
        imageCount: totalCount,
        imageType: bulkImageType || undefined,
        isBulkProcessing: true,
        duration: 5000, // Show for 5 seconds
      });
      setActiveBanner(notificationId);
    }
  }, [isBulkProcessing, processedCount, totalCount, bulkImageType, addNotification]);

  const handleTypeSelect = (type: 'blog' | 'infographic') => {
    setSelectedType(type);
    setCurrentStep('form');
    setGeneratedImage(null);
    setFormData(null);
    setError(null);
  };

  const handleTypeSwitch = (type: 'blog' | 'infographic') => {
    setSelectedType(type);
    setGeneratedImage(null);
    setFormData(null);
    setError(null);
    // Stay on form step when switching
  };

  const handleFormSubmit = async (data: any) => {
    if (!user) return;

    // Prevent single image generation during bulk processing
    if (isBulkProcessing) {
      addNotification({
        type: 'warning',
        title: 'Bulk Processing Active',
        message: 'Please wait for bulk processing to complete before generating single images.',
      });
      return;
    }

    const creditCost = CREDIT_COSTS[selectedType as keyof typeof CREDIT_COSTS];
    
    // Check if user has enough credits
    if (user.credits < creditCost) {
      addNotification({
        type: 'error',
        title: 'Insufficient Credits',
        message: `You need ${creditCost} credits to generate a ${selectedType} image. You have ${user.credits} credits remaining.`,
      });
      return;
    }

    setIsLoading(true);
    setFormData(data);
    setError(null);
    
    try {
      // Deduct credits first
      const creditsDeducted = await deductCredits(creditCost, selectedType as 'blog' | 'infographic');
      if (!creditsDeducted) {
        throw new Error('Failed to deduct credits. Please try again.');
      }

      // Sanitize the data before sending
      const sanitizedData = sanitizeFormData(data);
      
      // Prepare image detail with style and colour if provided
      let imageDetail = '';
      if (selectedType === 'blog') {
        imageDetail = `Blog post title: '${sanitizedData.title}', Content: ${sanitizedData.intro}`;
      } else {
        imageDetail = sanitizedData.content;
      }

      // Add style and colour to the image detail if specified
      if (sanitizedData.style) {
        imageDetail += `, Style: ${sanitizedData.style}`;
      }
      if (sanitizedData.colour) {
        imageDetail += `, Colour: ${sanitizedData.colour}`;
      }
      
      // Prepare payload for n8n webhook
      const payload = {
        image_type: selectedType === 'blog' ? 'Featured Image' : 'Infographic',
        image_detail: imageDetail,
      };

      console.log('Sending to webhook:', payload);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Webhook response:', result);

      if (result.image) {
        setGeneratedImage({
          base64: result.image,
          type: selectedType as 'blog' | 'infographic',
        });
        setCurrentStep('result');

        // Add success notification
        const notificationId = addNotification({
          type: 'success',
          title: 'Image Generated Successfully!',
          message: `Your ${selectedType === 'blog' ? 'blog featured image' : 'infographic'} is ready for download. ${creditCost} credits used.`,
          imageType: selectedType as 'blog' | 'infographic',
          imageCount: 1,
          duration: 5000,
        });
        setActiveBanner(notificationId);
      } else {
        throw new Error('No image data received from the server');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      let errorMessage = 'Failed to generate image. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('JSON')) {
          errorMessage = 'Invalid content format. Please check your input and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      
      // Add error notification
      addNotification({
        type: 'error',
        title: 'Image Generation Failed',
        message: errorMessage,
        imageType: selectedType as 'blog' | 'infographic',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNew = () => {
    setCurrentStep('form');
    setGeneratedImage(null);
    setError(null);
  };

  const handleBack = () => {
    if (currentStep === 'form') {
      setCurrentStep('select');
      setSelectedType(null);
      setFormData(null);
      setGeneratedImage(null);
      setError(null);
    } else if (currentStep === 'result') {
      setCurrentStep('form');
      setGeneratedImage(null);
      setError(null);
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (notification.isBulkProcessing) {
      setShowBulkModal(true);
      if (notification.imageType) {
        setSelectedType(notification.imageType);
        setCurrentStep('form');
      }
    }
  };

  const showSplitLayout = currentStep === 'form' || currentStep === 'result';

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">SEO Engine</h2>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 mr-3">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AI Image Generator</h1>
                  <p className="text-sm text-gray-600 hidden sm:block">Create stunning visuals with AI</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105"
              >
                Sign In
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto mb-8">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
              AI Image Generator
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Create stunning blog featured images and infographics with the power of AI
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="flex items-center text-gray-600">
                <Zap className="w-5 h-5 mr-2 text-blue-600" />
                Powered by SEO Engine
              </div>
              <div className="hidden sm:block w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="flex items-center text-gray-600">
                <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                Professional Quality
              </div>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg text-lg"
            >
              Get Started - 50 Free Credits
            </button>
          </div>
        </main>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-200/50">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Blog Featured Images</h3>
              <p className="text-gray-600 mb-3">
                Generate eye-catching featured images for your blog posts with custom titles and engaging visuals.
              </p>
              <div className="text-sm text-blue-600 font-semibold">5 credits per image</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-200/50">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Infographic Images</h3>
              <p className="text-gray-600 mb-3">
                Transform your data and content into visually appealing infographics that tell your story.
              </p>
              <div className="text-sm text-purple-600 font-semibold">10 credits per image</div>
            </div>
          </div>
        </section>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSignInWithEmail={signInWithEmail}
          onSignUp={signUp}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 mr-3">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Image Generator</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Create stunning visuals with AI</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center text-sm text-gray-500">
                <Zap className="w-4 h-4 mr-2" />
                Powered by <span className="font-semibold text-blue-600 ml-1">SEO Engine</span>
              </div>
              <div className="flex items-center space-x-3">
                {/* Credits Display */}
                {user && (
                  <CreditDisplay 
                    credits={user.credits} 
                    isAnonymous={user.isAnonymous}
                  />
                )}

                {/* Admin Panel Button */}
                {user?.isAdmin && (
                  <button
                    onClick={() => setShowAdminPanel(true)}
                    className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Admin Panel"
                  >
                    <Shield className="w-5 h-5" />
                  </button>
                )}

                {/* Notification Button */}
                <button
                  onClick={() => setShowNotificationSidebar(true)}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                <div className="flex items-center text-sm text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  {user?.email || `${user?.firstName} ${user?.lastName}`}
                  {user?.isAdmin && (
                    <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={signOut}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white/50 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <ProgressSteps currentStep={getStepIndex()} steps={steps} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {!showSplitLayout ? (
          // Full width for type selection
          <div className="max-w-4xl mx-auto">
            <ImageTypeSelector
              selectedType={selectedType}
              onTypeSelect={handleTypeSelect}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Image Type Switch */}
            {selectedType && (
              <ImageTypeSwitch
                currentType={selectedType}
                onSwitch={handleTypeSwitch}
                disabled={isLoading || isBulkProcessing}
              />
            )}

            {/* Split layout for form and preview */}
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 min-h-[calc(100vh-400px)]">
              {/* Left Side - Form */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="p-4 sm:p-8 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                        {selectedType === 'blog' ? 'Blog Featured Image' : 'Infographic Image'}
                      </h2>
                      <button
                        onClick={handleBack}
                        className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        ← Back
                      </button>
                    </div>
                    <p className="text-gray-600 mt-2 text-sm sm:text-base">
                      {selectedType === 'blog' 
                        ? 'Provide your blog details to generate a stunning featured image'
                        : 'Provide your content to create a visual infographic'
                      }
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-blue-600 font-semibold">
                        Cost: {CREDIT_COSTS[selectedType as keyof typeof CREDIT_COSTS]} credits
                      </div>
                      {user && user.credits < CREDIT_COSTS[selectedType as keyof typeof CREDIT_COSTS] && (
                        <div className="text-sm text-red-600 font-medium">
                          Insufficient credits
                        </div>
                      )}
                    </div>
                    {isBulkProcessing && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700 font-medium">
                          Bulk processing is active. Single image generation is disabled.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
                    {selectedType === 'blog' && (
                      <BlogImageForm
                        onSubmit={handleFormSubmit}
                        isLoading={isLoading}
                        isBulkProcessing={isBulkProcessing}
                      />
                    )}
                    
                    {selectedType === 'infographic' && (
                      <InfographicForm
                        onSubmit={handleFormSubmit}
                        isLoading={isLoading}
                        isBulkProcessing={isBulkProcessing}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side - Preview */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
                <ImagePreview
                  isLoading={isLoading}
                  generatedImage={generatedImage}
                  formData={formData}
                  imageType={selectedType}
                  onGenerateNew={handleGenerateNew}
                  onOpenBulkModal={() => setShowBulkModal(true)}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer with SEO Engine Branding */}
      <footer className="bg-white/80 backdrop-blur-xl border-t border-gray-200/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 mr-3">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SEO Engine
              </span>
            </div>
            <p className="text-gray-600 mb-2">
              Empowering content creators with AI-driven visual solutions
            </p>
            <p className="text-sm text-gray-500">
              © 2025 SEO Engine. All rights reserved. | Transforming ideas into stunning visuals.
            </p>
          </div>
        </div>
      </footer>

      {/* Notification Banner */}
      {activeBanner && (
        <NotificationBanner
          notification={notifications.find(n => n.id === activeBanner)!}
          onClose={() => setActiveBanner(null)}
          onNotificationClick={handleNotificationClick}
        />
      )}

      {/* Notification Sidebar */}
      <NotificationSidebar
        isOpen={showNotificationSidebar}
        onClose={() => setShowNotificationSidebar(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        soundEnabled={soundEnabled}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAllNotifications}
        onToggleSound={toggleSound}
        onRemoveNotification={removeNotification}
        onNotificationClick={handleNotificationClick}
      />

      {/* Admin Panel */}
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />

      {/* Bulk Processing Status - Only show when actively processing */}
      <BulkProcessingStatus
        isProcessing={isBulkProcessing}
        processedCount={processedCount}
        totalCount={totalCount}
        estimatedTimeRemaining={getEstimatedTimeRemaining()}
        onOpenBulkModal={() => setShowBulkModal(true)}
      />

      {/* Bulk Processing Modal */}
      <BulkProcessingModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        imageType={selectedType || 'blog'}
      />
    </div>
  );
}

export default App;