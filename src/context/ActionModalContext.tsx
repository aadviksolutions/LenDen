'use client';

import React, { createContext, useContext, useState } from 'react';
import { ActionModal } from '@/components/shared/ActionModal';

export type ActionMetadata = Record<string, unknown> | object | null | undefined;

interface ActionModalContextType {
  openAction: (type: string, meta?: ActionMetadata) => void;
  closeAction: () => void;
}

const ActionModalContext = createContext<ActionModalContextType>({
  openAction: () => {},
  closeAction: () => {},
});

export function ActionModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [actionType, setActionType] = useState<string | null>(null);
  const [meta, setMeta] = useState<ActionMetadata>(null);

  const openAction = (type: string, metadata?: ActionMetadata) => {
    setActionType(type);
    setMeta(metadata || null);
  };

  const closeAction = () => {
    setActionType(null);
    setMeta(null);
  };

  return (
    <ActionModalContext.Provider value={{ openAction, closeAction }}>
      {children}
      <ActionModal
        isOpen={!!actionType}
        onClose={closeAction}
        actionType={actionType}
        metaData={meta}
      />
    </ActionModalContext.Provider>
  );
}

export function useActionModal() {
  return useContext(ActionModalContext);
}
