(function () {
  "use strict";

  // Weather codes mapping to icons and descriptions
  const WEATHER_MAP = {
    0: { icon: "fa-sun text-yellow-500", description: "Clear sky" },
    1: { icon: "fa-sun text-yellow-500", description: "Mainly clear" },
    2: { icon: "fa-cloud-sun text-yellow-400", description: "Partly cloudy" },
    3: { icon: "fa-cloud text-gray-500", description: "Overcast" },
    45: { icon: "fa-smog text-gray-500", description: "Fog" },
    48: { icon: "fa-smog text-gray-500", description: "Depositing rime fog" },
    51: { icon: "fa-cloud-rain text-blue-400", description: "Light drizzle" },
    53: {
      icon: "fa-cloud-rain text-blue-500",
      description: "Moderate drizzle",
    },
    55: { icon: "fa-cloud-rain text-blue-600", description: "Dense drizzle" },
    56: {
      icon: "fa-cloud-rain text-blue-400",
      description: "Light freezing drizzle",
    },
    57: {
      icon: "fa-cloud-rain text-blue-500",
      description: "Dense freezing drizzle",
    },
    61: { icon: "fa-cloud-rain text-blue-500", description: "Slight rain" },
    63: { icon: "fa-cloud-rain text-blue-600", description: "Moderate rain" },
    65: {
      icon: "fa-cloud-showers-heavy text-blue-700",
      description: "Heavy rain",
    },
    66: {
      icon: "fa-cloud-rain text-blue-500",
      description: "Light freezing rain",
    },
    67: {
      icon: "fa-cloud-rain text-blue-600",
      description: "Heavy freezing rain",
    },
    71: { icon: "fa-snowflake text-blue-300", description: "Slight snow fall" },
    73: {
      icon: "fa-snowflake text-blue-400",
      description: "Moderate snow fall",
    },
    75: { icon: "fa-snowflake text-blue-500", description: "Heavy snow fall" },
    77: { icon: "fa-snowflake text-blue-400", description: "Snow grains" },
    80: {
      icon: "fa-cloud-rain text-blue-500",
      description: "Slight rain showers",
    },
    81: {
      icon: "fa-cloud-rain text-blue-600",
      description: "Moderate rain showers",
    },
    82: {
      icon: "fa-cloud-showers-heavy text-blue-700",
      description: "Violent rain showers",
    },
    85: {
      icon: "fa-snowflake text-blue-400",
      description: "Slight snow showers",
    },
    86: {
      icon: "fa-snowflake text-blue-500",
      description: "Heavy snow showers",
    },
    95: { icon: "fa-bolt text-yellow-600", description: "Thunderstorm" },
    96: {
      icon: "fa-bolt text-yellow-600",
      description: "Thunderstorm with slight hail",
    },
    99: {
      icon: "fa-bolt text-yellow-600",
      description: "Thunderstorm with heavy hail",
    },
  };

  // DOM Elements
  const dom = {
    loading: document.getElementById("loading"),
    errorMessage: document.getElementById("error-message"),
    locationInput: document.getElementById("location-input"),
    hourlyForecast: document.getElementById("hourly-forecast"),
    forecastContainer: document.getElementById("forecast-container"),
    weatherContainer: document.getElementById("weather-container"),
    searchForm: document.getElementById("search-form"),
    searchSuggestions: document.getElementById("search-suggestions"),
    map: document.getElementById("map"),
    locationName: document.getElementById("location-name"),
    currentDate: document.getElementById("current-date"),
    currentWeatherIcon: document.getElementById("current-weather-icon"),
    currentTemp: document.getElementById("current-temp"),
    weatherDescription: document.getElementById("weather-description"),
    feelsLike: document.getElementById("feels-like"),
    windSpeed: document.getElementById("wind-speed"),
    humidity: document.getElementById("humidity"),
    visibility: document.getElementById("visibility"),
    pressure: document.getElementById("pressure"),
    uvIndex: document.getElementById("uv-index"),
    recentSearches: document.getElementById("recent-searches"),
    recentSearchesContainer: document.getElementById(
      "recent-searches-container"
    ),
    favoritesSection: document.getElementById("favorites-section"),
    favoritesContainer: document.getElementById("favorites-container"),
    favoriteBtn: document.getElementById("favorite-btn"),
  };

  // Application state
  let state = {
    currentLocation: null,
    recentSearches: [],
    favorites: [],
    lastLocation: null,
    map: null,
    marker: null,
    debounceTimer: null,
  };

  // Helper functions
  const utils = {
    show: (el) => el && el.classList.remove("hidden"),
    hide: (el) => el && el.classList.add("hidden"),
    formatDate: (dateStr) =>
      new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    formatHour: (dateStr) =>
      new Date(dateStr).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    formatDay: (dateStr) =>
      new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" }),
  };

  // API functions
  const api = {
    searchLocation: async (query) => {
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            query
          )}&count=5&language=en`
        );
        if (!response.ok) throw new Error("Failed to search for location.");
        const data = await response.json();
        return data.results || [];
      } catch (error) {
        console.error("Error searching location:", error);
        throw error;
      }
    },
    getWeather: async (lat, lon) => {
      try {
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,visibility&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to get weather data.");
        return await response.json();
      } catch (error) {
        console.error("Error getting weather:", error);
        throw error;
      }
    },
  };

  // UI update functions
  const ui = {
    showLoading: () => {
      utils.hide(dom.weatherContainer);
      utils.hide(dom.errorMessage);
      utils.show(dom.loading);
    },
    hideLoading: () => utils.hide(dom.loading),
    showError: (message) => {
      if (dom.errorMessage) {
        dom.errorMessage.textContent = message;
        utils.show(dom.errorMessage);
        utils.hide(dom.weatherContainer);
        setTimeout(() => utils.hide(dom.errorMessage), 5000);
      }
    },
    renderWeatherData: (data, location) => {
      const { current, daily, hourly } = data;
      const weatherInfo = WEATHER_MAP[current.weather_code] || {
        icon: "fa-question-circle text-gray-500",
        description: "Unknown",
      };

      if (dom.locationName)
        dom.locationName.textContent = `${location.name}, ${location.country_code}`;
      if (dom.currentDate)
        dom.currentDate.textContent = utils.formatDate(current.time);
      if (dom.currentWeatherIcon)
        dom.currentWeatherIcon.innerHTML = `<i class="fas ${weatherInfo.icon}"></i>`;
      if (dom.currentTemp)
        dom.currentTemp.textContent = Math.round(current.temperature_2m) + "°C";
      if (dom.weatherDescription)
        dom.weatherDescription.textContent = weatherInfo.description;
      if (dom.feelsLike)
        dom.feelsLike.textContent = `${Math.round(
          current.apparent_temperature
        )}°C`;
      if (dom.windSpeed)
        dom.windSpeed.textContent = `${Math.round(
          current.wind_speed_10m
        )} km/h`;
      if (dom.humidity)
        dom.humidity.textContent = `${current.relative_humidity_2m}%`;
      if (dom.visibility)
        dom.visibility.textContent = `${(current.visibility / 1000).toFixed(
          1
        )} km`;
      if (dom.uvIndex)
        dom.uvIndex.textContent = Math.round(daily.uv_index_max[0]);
      if (dom.pressure)
        dom.pressure.textContent = `${Math.round(
          current.surface_pressure
        )} hPa`;

      ui.renderHourlyForecast(hourly);
      ui.renderDailyForecast(daily);
      ui.updateFavoriteButton();
      utils.show(dom.weatherContainer);
      utils.hide(dom.errorMessage);
    },
    renderHourlyForecast: (hourly) => {
      if (!dom.hourlyForecast || !hourly) return;
      const now = new Date();
      const currentHour = now.getHours();
      let html = "";
      for (
        let i = currentHour;
        i < currentHour + 24 && i < hourly.time.length;
        i++
      ) {
        const weatherInfo = WEATHER_MAP[hourly.weather_code[i]] || {
          icon: "fa-question-circle text-gray-500",
        };
        html += `
                    <div class="flex-shrink-0 text-center p-3 bg-gray-50 rounded-lg">
                        <p class="text-xs text-gray-600 mb-2">${utils.formatHour(
                          hourly.time[i]
                        )}</p>
                        <div class="text-xl mb-2">
                            <i class="fas ${weatherInfo.icon}"></i>
                        </div>
                        <p class="font-semibold text-gray-800">${Math.round(
                          hourly.temperature_2m[i]
                        )}°</p>
                    </div>
                `;
      }
      dom.hourlyForecast.innerHTML = html;
    },
    renderDailyForecast: (daily) => {
      if (!dom.forecastContainer || !daily) return;
      let html = "";
      for (let i = 0; i < 7 && i < daily.time.length; i++) {
        const weatherInfo = WEATHER_MAP[daily.weather_code[i]] || {
          icon: "fa-question-circle text-gray-500",
        };
        html += `
                    <li class="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                        <div class="flex items-center">
                            <i class="fas ${weatherInfo.icon} mr-3 text-lg"></i>
                            <span class="text-gray-700">${
                              i === 0 ? "Today" : utils.formatDay(daily.time[i])
                            }</span>
                        </div>
                        <span class="font-medium text-gray-800">${Math.round(
                          daily.temperature_2m_max[i]
                        )}° / ${Math.round(daily.temperature_2m_min[i])}°</span>
                    </li>
                `;
      }
      dom.forecastContainer.innerHTML = html;
    },
    renderSearchSuggestions: (results) => {
      if (!dom.searchSuggestions || !results || results.length === 0) {
        utils.hide(dom.searchSuggestions);
        return;
      }
      let html = results
        .map(
          (loc) =>
            `<div class="px-4 py-3 hover:bg-gray-100 cursor-pointer suggestion-item border-b border-gray-100 last:border-b-0" 
                     data-lat="${loc.latitude}" 
                     data-lon="${loc.longitude}" 
                     data-name="${loc.name}" 
                     data-country="${loc.country_code || loc.country}">
                    <div class="font-medium text-gray-800">${loc.name}</div>
                    <div class="text-sm text-gray-500">${
                      loc.admin1 ? loc.admin1 + ", " : ""
                    }${loc.country}</div>
                </div>`
        )
        .join("");
      dom.searchSuggestions.innerHTML = html;
      utils.show(dom.searchSuggestions);
    },
    renderRecentSearches: () => {
      if (!dom.recentSearches || state.recentSearches.length === 0) {
        utils.hide(dom.recentSearchesContainer);
        return;
      }
      let html = "";
      state.recentSearches.forEach((search) => {
        html += `
                    <button class="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors recent-search-btn flex items-center justify-between"
                            data-lat="${search.latitude}" 
                            data-lon="${search.longitude}" 
                            data-name="${search.name}" 
                            data-country="${search.country_code}">
                        <div>
                            <div class="font-medium text-gray-800">${search.name}</div>
                            <div class="text-sm text-gray-500">${search.country_code}</div>
                        </div>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </button>
                `;
      });
      dom.recentSearches.innerHTML = html;
      utils.show(dom.recentSearchesContainer);
    },
    renderFavorites: () => {
      if (!dom.favoritesSection || state.favorites.length === 0) {
        utils.hide(dom.favoritesContainer);
        return;
      }
      let html = "";
      state.favorites.forEach((fav, index) => {
        html += `
                    <div class="flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <button class="flex-1 text-left favorite-location-btn"
                                data-lat="${fav.latitude}" 
                                data-lon="${fav.longitude}" 
                                data-name="${fav.name}" 
                                data-country="${fav.country_code}">
                            <div class="font-medium text-gray-800">${fav.name}</div>
                            <div class="text-sm text-gray-500">${fav.country_code}</div>
                        </button>
                        <button class="text-red-500 hover:text-red-600 ml-2 p-1 remove-favorite-btn" 
                                data-index="${index}" 
                                title="Remove from favorites">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                `;
      });
      dom.favoritesSection.innerHTML = html;
      utils.show(dom.favoritesContainer);
    },
    updateFavoriteButton: () => {
      if (!dom.favoriteBtn || !state.currentLocation) return;
      const isFavorite = state.favorites.some(
        (fav) =>
          fav.name === state.currentLocation.name &&
          fav.country_code === state.currentLocation.country_code
      );
      if (isFavorite) {
        dom.favoriteBtn.innerHTML = '<i class="fas fa-heart text-red-500"></i>';
        dom.favoriteBtn.title = "Remove from favorites";
        dom.favoriteBtn.classList.add("text-red-500");
        dom.favoriteBtn.classList.remove("text-gray-400");
      } else {
        dom.favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        dom.favoriteBtn.title = "Add to favorites";
        dom.favoriteBtn.classList.remove("text-red-500");
        dom.favoriteBtn.classList.add("text-gray-400");
      }
    },
  };

  // Map handler
  const mapHandler = {
    init: (lat = 51.505, lon = -0.09) => {
      // Default to London
      if (state.map) state.map.remove();
      if (dom.map) {
        state.map = L.map("map").setView([lat, lon], 10);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(state.map);
        state.marker = L.marker([lat, lon]).addTo(state.map);
      }
    },
    update: (lat, lon, name) => {
      if (!state.map) {
        mapHandler.init(lat, lon);
      } else {
        const newLatLng = new L.LatLng(lat, lon);
        state.map.setView(newLatLng, 10);
        if (state.marker) {
          state.marker.setLatLng(newLatLng);
        } else {
          state.marker = L.marker([lat, lon]).addTo(state.map);
        }
      }
      if (state.marker) {
        state.marker.bindPopup(`<b>${name}</b>`).openPopup();
      }
    },
  };

  // Main application logic
  const app = {
    init: () => {
      mapHandler.init();
      app.attachEventListeners();
      // Load last location or a default one (e.g., London)
      if (state.lastLocation) {
        app.fetchAndDisplayWeather(
          state.lastLocation.latitude,
          state.lastLocation.longitude,
          state.lastLocation.name,
          state.lastLocation.country_code
        );
      } else {
        app.fetchAndDisplayWeather(51.5072, -0.1276, "London", "GB");
      }
    },
    attachEventListeners: () => {
      // Search form
      if (dom.searchForm) {
        dom.searchForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const query = dom.locationInput.value.trim();
          if (!query) return;
          try {
            utils.hide(dom.searchSuggestions);
            const results = await api.searchLocation(query);
            if (results.length > 0) {
              const { latitude, longitude, name, country_code, country } =
                results[0];
              app.fetchAndDisplayWeather(
                latitude,
                longitude,
                name,
                country_code || country
              );
              dom.locationInput.value = "";
            } else {
              ui.showError("Location not found.");
            }
          } catch (error) {
            ui.showError("An error occurred while searching for the location.");
          }
        });
      }

      // Search input with debounce
      if (dom.locationInput) {
        dom.locationInput.addEventListener("input", (e) => {
          const query = e.target.value.trim();
          clearTimeout(state.debounceTimer);
          if (!query) {
            utils.hide(dom.searchSuggestions);
            return;
          }
          state.debounceTimer = setTimeout(async () => {
            try {
              const results = await api.searchLocation(query);
              ui.renderSearchSuggestions(results);
            } catch {
              utils.hide(dom.searchSuggestions);
            }
          }, 400);
        });
      }

      // Click on a suggestion
      if (dom.searchSuggestions) {
        dom.searchSuggestions.addEventListener("click", (e) => {
          const item = e.target.closest(".suggestion-item");
          if (!item) return;
          const { lat, lon, name, country } = item.dataset;
          app.fetchAndDisplayWeather(lat, lon, name, country);
          utils.hide(dom.searchSuggestions);
          dom.locationInput.value = "";
        });
      }

      // Click on a recent search
      if (dom.recentSearches) {
        dom.recentSearches.addEventListener("click", (e) => {
          const btn = e.target.closest(".recent-search-btn");
          if (!btn) return;
          const { lat, lon, name, country } = btn.dataset;
          app.fetchAndDisplayWeather(lat, lon, name, country);
        });
      }

      // Click on a favorite
      if (dom.favoritesSection) {
        dom.favoritesSection.addEventListener("click", (e) => {
          const favBtn = e.target.closest(".favorite-location-btn");
          const removeBtn = e.target.closest(".remove-favorite-btn");

          if (favBtn) {
            const { lat, lon, name, country } = favBtn.dataset;
            app.fetchAndDisplayWeather(lat, lon, name, country);
          } else if (removeBtn) {
            const index = removeBtn.dataset.index;
            state.favorites.splice(index, 1);
            ui.renderFavorites();
            ui.updateFavoriteButton();
            app.saveState();
          }
        });
      }

      // Favorite button
      if (dom.favoriteBtn) {
        dom.favoriteBtn.addEventListener("click", () => {
          if (!state.currentLocation) return;
          const exists = state.favorites.some(
            (fav) =>
              fav.name === state.currentLocation.name &&
              fav.country_code === state.currentLocation.country_code
          );

          if (exists) {
            state.favorites = state.favorites.filter(
              (fav) =>
                !(
                  fav.name === state.currentLocation.name &&
                  fav.country_code === state.currentLocation.country_code
                )
            );
          } else {
            state.favorites.push(state.currentLocation);
          }
          ui.renderFavorites();
          ui.updateFavoriteButton();
          app.saveState();
        });
      }
    },
    fetchAndDisplayWeather: async (lat, lon, name, country) => {
      try {
        ui.showLoading();
        const data = await api.getWeather(lat, lon);
        const location = {
          latitude: lat,
          longitude: lon,
          name,
          country_code: country,
        };
        state.currentLocation = location;
        state.lastLocation = location;

        // Add to recent searches (avoid duplicates)
        state.recentSearches = state.recentSearches.filter(
          (s) => !(s.name === name && s.country_code === country)
        );
        state.recentSearches.unshift(location);
        if (state.recentSearches.length > 5) state.recentSearches.pop();

        ui.renderRecentSearches();
        ui.renderFavorites();
        ui.renderWeatherData(data, location);
        mapHandler.update(lat, lon, name);
        app.saveState();
      } catch (err) {
        ui.showError("Failed to load weather data.");
      } finally {
        ui.hideLoading();
      }
    },
    saveState: () => {
      localStorage.setItem(
        "weatherlyState",
        JSON.stringify({
          lastLocation: state.lastLocation,
          recentSearches: state.recentSearches,
          favorites: state.favorites,
        })
      );
    },
    loadState: () => {
      const saved = localStorage.getItem("weatherlyState");
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        state.lastLocation = parsed.lastLocation || null;
        state.recentSearches = parsed.recentSearches || [];
        state.favorites = parsed.favorites || [];
        ui.renderRecentSearches();
        ui.renderFavorites();
      } catch (e) {
        console.error("Could not load state from localStorage", e);
      }
    },
  };

  // Initialize the app when the DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    app.loadState();
    app.init();
  });
})();
