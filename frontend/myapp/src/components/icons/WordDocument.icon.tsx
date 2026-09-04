import { memo } from 'react';

const WordDocumentIcon = memo(function WordDocumentIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 100, height = 100, className = '' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M83.3327 93.75H16.666V6.25H62.4993L83.3327 27.0833V93.75Z"
          fill="#1976D2"
        />
        <path
          d="M80.2077 29.1667H60.416V9.375L80.2077 29.1667Z"
          fill="#E3F2FD"
        />
        <path
          d="M55.6173 62.9746L58.6756 46.2579H65.0486L59.3902
          72.9163H52.7257L49.1548 57.7184L45.6569 72.9163H39.0111L33.334
          46.2559H39.7236L42.7819 62.9725L46.4444 46.2559H51.9007L55.6173 62.9746Z"
          fill="#FAFAFA"
        />
      </svg>

    </div>
  );
});

export { WordDocumentIcon };
