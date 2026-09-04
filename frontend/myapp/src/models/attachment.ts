export type FileUploadAttachment = {
  id: string;
  title: string;
  file: File;
};

export type FileUploadAccept = Record<string, string[]>;

export type FileUploadProps = {
  onAttachmentsSelected: (attachments: FileUploadAttachment[]) => void;
  accept?: string | FileUploadAccept;
  maxSize?: number;
  disabled?: boolean;
};

export const AttachmentConfig = {
  accept: {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
  } satisfies FileUploadAccept,
  maxSizeInBytes: 10 * 1024 * 1024,
  supportedTypes: 'PDF, DOC, DOCX, JPG, PNG',
};
