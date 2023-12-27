import React from 'react';
import { Title } from '../Text';

interface Modal extends React.PropsWithChildren {
  id?: string;
}

export const Modal: React.FC<Modal> = ({
  children,
  id = 'modal',
}): JSX.Element => (
  <div
    className="modal fade"
    id={id}
    tabIndex={-1}
    aria-labelledby={id}
    aria-hidden="true"
  >
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content border-rad">{children}</div>
    </div>
  </div>
);

export const ModalHeader: React.FC<React.PropsWithChildren> = ({ children }): JSX.Element => (
  <div className="modal-header border-0">{children}</div>
);

export const ModalBody: React.FC<React.PropsWithChildren> = ({ children }): JSX.Element => (
  <div className="modal-body py-0">{children}</div>
);

export const ModalFooter: React.FC<React.PropsWithChildren> = ({ children }): JSX.Element => (
  <div className="modal-footer bg-white border-0 border-rad">{children}</div>
);

interface ModalClose extends React.PropsWithChildren {
  onClick?: () => void;
  className?: string;
}

export const ModalClose: React.FC<ModalClose> = ({
  children,
  onClick = () => {},
  className,
}): JSX.Element => (
  <button
    type="button"
    className={className || 'btn-close'}
    onClick={onClick}
    data-bs-dismiss="modal"
    aria-label="Close"
  >
    {children}
  </button>
);

interface OpenModalButton extends React.PropsWithChildren {
  id?: string;
  disabled?: boolean;
  className?: string;
}

export const OpenModalButton: React.FC<OpenModalButton> = ({
  children,
  id = 'open-modal-button',
  disabled,
  className,
}): JSX.Element => (
  <button
    type="button"
    disabled={disabled}
    data-bs-toggle="modal"
    data-bs-target={`#${id}`}
    className={className || 'btn btn-reef btn-lg border-rad w-100'}
  >
    <span>{children}</span>
  </button>
);

interface ConfirmationModal extends React.PropsWithChildren {
  id?: string;
  title: string;
  confirmFun: () => void;
  confirmBtnLabel?: string;
}

const ConfirmationModal: React.FC<ConfirmationModal> = ({
  id = 'exampleModal',
  title,
  confirmFun,
  confirmBtnLabel = 'Confirm',
  children,
}): JSX.Element => (
  <Modal id={id}>
    <ModalHeader>
      <Title>{title}</Title>
      <ModalClose />
    </ModalHeader>
    <ModalBody>{children}</ModalBody>
    <ModalFooter>
      <ModalClose onClick={confirmFun} className="btn btn-reef border-rad">
        <span>{confirmBtnLabel}</span>
      </ModalClose>
    </ModalFooter>
  </Modal>
);

export default ConfirmationModal;
