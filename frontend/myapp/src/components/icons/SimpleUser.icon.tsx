import { memo } from 'react';

const SimpleUserIcon = memo(function SimpleUserIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 24, height = 24, className = '', fill = '#111827' } = props;

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
          d="M12 10.5C9.1875 10.5 6.9375 8.28749 6.9375 5.58749C6.9375 2.88749
          9.1875 0.674988 12 0.674988C14.8125 0.674988 17.0625 2.88749 17.0625
          5.58749C17.0625 8.28749 14.8125 10.5 12 10.5ZM12 2.36249C10.125 2.36249
          8.625 3.82499 8.625 5.58749C8.625 7.34999 10.125 8.81249 12 8.81249
          C13.875 8.81249 15.375 7.34999 15.375 5.58749C15.375 3.82499 13.875
          2.36249 12 2.36249Z"
          fill={fill}
        />
        <path
          d="M9.93652 12.4625H14.0996C17.4982 12.4627 20.2743 15.2387 20.2744
          18.6373V21.9947C20.2452 22.4625 19.8442 22.8629 19.3867 22.8629H4.61133
          C4.13765 22.8627 3.76172 22.486 3.76172 22.0123V18.6373C3.76183 15.2386
          6.53782 12.4626 9.93652 12.4625ZM9.89941 13.15C6.88584 13.15 4.41222
          15.6237 4.41211 18.6373V22.1754H19.5869V18.6373C19.5868 15.6239 17.113
          13.1502 14.0996 13.15H9.89941Z"
          fill={fill}
          stroke={fill}
        />
      </svg>
    </div>
  );
});

export { SimpleUserIcon };
