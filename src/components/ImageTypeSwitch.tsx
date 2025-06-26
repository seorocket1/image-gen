import React from 'react';
import { FileText, Image, ArrowRight } from 'lucide-react';

interface ImageTypeSwitchProps {
  currentType: 'blog' | 'infographic';
  onSwitch: (type: 'blog' | 'infographic') => void;
  disabled?: boolean;
}

export const ImageTypeSwitch: React.FC<ImageTypeSwitchProps> = ({
  currentType,
  onSwitch,
  disabled = false,
}) => {
  const otherType = currentType === 'blog' ? 'infographic' : 'blog';
  
  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg mr-3 ${
            currentType === 'blog' 
              ? 'bg-blue-100 text-blue-600' 
              : 'bg-purple-100 text-purple-600'
          }`}>
            {currentType === 'blog' ? (
              <FileText className="w-4 h-4" />
            ) : (
              <Image className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              Currently: {currentType === 'blog' ? 'Blog Featured Image' : 'Infographic Image'}
            </p>
            <p className="text-xs text-gray-500">
              {disabled 
                ? 'Cannot switch during bulk processing'
                : `Switch to create ${otherType === 'blog' ? 'blog featured images' : 'infographic images'}`
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={() => onSwitch(otherType)}
          disabled={disabled}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : otherType === 'blog'
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:scale-105'
              : 'bg-purple-100 text-purple-700 hover:bg-purple-200 hover:scale-105'
          }`}
        >
          <div className={`flex items-center justify-center w-5 h-5 rounded mr-2 ${
            disabled 
              ? 'bg-gray-200'
              : otherType === 'blog' ? 'bg-blue-200' : 'bg-purple-200'
          }`}>
            {otherType === 'blog' ? (
              <FileText className="w-3 h-3" />
            ) : (
              <Image className="w-3 h-3" />
            )}
          </div>
          Switch to {otherType === 'blog' ? 'Blog' : 'Infographic'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};