import { memo } from 'react';

const DocumentVerifiedIcon = memo(function DocumentVerifiedIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 20, height = 20, className = '', fill = '#004B9C' } = props;

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
          d="M14.9999 4.16675L12.9883 2.15508C12.6758 1.8425 12.2519 1.66684 11.8099
          1.66675H4.99992C4.55789 1.66675 4.13397 1.84234 3.82141 2.1549C3.50885 2.46746
          3.33325 2.89139 3.33325 3.33341V16.6667C3.33325 17.1088 3.50885 17.5327 3.82141
          17.8453C4.13397 18.1578 4.55789 18.3334 4.99992 18.3334H14.9999C15.4419 18.3334
          15.8659 18.1578 16.1784 17.8453C16.491 17.5327 16.6666 17.1088 16.6666 16.6667"
          stroke={fill}
          strokeWidth="1.66667"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.8151 10.5218C18.147 10.1898 18.3335 9.73959 18.3335 9.27012C18.3335 8.80066
          18.147 8.35042 17.8151 8.01846C17.4831 7.68649 17.0329 7.5 16.5634 7.5C16.0939 7.5
          15.6437 7.68649 15.3117 8.01846L11.9701 11.3618C11.7719 11.5598 11.6269 11.8046
          11.5484 12.0735L10.8509 14.4651C10.83 14.5368 10.8287 14.6128 10.8473 14.6852C10.8658
          14.7576 10.9035 14.8236 10.9563 14.8764C11.0091 14.9292 11.0751 14.9669 11.1475
          14.9854C11.2198 15.004 11.2959 15.0027 11.3676 14.9818L13.7592 14.2843C14.0281
          14.2058 14.2729 14.0608 14.4709 13.8626L17.8151 10.5218Z"
          stroke={fill}
          strokeWidth="1.66667"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.66675 15H7.50008"
          stroke={fill}
          strokeWidth="1.66667"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

export { DocumentVerifiedIcon };
