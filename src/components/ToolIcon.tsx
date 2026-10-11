const paths = {
  paint: 'm4 16 12-12 4 4-12 12H4v-4Zm10-10 4 4',
  erase: 'm4 14 10-10 7 7-9 9H8l-4-4Zm5-5 7 7M12 20h9',
  fill: 'm4 11 7-7 9 9-7 7-9-9Zm0 0h16M20 4v4',
  select: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  undo: 'm8 5-5 5 5 5M3 10h11a6 6 0 0 1 0 12',
  redo: 'm16 5 5 5-5 5M21 10H10a6 6 0 0 0 0 12',
  center: 'M12 2v20M2 12h20M6 6h12v12H6V6Z',
};
export default function ToolIcon({ name }: { name: keyof typeof paths }) {
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}
