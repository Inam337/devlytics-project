import { Toaster } from 'react-hot-toast';

import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';

export function ToastNotifier() {
  return (
    <>
      <Toaster
        position="top-right"
        containerStyle={{
          zIndex: 9999,
          fontSize: '12px',
          fontWeight: '600',
          color: '#000000',
          lineHeight: '1.6',
          whiteSpace: 'pre-line',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
        }}
        toastOptions={{
          duration: 4000,
          className: 'custom-toast',
          style: {
            background: '#fff',
            color: '#333',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '10px',
            textAlign: 'left',
            zIndex: 9999,
            maxWidth: '400px',
          },
          success: {
            icon: (
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <RbIcon
                  name="fileTick"
                  size={20}
                  color={IconColors.GREEN_COLOR_ICON}
                />
              </div>
            ),
            style: {
              background: '#fff',
              color: '#333',
              border: '1px solid #10B981',
            },
            className: 'custom-toast-success',
          },
          error: {
            icon: (
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100">
                <RbIcon
                  name="warning"
                  size={20}
                  color={IconColors.RED_COLOR_ICON}
                />
              </div>
            ),
            style: {
              background: '#fff',
              color: '#333',
              border: '1px solid #F23030',
            },
            className: 'custom-toast-error',
          },
          // Custom toast type for network/server errors (warning)
          loading: {
            icon: (
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-100">
                <RbIcon
                  name="world"
                  size={20}
                  color={IconColors.ORANGE_COLOR_ICON}
                />
              </div>
            ),
            style: {
              background: '#fff',
              color: '#333',
              border: '1px solid #FFA500',
            },
            className: 'custom-toast-loading',
          },
        }}
      />
      <style>
        {`
          /* Custom toast styling to match design - white box with rounded corners */
          .custom-toast {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            padding: 12px !important;
          }
          
          /* Icon container - light blue square with rounded corners (40x40px) */
          /* Target the icon wrapper that react-hot-toast creates */
          .custom-toast > div:first-child,
          .custom-toast [class*="icon"] {
            flex-shrink: 0 !important;
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            min-height: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 8px !important;
            background-color: #DBEAFE !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Ensure the icon wrapper div inside has the background */
          .custom-toast > div:first-child > div {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 8px !important;
            background-color: inherit !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Success icon container - light green background */
          .custom-toast-success > div:first-child,
          .custom-toast-success [class*="icon"] {
            background-color: #D1FAE5 !important;
          }
          
          /* Error icon container - light red background */
          .custom-toast-error > div:first-child,
          .custom-toast-error [class*="icon"] {
            background-color: #FEE2E2 !important;
          }
          
          /* Network/Server error icon container - light yellow background */
          .custom-toast-loading > div:first-child,
          .custom-toast-loading [class*="icon"] {
            background-color: #FEF3C7 !important;
          }
          
          /* Info toast icon container - light blue background */
          .custom-toast-info > div:first-child,
          .custom-toast-info [class*="icon"] {
            background-color: #DBEAFE !important;
          }
          
          /* Info toast border - blue */
          .custom-toast-info {
            border: 1px solid #103F91 !important;
          }
          
          /* Success toast border - green */
          .custom-toast-success {
            border: 1px solid #10B981 !important;
          }
          
          /* Error toast border - red */
          .custom-toast-error {
            border: 1px solid #F23030 !important;
          }
          
          /* Info message - blue text */
          .custom-toast-info > div:last-child > div:first-child,
          .custom-toast-info [class*="message"] > div:first-child {
            color: #103F91 !important;
          }
          
          /* Message content area */
          .custom-toast > div:last-child,
          .custom-toast [class*="message"],
          .custom-toast [class*="content"] {
            flex: 1 1 auto !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
            min-width: 0 !important;
            text-align: left !important;
            align-self: center !important;
          }
          
          /* Primary message - bold black text (12px, font-weight 600) */
          .custom-toast > div:last-child > div:first-child,
          .custom-toast [class*="message"] > div:first-child {
            font-weight: 600 !important;
            font-size: 12px !important;
            color: #000000 !important;
            line-height: 1.6 !important;
            white-space: pre-line !important;
          }
          
          /* Error message - black text */
          .custom-toast-error > div:last-child > div:first-child,
          .custom-toast-error [class*="message"] > div:first-child {
            color: #000000 !important;
          }
          
          /* Network/Server error - black text */
          .custom-toast-loading > div:last-child > div:first-child,
          .custom-toast-loading [class*="message"] > div:first-child {
            color: #000000 !important;
          }
          
          /* Info message - black text */
          .custom-toast-info > div:last-child > div:first-child,
          .custom-toast-info [class*="message"] > div:first-child {
            color: #000000 !important;
          }
          
          /* Close button styling */
          .custom-toast button[aria-label],
          .custom-toast button[title="Close"] {
            opacity: 0.5 !important;
            transition: opacity 0.2s !important;
            margin-left: auto !important;
            flex-shrink: 0 !important;
          }
          
          .custom-toast button[aria-label]:hover,
          .custom-toast button[title="Close"]:hover {
            opacity: 1 !important;
          }
        `}
      </style>
    </>
  );
}
