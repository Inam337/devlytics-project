import { memo } from 'react';

const RefundsIcon = memo(function RefundsIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 32, height = 32, className = '', fill = '#111928' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path
            d="M3 7V13H9"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.44875 24.0001C10.0211 25.484 11.9959 26.4717 14.1263 26.8397C16.2568
            27.2077 18.4484 26.9398 20.4275 26.0693C22.4065 25.1989 24.0851 23.7645
            25.2537 21.9455C26.4222 20.1265 27.0287 18.0034 26.9976 15.8417C26.9664
            13.6799 26.2989 11.5752 25.0784 9.79064C23.8579 8.00607 22.1386 6.62071
            20.1353 5.80768C18.132 4.99465 15.9335 4.78998 13.8146 5.21927C11.6956
            5.64855 9.75016 6.69274 8.22125 8.22137L3 13.0001"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16.3333 8.94043V10.9404"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16.3333 20.9404V22.9404"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.3333 20.9404H17.8333C18.4963 20.9404 19.1322 20.677 19.601
            20.2082C20.0699 19.7394 20.3333 19.1035 20.3333 18.4404C20.3333
            17.7774 20.0699 17.1415 19.601 16.6727C19.1322 16.2038 18.4963
            15.9404 17.8333 15.9404H14.8333C14.1702 15.9404 13.5343 15.677
            13.0655 15.2082C12.5966 14.7394 12.3333 14.1035 12.3333 13.4404C12.3333
            12.7774 12.5966 12.1415 13.0655 11.6727C13.5343 11.2038 14.1702
            10.9404 14.8333 10.9404H19.3333"
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

export { RefundsIcon };
