// 카카오맵 JavaScript SDK 중 이 앱에서 쓰는 부분만 적은 타입 선언
// https://apis.map.kakao.com/web/documentation/

declare namespace kakao.maps {
  function load(callback: () => void): void;

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level?: number });
    setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
    panTo(latlng: LatLng): void;
    relayout(): void;
  }

  class Marker {
    constructor(options: { position: LatLng; map?: Map; title?: string; image?: MarkerImage; zIndex?: number });
    setMap(map: Map | null): void;
    getPosition(): LatLng;
  }

  class MarkerImage {
    constructor(src: string, size: Size, options?: { offset?: Point });
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  class CustomOverlay {
    constructor(options: { position: LatLng; content: string | HTMLElement; map?: Map; yAnchor?: number; zIndex?: number });
    setMap(map: Map | null): void;
  }

  namespace event {
    function addListener(target: Marker, type: 'click', handler: () => void): void;
  }

  namespace services {
    enum Status {
      OK = 'OK',
      ZERO_RESULT = 'ZERO_RESULT',
      ERROR = 'ERROR',
    }

    interface PlaceResult {
      place_name: string;
      x: string;
      y: string;
    }

    interface AddressResult {
      x: string;
      y: string;
    }

    class Places {
      keywordSearch(
        keyword: string,
        callback: (result: PlaceResult[], status: Status) => void,
        options?: { location?: LatLng; radius?: number; size?: number },
      ): void;
    }

    class Geocoder {
      addressSearch(address: string, callback: (result: AddressResult[], status: Status) => void): void;
    }
  }
}
