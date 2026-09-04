import { memo } from 'react';

const AvatarIcon = memo(function AvatarIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 20, height = 20, className = '', fill = '#9CA3AF' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 75 75"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M66.6667 0H8.33333C3.72917 0 0 3.72917 0 8.33333V66.6667C0
          71.2708 3.72917 75 8.33333 75H66.6667C71.2708 75 75 71.2708
          75 66.6667V8.33333C75 3.72917 71.2708 0 66.6667 0ZM37.5
          12.5C44.5833 12.5 50 17.9167 50 25C50 32.0833 44.5833
          37.5 37.5 37.5C30.4167 37.5 25 32.0833 25 25C25 17.9167
          30.4167 12.5 37.5 12.5ZM60.4167 62.5H14.5833C13.4333
          62.5 12.5 61.5667 12.5 60.4167V58.3333C12.5 51.7875
          23.8417 45.8333 37.5 45.8333C51.1583 45.8333 62.5
          51.7875 62.5 58.3333V60.4167C62.5 61.5667 61.5667
          62.5 60.4167 62.5Z"
          fill={fill}
        />
      </svg>
    </div>
  );
});

export { AvatarIcon };
