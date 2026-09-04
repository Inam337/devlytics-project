import { memo } from 'react';

const DocumentCheckedIcon = memo(function DocumentCheckedIcon(props: {
  width?: number;
  height?: number;
  className?: string;
}) {
  const { width = 20, height = 20, className = '' } = props;

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
          d="M12.4999 1.66669H4.99992C4.55789 1.66669 4.13397 1.84228 3.82141
          2.15484C3.50885 2.4674 3.33325 2.89133 3.33325 3.33335V16.6667C3.33325
          17.1087 3.50885 17.5326 3.82141 17.8452C4.13397 18.1578 4.55789 18.3334
          4.99992 18.3334H14.9999C15.4419 18.3334 15.8659 18.1578 16.1784 17.8452C16.491
          17.5326 16.6666 17.1087 16.6666 16.6667V5.83335L12.4999 1.66669Z"
          stroke="#004B9C"
          strokeWidth="1.66667"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.6667 1.66669V5.00002C11.6667 5.44205 11.8423 5.86597 12.1549
          6.17853C12.4675 6.49109 12.8914 6.66669 13.3334 6.66669H16.6667"
          stroke="#004B9C"
          strokeWidth="1.66667"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 12.5L9.16667 14.1666L12.5 10.8333"
          stroke="#004B9C"
          strokeWidth="1.66667"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

    </div>
  );
});

export { DocumentCheckedIcon };
