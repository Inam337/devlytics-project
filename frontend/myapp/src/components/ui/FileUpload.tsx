import { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { cn } from '@/libs/utils';
import { AttachmentConfig, type FileUploadProps } from '@/models/attachment';

export function FileUpload({
  onAttachmentsSelected,
  accept = AttachmentConfig.accept,
  maxSize = AttachmentConfig.maxSizeInBytes,
  disabled = false,
}: FileUploadProps) {
  const { t } = useTranslation();
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file, errors }) => {
          errors.forEach((error) => {
            if (error.code === 'file-too-large') {
              const maxSizeMB = Math.round(maxSize / 1024 / 1024);

              toast.error(
                `File "${file.name}" is too large. Maximum size is ${maxSizeMB}MB`,
              );
            } else if (error.code === 'file-invalid-type') {
              const allowedTypes = AttachmentConfig.supportedTypes;

              toast.error(
                `File "${file.name}" has an invalid type. Allowed types: ${allowedTypes}`,
              );
            } else {
              toast.error(
                `Error uploading "${file.name}": ${error.message}`,
              );
            }
          });
        });
      }

      // Handle accepted files
      if (acceptedFiles.length > 0 && onAttachmentsSelected) {
        // Convert files to attachments with auto-generated titles
        const attachments = acceptedFiles.map((file, index) => ({
          id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          title: file.name || `Attachment ${index + 1}`,
          file,
        }));

        onAttachmentsSelected(attachments);
        toast.success(`${acceptedFiles.length} file(s) uploaded successfully`);
      }
    },
    [onAttachmentsSelected, maxSize],
  );
  const acceptObject = typeof accept === 'string'
    ? accept.split(',').reduce<Record<string, string[]>>(
        (acc, mimeType) => {
          const trimmed = mimeType.trim();

          if (trimmed) {
            acc[trimmed] = [];
          }

          return acc;
        },
        {},
      )
    : accept;
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: acceptObject,
    maxSize,
    disabled,
    multiple: true,
    noClick: false,
    noKeyboard: false,
  });
  const handleBrowseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    open();
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed border-primary rounded-lg p-4 cursor-pointer transition-all',
        isDragActive
          ? 'bg-primary/20 border-primary'
          : 'bg-white hover:bg-primary/5',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <input {...getInputProps()} />
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-gray-800 font-semibold text-base mb-1">
              {t('common.text.uploadDocuments', 'Upload documents (If any) or Drag and drop file')}
            </h3>
            <p className="text-gray-500 text-sm">
              {t('common.text.supportedFileTypes', 'Supported file types:')}
              {' '}
              {AttachmentConfig.supportedTypes}
              {' '}
              (Max:
              {' '}
              {Math.round(maxSize / 1024 / 1024)}
              MB)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
            disabled={disabled}
            onClick={handleBrowseClick}
          >
            {t('common.text.upload', 'Upload')}
          </Button>
        </div>
      </div>
    </div>
  );
}
