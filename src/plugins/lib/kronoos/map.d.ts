import { List } from "underscore";

export default class KronoosMap {
    generateMap(mapElement: Element, positions: List<google.maps.LatLng | google.maps.LatLngLiteral>, callback: (g: (googleClass: boolean) => void, map: google.maps.Map) => void, options?: {}): void;
}
