import { memo } from 'react';

const CloseIcon = memo(function CloseIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 24, height = 24, className = '', fill = '#10B981' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13.1996 12L22.3496 2.85C22.6871 2.5125 22.6871 1.9875 22.3496
          1.65C22.0121 1.3125 21.4871 1.3125 21.1496 1.65L11.9996 10.8L2.84961
          1.65C2.51211 1.3125 1.98711 1.3125 1.64961 1.65C1.31211 1.9875 1.31211
          2.5125 1.64961 2.85L10.7996 12L1.64961 21.15C1.31211 21.4875 1.31211
          22.0125 1.64961 22.35C1.79961 22.5 2.02461 22.6125 2.24961 22.6125C2.47461
          22.6125 2.69961 22.5375 2.84961 22.35L11.9996 13.2L21.1496 22.35C21.2996
          22.5 21.5246 22.6125 21.7496 22.6125C21.9746 22.6125 22.1996 22.5375
          22.3496 22.35C22.6871 22.0125 22.6871 21.4875 22.3496 21.15L13.1996 12Z"
          fill={fill}
        />
      </svg>

    </div>
  );
});

export { CloseIcon };
