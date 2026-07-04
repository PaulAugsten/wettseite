import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50';

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    outline:
        'border border-edge text-fg-muted hover:border-edge-strong hover:bg-white/5 hover:text-fg',
    ghost: 'text-fg-muted hover:bg-white/5 hover:text-fg',
    danger: 'text-danger-fg hover:bg-danger/10',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4.5 py-2 text-[0.95rem]',
};

type StyleProps = {
    variant?: ButtonVariant;
    size?: ButtonSize;
};

type LinkButtonProps = StyleProps &
    Omit<ComponentPropsWithoutRef<typeof Link>, 'onClick' | 'onMouseEnter' | 'onTouchStart'>;
type NativeButtonProps = StyleProps & {
    href?: undefined;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export type ButtonProps = LinkButtonProps | NativeButtonProps;

/**
 * Renders a Next.js <Link> when `href` is given, otherwise a native <button>.
 */
export function Button(props: ButtonProps) {
    const { variant = 'primary', size = 'md', className, ...rest } = props;
    const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

    if (rest.href !== undefined) {
        return <Link {...rest} className={classes} />;
    }

    const { href, type, ...buttonProps } = rest;
    void href;
    return <button type={type ?? 'button'} {...buttonProps} className={classes} />;
}
