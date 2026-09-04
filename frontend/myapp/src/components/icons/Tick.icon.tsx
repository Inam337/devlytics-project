import { memo } from 'react';

const TickIcon = memo(function TickIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 24, height = 24, className = '', fill = '#111928' } = props;

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
          d="M22.7244 5.02501C22.3869 4.68751 21.8619 4.68751 21.5244
        5.02501L8.77443 17.4L2.47443 11.2125C2.13693 10.875 1.61193 10.9125
        1.27443 11.2125C0.936925 11.55 0.974425 12.075 1.27443 12.4125L7.91193
        18.8625C8.13693 19.0875 8.43693 19.2 8.77443 19.2C9.11193 19.2 9.37443
        19.0875 9.63693 18.8625L22.7244 6.15001C23.0619 5.88751 23.0619 5.36251
        22.7244 5.02501Z"
          fill={fill}
        />
      </svg>
    </div>
  );
});

export { TickIcon };
