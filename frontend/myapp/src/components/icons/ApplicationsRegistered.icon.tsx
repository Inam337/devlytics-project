import { memo } from 'react';

const ApplicationsRegisteredIcon = memo(function ApplicationsRegisteredIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 24, height = 24, className = '', fill = '' } = props;

  return (
    <div className={className}>

      <svg
        width={width}
        height={height}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_1487_21435)">
          <path
            d="M25 28H7C6.73478 28 6.48043 27.8946 6.29289 27.7071C6.10536 27.5196
              6 27.2652 6 27V5C6 4.73478 6.10536 4.48043 6.29289 4.29289C6.48043
              4.10536 6.73478 4 7 4H19L26 11V27C26 27.2652 25.8946 27.5196 25.7071
              27.7071C25.5196 27.8946 25.2652 28 25 28Z"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 19L15 22L20 17"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19 4V11H26"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
});

export { ApplicationsRegisteredIcon };
