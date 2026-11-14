import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
};

export function Button({ variant = 'primary', className, children, icon, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        variant === 'primary' ? 'primary-button' : 'secondary-button',
        className,
      )}
      {...props}
    >
      {icon ? <span className="mr-2">{icon}</span> : null}
      {children}
    </button>
  );
}
