import type { StoreSelectors } from '../../core/types';

export const storeSelectors: StoreSelectors = {
  storeLocatorLink:
    'a[href*="store-locator" i], a[href*="find-a-store" i], a[href*="stores" i], a:has-text("Store Locator"), a:has-text("Find a Store"), a:has-text("Find Store")',
  pageContainer:
    '[data-testid*="store-locator" i], [class*="store-locator" i], [class*="storeLocator" i], [id*="store-locator" i], main',
  searchInput:
    '[data-testid*="store-search" i], [placeholder*="suburb" i], [placeholder*="postcode" i], [placeholder*="city" i], [placeholder*="location" i], input[name*="store-search" i], input[id*="store-search" i]',
  searchSubmit:
    '[data-testid*="store-search-submit" i], button[type="submit"]:near(input[placeholder*="suburb" i]), button[type="submit"]:near(input[placeholder*="postcode" i]), button:has-text("Search"), button:has-text("Find Stores"), button:has-text("Search Stores")',
  storeList:
    '[data-testid*="store-list" i], [class*="store-list" i], [class*="storeList" i], [class*="store-results" i], [class*="storeResults" i]',
  storeCard:
    '[data-testid*="store-card" i], [data-testid*="store-item" i], [class*="store-card" i], [class*="store-item" i], [class*="store-result" i], [class*="storeCard" i], [class*="storeItem" i]',
  storeName:
    '[data-testid*="store-name" i], [class*="store-name" i], [class*="storeName" i], h2, h3, strong',
  storeAddress:
    '[data-testid*="store-address" i], [class*="store-address" i], [class*="storeAddress" i], address, [class*="address" i]',
  storePhone:
    '[data-testid*="store-phone" i], [class*="store-phone" i], a[href^="tel:"], [class*="phone" i], [class*="telephone" i]',
  storeHours:
    '[data-testid*="store-hours" i], [class*="store-hours" i], [class*="storeHours" i], [class*="trading-hours" i], [class*="opening-hours" i]',
  storeDistance:
    '[data-testid*="distance" i], [class*="distance" i], [class*="store-distance" i]',
  getDirectionsLink:
    'a[href*="maps.google" i], a[href*="maps.apple" i], a:has-text("Get Directions"), a:has-text("Directions"), [data-testid*="directions" i]',
  mapContainer:
    '[data-testid*="map" i], [class*="map-container" i], [class*="mapContainer" i], [id*="map" i], .gm-style, [class*="store-map" i]',
  mapPin:
    '[data-testid*="map-pin" i], [data-testid*="marker" i], .gm-style img[src*="marker" i], [class*="map-pin" i], [class*="marker" i]',
  geolocateButton:
    'button:has-text("Use My Location"), button:has-text("Use Current Location"), button[aria-label*="location" i], [data-testid*="geolocate" i], [data-testid*="use-location" i]',
  noResultMessage:
    '[data-testid*="no-store" i], [data-testid*="no-result" i], [class*="no-store" i], [class*="no-result" i], :text("no stores"), :text("no results"), :text("couldn\'t find")',
  findInStoreButton:
    'button:has-text("Find in Store"), a:has-text("Find in Store"), button:has-text("Check In-Store"), [data-testid*="find-in-store" i], [data-testid*="findInStore" i]',
  findInStoreModal:
    '[data-testid*="find-in-store-modal" i], [data-testid*="store-availability" i], [class*="find-in-store" i], [class*="findInStore" i], [role="dialog"]:has(input[placeholder*="suburb" i]), [role="dialog"]:has(input[placeholder*="postcode" i])',
  findInStoreSearch:
    '[data-testid*="find-in-store-search" i], [role="dialog"] input[placeholder*="suburb" i], [role="dialog"] input[placeholder*="postcode" i], [role="dialog"] input[placeholder*="location" i]',
  findInStoreSubmit:
    '[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Search"), [role="dialog"] button:has-text("Check Availability"), [data-testid*="find-in-store-submit" i]',
  availabilityResult:
    '[data-testid*="availability-result" i], [class*="availability-result" i], [class*="store-availability-item" i]',
  availabilityStatus:
    '[data-testid*="availability-status" i], [class*="availability-status" i], :text("In Stock"), :text("Low Stock"), :text("Out of Stock"), :text("Available"), :text("Unavailable")',
  closeModal:
    '[role="dialog"] button[aria-label*="close" i], [role="dialog"] button:has-text("×"), [role="dialog"] button:has-text("✕"), [data-testid*="modal-close" i]',
  storeFilterPanel:
    '[data-testid*="store-filter" i], [class*="store-filter" i], [class*="storeFilter" i]',
  storeFilter:
    '[data-testid*="filter-option" i], [class*="filter-option" i], [class*="filter-item" i]'
};
