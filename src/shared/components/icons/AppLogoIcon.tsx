import { SVGProps } from 'react';

export function AppLogoIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            width="32"
            height="32"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <circle cx="24" cy="24" r="20" fill="var(--color-primary)" />
            <path
                d="M16 24L22 30L32 18"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
