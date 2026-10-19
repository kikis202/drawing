/** A camera pose in degrees: turn about the vertical axis, tilt above (+) or below (−) the horizon. */
export interface View {
  turn: number;
  tilt: number;
}

export interface Shot {
  id: string;
  view: View;
  source: 'generated' | 'custom';
  role?: 'map';
}
