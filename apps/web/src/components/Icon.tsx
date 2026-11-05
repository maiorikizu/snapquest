export function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const paths: Record<string, string> = {
    spark: 'm12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3Z',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    upload: 'M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5',
    play: 'm9 5 11 7-11 7V5Z',
    grid: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
    scan: 'M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M7 8h10v8H7V8Z',
    check: 'm5 12 4 4L19 6',
    code: 'm8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18',
    download: 'M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5',
    reset: 'M3 11a9 9 0 1 1 2 7M3 4v7h7',
    pause: 'M8 5v14M16 5v14',
    volume: 'm11 4-6 5H2v6h3l6 5V4Zm5 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
    expand: 'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6',
    close: 'm6 6 12 12M6 18 18 6',
    photo: 'M3 3h18v18H3V3Zm0 13 6-6 4 4 3-3 5 5M15 7h.01',
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.spark} />
    </svg>
  );
}
