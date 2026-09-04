import { memo } from 'react';

const MenuIcon = memo(function MenuIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 24, height = 24, className = '', fill = '#6F767E' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 33 33"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_4613_22910)">
          <path
            d="M27.3828 15.4219C27.9351 15.4219 28.3828 15.8696 28.3828
            16.4219C28.3828 16.9742 27.9351 17.4219 27.3828
            17.4219H5.38281C4.83053 17.4219 4.38281
            16.9742 4.38281 16.4219C4.38281 15.8696 4.83053
            15.4219 5.38281 15.4219H27.3828Z"
            fill={fill}
          />
          <path
            d="M27.3828 7.42188C27.9351 7.42188 28.3828 7.86959
            28.3828 8.42188C28.3828 8.97416 27.9351 9.42188
            27.3828 9.42188H5.38281C4.83053 9.42188 4.38281
            8.97416 4.38281 8.42188C4.38281 7.86959 4.83053
            7.42188 5.38281 7.42188H27.3828Z"
            fill={fill}
          />
          <path
            d="M27.3828 23.4219C27.9351 23.4219 28.3828 23.8696
            28.3828 24.4219C28.3828 24.9742 27.9351 25.4219
            27.3828 25.4219H5.38281C4.83053 25.4219 4.38281
            24.9742 4.38281 24.4219C4.38281 23.8696 4.83053
            23.4219 5.38281 23.4219H27.3828Z"
            fill={fill}
          />
        </g>
      </svg>
    </div>
  );
});

export { MenuIcon };
