import React from 'react';

export const Label: React.FC<React.PropsWithChildren> = ({ children }) => (
  <label>{children}</label>
);

interface ConfirmLabel {
  title: string;
  value: string;
  titleSize?: string;
  valueSize?: string;
}

export const ConfirmLabel = ({
  title,
  value,
  titleSize = 'sub-text',
  valueSize = 'sub-text',
}: ConfirmLabel): JSX.Element => (
  <div className="d-flex justify-content-between my-1">
    <span className={`text-muted my-auto ${titleSize}`}>{title}</span>
    <span className={`${valueSize} my-auto`}>{value}</span>
  </div>
);

export const FormLabel: React.FC<React.PropsWithChildren> = ({ children }): JSX.Element => (
  <label className="form-label text-muted sub-text d-flex flex-row">
    {children}
  </label>
);

export const TransactionWarningLabel: React.FC<React.PropsWithChildren> = ({
  children,
}): JSX.Element => (
  <span className="text-warn sub-text mx-auto">{children}</span>
);
