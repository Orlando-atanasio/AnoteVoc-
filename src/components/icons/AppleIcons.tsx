import React from 'react';

export const AppleFolderIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2.5 7C2.5 5.61929 3.61929 4.5 5 4.5H9.17157C9.83464 4.5 10.4706 4.76339 10.9393 5.23223L12.2678 6.56066C12.7366 7.0295 13.3725 7.29289 14.0356 7.29289H19C20.3807 7.29289 21.5 8.41218 21.5 9.79289V17.5C21.5 18.8807 20.3807 20 19 20H5C3.61929 20 2.5 18.8807 2.5 17.5V7Z"
      fill="#E49F13"
      stroke="#D97706"
      strokeWidth="1.2"
    />
  </svg>
);

export const AppleNewFolderIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3 7C3 5.89543 3.89543 5 5 5H9.17157C9.70201 5 10.2107 5.21071 10.5858 5.58579L11.9142 6.91421C12.2893 7.28929 12.798 7.5 13.3284 7.5H19C20.1046 7.5 21 8.39543 21 9.5V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"
      stroke="#D97706"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="17.5" cy="8.5" r="3.5" fill="#E49F13" />
    <path d="M17.5 7V10M16 8.5H19" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const AppleNewNoteIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="#D97706" strokeWidth="1.8" />
    <path
      d="M14.5 6.5L17.5 9.5M8 16H10.5L17 9.5C17.5523 8.94772 17.5523 8.05228 17 7.5L16.5 7C15.9477 6.44772 15.0523 6.44772 14.5 7L8 13.5V16Z"
      stroke="#D97706"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AppleMoreCircleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="#D97706" strokeWidth="1.8" />
    <circle cx="8" cy="12" r="1.2" fill="#D97706" />
    <circle cx="12" cy="12" r="1.2" fill="#D97706" />
    <circle cx="16" cy="12" r="1.2" fill="#D97706" />
  </svg>
);

export const AppleShareIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 3V14M12 3L7.5 7.5M12 3L16.5 7.5"
      stroke="#D97706"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 11V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V11"
      stroke="#D97706"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const ApplePinIcon: React.FC<{ className?: string; fill?: string }> = ({ className = "w-5 h-5", fill = "white" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M16.5 3.5L20.5 7.5L18.5 9.5L17.5 9L15 11.5V15L12 18L10 14L6 18L5 17L9 13L5 11L8 8H11.5L14 5.5L13.5 4.5L15.5 2.5L16.5 3.5Z"
      fill={fill}
    />
  </svg>
);

export const AppleScanIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M4 8V5C4 4.44772 4.44772 4 5 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 4H19C19.5523 4 20 4.44772 20 5V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 16V19C20 19.5523 19.5523 20 19 20H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 20H5C4.44772 20 4 19.5523 4 19V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const ApplePencilMarkupIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="#D97706" strokeWidth="1.8" />
    <path
      d="M8.5 15.5L14.5 9.5M9.5 16.5L15.5 10.5M15.5 8.5L14 7L8 13V16H11L17 10L15.5 8.5Z"
      stroke="#D97706"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
