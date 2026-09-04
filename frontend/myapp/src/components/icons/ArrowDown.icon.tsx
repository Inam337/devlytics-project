import { memo } from 'react';

const ArrowDownIcon = memo(function ArrowDownIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 20, height = 20, className = '', fill = '#111827' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M17.041 6.29102C17.1162 6.21588 17.2179
          6.20652 17.2998 6.2627L17.334 6.29102C17.4198
          6.37684 17.4195 6.49705 17.334 6.58301L10.1494
          13.6436L10.1465 13.6465C10.0901 13.7029 10.0518
          13.7285 10.0293 13.7402C10.0117 13.7494 10.0051
          13.75 10 13.75C9.94665 13.75 9.90044 13.7383
          9.82422 13.6797L2.66504 6.64551C2.5908 6.57047
          2.58177 6.46921 2.6377 6.3877L2.66602 6.35352C2.74115
          6.27838 2.84294 6.26902 2.9248 6.3252L2.95898
          6.35352L2.96289 6.35742L9.65039 12.8887L10.002
          13.2314L10.3506 12.8877L17.0381 6.29395L17.041 6.29102Z"
          fill="#111928"
          stroke={fill}
        />
      </svg>
    </div>
  );
});

export { ArrowDownIcon };
