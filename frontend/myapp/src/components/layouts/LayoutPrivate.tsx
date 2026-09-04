import React from 'react';

interface LayoutPrivateProps {
  children: React.ReactNode;
}

export default function LayoutPrivate({ children }: LayoutPrivateProps) {
  return (
    <div className="p-5">
      {children}
    </div>
  );
}
