
import React from 'react';
import ConfirmationModal, { ConfirmationType } from './ConfirmationModal';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  loading?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar Exclusão',
  message = 'Tem certeza que deseja apagar este conteúdo? Esta ação não pode ser desfeita.',
  loading = false
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmText="Excluir"
      type={ConfirmationType.DANGER}
      loading={loading}
    />
  );
};

export default DeleteConfirmModal;
