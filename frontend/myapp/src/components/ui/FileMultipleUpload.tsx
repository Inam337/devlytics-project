import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

import { Button } from '@/components/ui/Button';
import { cn } from '@/libs/utils';
import type { FileUploadProps } from '@/models/attachment';

export function FileUploadMultiple({ onAttachmentsSelected }: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Convert files to attachments with auto-generated titles
      const attachments = acceptedFiles.map((file, index) => ({
        id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        title: `Attachment ${index + 1}`,
        file,
      }));

      onAttachmentsSelected(attachments);
    },
    [onAttachmentsSelected],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed border-green-600 rounded-lg p-4 cursor-pointer transition-all',
        isDragActive ? 'bg-green-200 border-green-600' : 'bg-white hover:bg-green-50',
      )}
    >
      <input {...getInputProps()} />
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-gray-800 font-semibold text-base mb-1">
              Upload documents (If any) or Drag and drop file
            </h3>
            <p className="text-gray-500 text-sm">
              Supported file types: PDF, DOC, DOCX, JPG, PNG
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            Browse Files
          </Button>
        </div>
      </div>
    </div>
  );
}
