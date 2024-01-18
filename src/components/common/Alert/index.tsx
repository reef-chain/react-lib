import React from 'react';

export const DangerAlert: React.FC<React.PropsWithChildren<{}>> = ({ children }): JSX.Element => (
  <div className="alert alert-danger mt-2 border-rad" role="alert">
    {children}
  </div>
);
