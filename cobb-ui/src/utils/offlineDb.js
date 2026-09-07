import axios from 'axios';
import localforage from 'localforage';

// Configure localforage for IndexedDB storage
localforage.config({
  name: 'CobbOfflineTool',
  storeName: 'pos_data'
});

export async function fetchWithOfflineFallback(key, url) {
  try {
    // 1. Check local cache first for instant load
    const cachedData = await localforage.getItem(key);
    
    // 2. Try fetching fresh data in the background
    const fetchFresh = async () => {
      try {
        const res = await axios.get(url);
        if (res.data) {
          await localforage.setItem(key, res.data); // Update cache
          return res.data;
        }
      } catch (err) {
        console.warn(`Network unavailable for ${url}, relying on cache.`);
      }
      return null;
    };

    // If we have cache, return it immediately, but let the fresh fetch happen
    if (cachedData) {
      fetchFresh(); // Fire and forget update
      return cachedData;
    } else {
      // If no cache, wait for the fresh fetch
      return await fetchFresh();
    }
  } catch (error) {
    console.error(`Error in offline fallback for ${url}:`, error);
    return null;
  }
}

export function subscribeToData(key, url, setter) {
  // Initial fetch using the offline fallback mechanism
  fetchWithOfflineFallback(key, url).then(data => {
    setter(data);
  });
  
  // Setup polling (will continue updating cache when online)
  const interval = setInterval(() => {
    axios.get(url).then(async res => {
      if (res.data) {
        await localforage.setItem(key, res.data);
        setter(res.data);
      }
    }).catch(err => {
      // Silently fail on interval if offline, UI stays populated from last cache
    });
  }, 10000);
  
  return () => clearInterval(interval);
}
