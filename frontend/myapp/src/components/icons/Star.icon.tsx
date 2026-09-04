import { memo } from 'react';

const StarIcon = memo(function SuspendIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 16, height = 16, className = '', fill = '#FBBF24' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_785_21754)">
          <path
            d="M14.925 5.975L10.4 5.275L8.35002 0.975C8.20002 0.675 7.80002 0.675
            7.65002 0.975L5.60002 5.3L1.10002 5.975C0.775021 6.025 0.650021
            6.45 0.900021 6.675L4.17502 10.05L3.40002 14.775C3.35002
            15.1 3.67502 15.375 3.97502 15.175L8.05002 12.95L12.1
            15.175C12.375 15.325 12.725 15.075 12.65 14.775L11.875
            10.05L15.15 6.675C15.35 6.45 15.25 6.025 14.925 5.975Z"
            fill={fill}
          />
        </g>
      </svg>
    </div>
  );
});

export { StarIcon };
