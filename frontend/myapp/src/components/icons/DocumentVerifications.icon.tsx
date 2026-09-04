import { memo } from 'react';

const DocumentVerificationsIcon = memo(function DocumentVerificationsIcon(props: {
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
        <g clipPath="url(#clip0_1487_21433)">
          <path
            d="M15 28H25C25.2652 28 25.5196 27.8946 25.7071 27.7071C25.8946 27.5196
            26 27.2652 26 27V11L19 4H7C6.73478 4 6.48043 4.10536 6.29289
            4.29289C6.10536 4.48043 6 4.73478 6 5V14"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.09746 18.6272C6.04867 18.5735 6.0165 18.5068 6.00486 18.4352C5.99322
            18.3635 6.0026 18.2901 6.03188 18.2237C6.06115 18.1573 6.10906 18.1008
            6.16979 18.0611C6.23052 18.0214 6.30147 18.0002 6.37403 18H14.624C14.6967
            18 14.7677 18.0211 14.8286 18.0607C14.8895 18.1004 14.9375 18.1568 14.9669
            18.2233C14.9963 18.2897 15.0058 18.3632 14.9942 18.4349C14.9826 18.5066
            14.9504 18.5734 14.9015 18.6272L11.624 22.125V24.8742C11.6241 24.936
            11.6089 24.9968 11.5797 25.0512C11.5506 25.1057 11.5085 25.1521
            11.4572 25.1864L9.95715 26.1862C9.90073 26.2239 9.83515 26.2455
            9.76741 26.2489C9.69966 26.2522 9.63228 26.2371 9.57245
            26.2051C9.51261 26.1732 9.46255 26.1256 9.42761 26.0675C9.39267
            26.0094 9.37415 25.9428 9.37403 25.875V22.125L6.09746 18.6272Z"
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

export { DocumentVerificationsIcon };
