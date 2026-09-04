import { memo } from 'react';

const CheckTickIcon = memo(function CheckTickIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 10, height = 7, className = '', fill = '#FFFFFF' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 10 7"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.82764 0.341309C8.98599 0.177324 9.22922 0.155838 9.40869 0.278809L9.48096
          0.340332L9.48682 0.346191L9.4917 0.352051C9.64134 0.533081 9.64252 0.816059
          9.44873 0.998535L9.44971 0.999512L4.11377 6.35596L4.11475 6.35693C3.9602
          6.51694 3.76245 6.60006 3.54736 6.6001C3.34944 6.6001 3.1354 6.5189
          2.979 6.35693V6.35596L0.334473 3.69385L0.33252 3.69189C0.155615 3.50842 0.155502
          3.21906 0.33252 3.03564C0.512808 2.84894 0.802758 2.84842 0.983887 3.03369L3.56201
          5.62939L8.82764 0.341309Z"
          fill={fill}
          stroke={fill}
          strokeWidth="0.4"
        />
      </svg>
    </div>
  );
});

export { CheckTickIcon };
