import { memo } from 'react';

const InfoIcon = memo(function InfoIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 20, height = 20, className = '', fill = '#F59E0B' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_86_26260)">
          <path
            d="M10.0003 18.3333C14.6027 18.3333 18.3337 14.6024 18.3337 9.99999C18.3337
            5.39762 14.6027 1.66666 10.0003 1.66666C5.39795 1.66666 1.66699 5.39762 1.66699
            9.99999C1.66699 14.6024 5.39795 18.3333 10.0003 18.3333Z"
            stroke={fill}
            strokeWidth="1.66667"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 6.66666V9.99999"
            stroke={fill}
            strokeWidth="1.66667"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 13.3333H10.0083"
            stroke={fill}
            strokeWidth="1.66667"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
});

export { InfoIcon };
