declare module '@mapbox/mapbox-gl-draw' {
  import { IControl } from 'mapbox-gl';

  export interface MapboxDrawOptions {
    displayControlsDefault?: boolean;
    controls?: {
      point?: boolean;
      line_string?: boolean;
      polygon?: boolean;
      trash?: boolean;
      combine_features?: boolean;
      uncombine_features?: boolean;
    };
  }

  export default class MapboxDraw implements IControl {
    constructor(options?: MapboxDrawOptions);
    getAll(): { features: any[] };
    add(feature: any): void;
    delete(featureIds: string | string[]): void;
    deleteAll(): void;
    changeMode(mode: string): void;
    onAdd(map: mapboxgl.Map): HTMLElement;
    onRemove(): void;
  }
} 