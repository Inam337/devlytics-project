import { memo } from 'react';

const BarCodeIcon = memo(function BarCodeIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 24, height = 24, className = '', fill = '#004B8E' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path
            d="M14.375 3.75H17.5V6.875"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.625 16.25H2.5V13.125"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.5 13.125V16.25H14.375"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2.5 6.875V3.75H5.625"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.25 6.875V13.125"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.75 6.875V13.125"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11.25 6.875V13.125"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.75 6.875V13.125"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
});

export { BarCodeIcon };
