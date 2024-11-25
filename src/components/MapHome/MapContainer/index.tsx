import React, { useEffect, useState } from 'react';
import { SSRMetaProps } from '@/components/MetaData/MetaData.type';
import Header from '@/components/Layout/Header';
import PopularSports from '@/components/MapHome/PopularSports';
import FacilityInfo from '@/components/MapHome/FacilityInfo';
import { fetchFacilities } from '@/apis/get/facilitiesAPI';
import { simplifyRegionName } from '@/utils/regionUtils';
import { createMarkerImage } from '@/utils/markerUtils';
import useKakaoMap from '@/hooks/useMap';
import { useRecoilValue } from 'recoil';
import { toggleState } from '@/states/toggleState';
import styles from './MapContainer.module.scss';
import { useRouter } from 'next/router';
import classNames from 'classnames';
import { NomalFacility, SpecialFacility } from '@/apis/get/getFacilities';
import {
  NomalFacilityDetails,
  SpecialFacilityDetails,
  getSpecialFacilityDetails,
  getNomalFacilityDetails,
} from '@/apis/get/getFacilityDetails';
import { GetServerSideProps } from 'next';
import { serviceUrl } from '@/constants/serviceUrl';

/* eslint-disable */
type Facility = NomalFacility | SpecialFacility;

interface MapContainerProps {
  OGTitle: string;
  OGUrl: string;
}

export const getServerSideProps: GetServerSideProps<
  SSRMetaProps
> = async () => {
  const OGTitle = '지도 홈 | HELLOFIT';
  const OGUrl = `${serviceUrl}/map`;
  return {
    props: {
      OGTitle,
      OGUrl,
    },
  };
};

export default function MapContainer({ OGTitle, OGUrl }: MapContainerProps) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<
    NomalFacilityDetails | SpecialFacilityDetails | null
  >(null);
  const [indicatorMode, setIndicatorMode] = useState<'sports' | 'facilityInfo'>(
    'sports'
  );
  const [selectedRegion, setSelectedRegion] = useState('지역');
  const [filterItem, setFilterItem] = useState<string | null>(null);
  const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY!;
  const [userLocation, setUserLocation] = useState<kakao.maps.LatLng | null>(
    null
  );
  const [localCode, setLocalCode] = useState<string | null>(
    localStorage.getItem('localCode') || null
  );
  const [markers, setMarkers] = useState<kakao.maps.Marker[]>([]);
  const toggle = useRecoilValue(toggleState);
  const router = useRouter();

  const { map, setMap } = useKakaoMap(KAKAO_MAP_KEY, null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const loadKakaoMapScript = () => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`;

    document.head.appendChild(script);

    return new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Kakao Maps API'));
    });
  };

  // 시설 목록 요청
  const fetchFacilitiesBySport = async (sport: string | null = null) => {
    const data = await fetchFacilities(
      localStorage.getItem('localCode'),
      sport,
      toggle
    );
    setFacilities(data);
  };

  // 좌표를 기반으로 지역 코드 및 시설 목록 갱신 함수
  const updateLocalCodeAndFetchFacilities = async (
    latitude: number,
    longitude: number
  ) => {
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2RegionCode(
      longitude,
      latitude,
      (result: any[], status: string) => {
        if (status === kakao.maps.services.Status.OK && result.length > 0) {
          const fullLocalCode = result[0].code.trim();
          const shortLocalCode = `${fullLocalCode.slice(0, 4)}0`;

          localStorage.setItem('localCode', shortLocalCode);
          const simplifiedRegion = simplifyRegionName(result[0].address_name);
          setSelectedRegion(simplifiedRegion);

          fetchFacilitiesBySport(filterItem);
        } else {
          console.error('Failed to fetch region code:', status);
          setFacilities([]);
        }
      }
    );
  };
  // 지역을 선택했을 때 호출되는 함수
  const handleRegionSelect = (localCode: string, fullRegionName: string) => {
    if (!fullRegionName) {
      console.error('유효하지 않은 지역 이름:', localCode, fullRegionName);
      return;
    }

    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(fullRegionName, (result: any[], status: string) => {
      if (status === kakao.maps.services.Status.OK && result.length > 0) {
        const { y: latitude, x: longitude } = result[0];
        const coords = new kakao.maps.LatLng(
          parseFloat(latitude),
          parseFloat(longitude)
        );

        if (map) {
          map.setCenter(coords);
        }

        setUserLocation(coords); // 사용자가 선택한 위치로 설정
        updateLocalCodeAndFetchFacilities(
          parseFloat(latitude),
          parseFloat(longitude)
        );

        fetchFacilitiesBySport(); // 지역 선택 후 해당 지역의 시설 목록 갱신
      } else {
        console.error('지역 검색 실패 또는 결과 없음:', status, fullRegionName);
      }
    });
  };

  // 초기 카카오 지도 로드 및 위치 설정
  useEffect(() => {
    loadKakaoMapScript()
      .then(() => {
        kakao.maps.load(() => {
          const container = document.getElementById('map');
          const options = {
            center: userLocation || new kakao.maps.LatLng(37.5665, 126.978),
            level: 3,
          };
          const kakaoMap = new kakao.maps.Map(
            container as HTMLElement,
            options
          );
          setMap(kakaoMap);

          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              position => {
                const userLatLng = new kakao.maps.LatLng(
                  position.coords.latitude,
                  position.coords.longitude
                );
                setUserLocation(userLatLng);
                kakaoMap.setCenter(userLatLng);

                const userMarkerImage = createMarkerImage(
                  toggle === 'special'
                    ? '/image/my-location-special.svg'
                    : '/image/my-location.svg'
                );

                new kakao.maps.Marker({
                  map: kakaoMap,
                  position: userLatLng,
                  image: userMarkerImage,
                  title: '현재 위치',
                });

                updateLocalCodeAndFetchFacilities(
                  position.coords.latitude,
                  position.coords.longitude
                );
              },
              error => {
                console.error('현재 위치를 가져오는 데 실패했습니다:', error);
                setFacilities([]); // 위치를 가져오지 못한 경우 시설 목록을 비웁니다.
              }
            );
          }
        });
      })
      .catch(console.error);
  }, [KAKAO_MAP_KEY, toggle]);

  // 시설 목록이 변경될 때 지도 마커 업데이트
  useEffect(() => {
    if (facilities.length > 0) {
      renderMarkers();
    } else {
      clearMarkers();
    }
  }, [map, facilities]);

  // 마커 렌더링 함수
  const renderMarkers = () => {
    if (!map || facilities.length === 0) return;

    clearMarkers(); // 기존 마커 제거

    const newMarkers: kakao.maps.Marker[] = [];
    let selectedMarker: kakao.maps.Marker | null = null;

    facilities.forEach(facility => {
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch(
        facility.address,
        (result: any[], status: string) => {
          if (status === kakao.maps.services.Status.OK) {
            const coords = new kakao.maps.LatLng(
              parseFloat(result[0].y),
              parseFloat(result[0].x)
            );

            const defaultMarkerImage = createMarkerImage(
              toggle === 'special'
                ? '/image/marker-special.svg'
                : '/image/marker.svg'
            );

            const selectedMarkerImage = createMarkerImage(
              toggle === 'special'
                ? '/image/address-marker-special.svg'
                : '/image/address-marker-normal.svg'
            );

            const marker = new kakao.maps.Marker({
              map,
              position: coords,
              image: defaultMarkerImage,
              title: facility.name,
            });

            newMarkers.push(marker);

            kakao.maps.event.addListener(marker, 'mouseover', () => {
              if (!selectedMarker || selectedMarker !== marker) {
                marker.setImage(defaultMarkerImage);
              }
            });

            kakao.maps.event.addListener(marker, 'mouseout', () => {
              if (!selectedMarker || selectedMarker !== marker) {
                marker.setImage(defaultMarkerImage);
              }
            });

            kakao.maps.event.addListener(marker, 'click', async () => {
              if (selectedMarker && selectedMarker !== marker) {
                selectedMarker.setImage(defaultMarkerImage);
              }

              marker.setImage(selectedMarkerImage);
              selectedMarker = marker;

              try {
                let details;
                if (toggle === 'special') {
                  details = await getSpecialFacilityDetails(
                    facility.businessId
                  );
                } else if ('serialNumber' in facility) {
                  details = await getNomalFacilityDetails(
                    facility.businessId,
                    facility.serialNumber
                  );
                }

                if (details) {
                  setSelectedFacility(details);
                  setIndicatorMode('facilityInfo');
                }
              } catch (error) {
                console.error('Failed to fetch facility details:', error);
              }
            });
          }
        }
      );
    });

    setMarkers(newMarkers);
  };

  // 기존 마커 제거 함수
  const clearMarkers = () => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
  };

  // 현재 위치로 이동 함수
  const moveToUserLocation = () => {
    if (map && userLocation) {
      map.setCenter(userLocation);
      updateLocalCodeAndFetchFacilities(
        userLocation.getLat(),
        userLocation.getLng()
      );
      fetchFacilitiesBySport(); // 현재 위치로 이동 후 시설 목록 갱신
    } else {
      console.warn('Map or userLocation is not available');
    }
  };

  return (
    <>
      <Header />
      <div
        className={classNames(styles.positionButton, {
          [styles['position-special']]: toggle === 'special',
        })}
        onClick={moveToUserLocation}
      >
        <img
          src={
            toggle === 'special'
              ? '/image/position-special.svg'
              : '/image/position.svg'
          }
          alt="현재 위치로 돌아가기"
        />
      </div>
      <div
        id="map"
        style={{ width: '100%', height: '100vh', position: 'relative' }}
      ></div>
      {indicatorMode === 'sports' ? (
        <PopularSports
          onSelectSport={sport => {
            setFilterItem(sport);
            fetchFacilitiesBySport(sport);
          }}
          mode={toggle}
          onRegionSelect={(localCode, region) => {
            setLocalCode(localCode);
            setSelectedRegion(simplifyRegionName(region));
            if (map) {
              const geocoder = new kakao.maps.services.Geocoder();
              geocoder.addressSearch(
                region,
                (result: any[], status: string) => {
                  if (
                    status === kakao.maps.services.Status.OK &&
                    result.length > 0
                  ) {
                    const { y: latitude, x: longitude } = result[0];
                    const coords = new kakao.maps.LatLng(
                      parseFloat(latitude),
                      parseFloat(longitude)
                    );
                    map.setCenter(coords);
                    setUserLocation(coords);
                    updateLocalCodeAndFetchFacilities(
                      parseFloat(latitude),
                      parseFloat(longitude)
                    );
                    fetchFacilitiesBySport(); // 지역 선택 후 해당 지역의 시설 목록 갱신
                  }
                }
              );
            }
          }}
          selectedRegion={selectedRegion}
        />
      ) : (
        selectedFacility && (
          <FacilityInfo
            facility={selectedFacility}
            filterItem={filterItem || undefined}
            onBackClick={() => {
              setIndicatorMode('sports');
              clearMarkers(); // 모든 마커를 default 이미지로 초기화
              renderMarkers(); // 다시 마커를 렌더링하여 default 이미지 적용
            }}
            onMoveToDetail={() => {
              if (selectedFacility) {
                router.push(
                  `/details/${selectedFacility.businessId}/${
                    'serialNumber' in selectedFacility
                      ? selectedFacility.serialNumber
                      : ''
                  }`
                );
              }
            }}
          />
        )
      )}
    </>
  );
}
/* eslint-enable */
