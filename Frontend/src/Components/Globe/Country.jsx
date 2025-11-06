import { useEffect, useState } from 'react';
import axios from 'axios';
import { showText } from '../Showtext';

function ItineraryModal({ city, onClose, isDesktop }) {
  const [CityTitle, setCityTitle] = useState("");
  const [CityDesc, setCityDesc] = useState("");
  const [CityThumbnail, setCityThumbnail] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    axios.get("/cities", {
      params: { name: city.name },
      signal: controller.signal
    })
    .then((response) => {
      setCityTitle(response.data.title);
      setCityDesc(response.data.extract);
      setCityThumbnail(response.data.thumbnail?.source || null);
    })
    .catch((error) => {
      if (error.name !== 'CanceledError') {
        console.error(error);
      }
      setCityTitle(city.name);
      setCityDesc("Could not find city description.");
      setCityThumbnail(null);
    });

    return () => {
      controller.abort();
    };
  }, [city.name]);

  useEffect(() => {
    if (CityTitle && isDesktop) {
      const titleElem = document.getElementById('cityTitle');
      const descElem = document.getElementById('cityDesc');

      if (titleElem && descElem) {
        titleElem.textContent = '';
        descElem.textContent = '';
        showText('cityTitle', CityTitle, 0, 100);
        showText('cityDesc', CityDesc, 0, 10);
      }
    }
  }, [CityTitle, CityDesc, isDesktop]);

  if (!city) return null;

  return (
    <>
      {isDesktop ? (
        <>
          <div className="max-w-sm bg-transparent border-0 rounded-lg shadow-sm max-h-[60vh] overflow-y-auto">
              <a href="#" className="flex justify-center">
                  <img className="rounded-t-lg" src={CityThumbnail} alt="" />
              </a>
              <div className="p-3">
                  <h5 id='cityTitle' className="mb-2 text-2xl font-bold tracking-tight text-[#39ff41]"></h5>
                  <p id='cityDesc' className="mb-3 font-normal text-[#39ff41] text-justify"></p>
              </div>
          </div>

        </>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}>
          <div className="relative max-w-sm bg-transparent border-0 rounded-lg shadow-sm max-h-[60vh] overflow-y-auto mx-auto" 
            onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={onClose}
              className="absolute top-2 right-2 z-10 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
              ×
            </button>
            <div className="flex justify-center">
              <img className="rounded-t-lg" src={CityThumbnail} alt="" />
            </div>
            <div className="p-3 text-center">
              <h5 id='cityTitle' className="mb-2 text-2xl font-bold tracking-tight text-white text-center">{CityTitle}</h5> {/* Why is the color not changing but fixed to green */}
              <p id='cityDesc' className="mb-3 font-normal text-gray-300 text-justify">{CityDesc}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ItineraryModal;
