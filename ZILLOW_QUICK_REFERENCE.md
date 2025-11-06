# Zillow-Style Design Quick Reference

## Visual Layout Overview

```
┌────────────────────────────────────────────────────────────────┐
│  STICKY FILTER BAR (72px height, z-index: 200)                │
│  [Search] [Type ▼] [City ▼] [Price ▼] [More ▼]  |  1,234 Props│
└────────────────────────────────────────────────────────────────┘
┌─────────────────────────┬──────────────────────────────────────┐
│ MAP (50% - Fixed)       │ LISTINGS (50% - Scrollable)          │
│                         │                                      │
│  ┌───┐                  │ ┌────────────────────────────────┐  │
│  │$8M│ [+][-]          │ │ [Image] Title           $8.5M  │  │
│  └───┘                  │ │         Details Details       │  │
│    ┌───┐               │ └────────────────────────────────┘  │
│    │$5M│ [🗺]          │ ┌────────────────────────────────┐  │
│    └───┘               │ │ [Image] Title           $5.2M  │  │
│ ┌───┐                  │ │         Details Details       │  │
│ │$3M│                  │ └────────────────────────────────┘  │
│ └───┘                  │ ┌────────────────────────────────┐  │
│        ┌───────────┐   │ │ [Image] Title           $3.8M  │  │
│        │● Available│   │ │         Details Details       │  │
│        │● Pending  │   │ └────────────────────────────────┘  │
│        │● Sold     │   │              ⋮                      │
│        └───────────┘   │         (Scrollable)                │
└─────────────────────────┴──────────────────────────────────────┘
```

---

## Color Palette (Copy-Paste Ready)

```css
/* Primary */
--brand-primary: #006AFF;
--brand-primary-dark: #0052CC;
--brand-primary-light: #E6F2FF;

/* Map Markers */
--map-marker-default: #006AFF;
--map-marker-hover: #FF385C;
--map-marker-selected: #FF385C;

/* Status Colors */
--status-available: #10B981;
--status-pending: #F59E0B;
--status-sold: #EF4444;
--status-new: #3B82F6;

/* Neutrals */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-900: #111827;
```

---

## Key Measurements

```css
/* Layout Dimensions */
--header-height: 72px;
--sidebar-width: 248px;
--map-width: calc(50vw - 124px);
--listings-width: calc(50vw - 124px);

/* Card Dimensions */
--card-image-width: 280px;
--card-min-height: 240px;
--card-image-height: 220px;

/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;

/* Border Radius */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
```

---

## Component Sizing Guide

### Filter Header
- Height: `72px`
- Padding: `16px 24px`
- Search input: `280px - 360px` width, `40px` height
- Filter buttons: `40px` height, `auto` width
- Border: `1px solid #E5E7EB`

### Map Container
- Position: `fixed`
- Left: `248px` (after sidebar)
- Top: `72px` (after header)
- Width: `calc(50vw - 124px)`
- Height: `calc(100vh - 72px)`

### Listing Cards (Horizontal)
- Display: `flex` (horizontal)
- Image section: `280px` width
- Content section: `flex: 1`
- Min height: `240px`
- Border radius: `12px`
- Gap between cards: `16px`

### Map Markers
- Default size: `60px` × `36px`
- Border: `2px solid #006AFF`
- Border radius: `12px`
- Font size: `14px`
- Font weight: `700`
- Shadow: `0 2px 4px rgba(0, 0, 0, 0.3)`

### Map Controls
- Button size: `40px` × `40px`
- Border radius: `8px`
- Gap between groups: `12px`
- Position: Top-right, `20px` from edges

---

## Typography Scale

```css
/* Desktop Sizes */
--text-hero: 40px/48px;      /* Hero moments */
--text-h1: 32px/40px;        /* Page titles */
--text-h2: 28px/36px;        /* Section headers */
--text-h3: 20px/28px;        /* Card titles */
--text-body: 16px/24px;      /* Body text */
--text-small: 14px/20px;     /* Secondary info */
--text-tiny: 12px/16px;      /* Labels, tags */

/* Mobile Sizes */
--text-hero-mobile: 32px/40px;
--text-h1-mobile: 28px/36px;
--text-h2-mobile: 24px/32px;

/* Weights */
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
--weight-extrabold: 800;
```

---

## Interactive State Colors

```css
/* Buttons */
.btn-primary {
  background: #006AFF;
  color: white;
}
.btn-primary:hover {
  background: #0052CC;
  transform: translateY(-1px);
}

/* Markers */
.custom-marker {
  background: white;
  border: 2px solid #006AFF;
}
.custom-marker:hover {
  background: #006AFF;
  color: white;
  transform: scale(1.1);
}
.custom-marker.active {
  background: #FF385C;
  color: white;
  border-color: #FF385C;
  transform: scale(1.15);
}

/* Listing Cards */
.listing-card-horizontal {
  border: 2px solid transparent;
}
.listing-card-horizontal:hover {
  border-color: #006AFF;
  transform: translateY(-2px);
}
.listing-card-horizontal.selected {
  border-color: #FF385C;
  box-shadow: 0 0 0 3px rgba(255, 56, 92, 0.1);
}
```

---

## Shadow System

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

/* Specific uses */
--shadow-marker: 0 2px 4px rgba(0, 0, 0, 0.3);
--shadow-marker-hover: 0 4px 12px rgba(0, 0, 0, 0.4);
--shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.12);
```

---

## Responsive Breakpoints

```css
/* Desktop Large - Split Screen */
@media (min-width: 1024px) {
  .map-container { width: calc(50vw - 124px); position: fixed; }
  .listings-panel { width: calc(50vw - 124px); position: fixed; }
}

/* Tablet - Stacked with Collapse */
@media (min-width: 768px) and (max-width: 1023px) {
  .map-container { width: 100%; height: 400px; position: relative; }
  .listings-panel { width: 100%; position: relative; }
  .listing-card-horizontal { flex-direction: column; }
}

/* Mobile - Tab Navigation */
@media (max-width: 767px) {
  .map-view-tabs { display: flex; }
  .map-container { height: calc(100vh - 144px); }
  .listing-card-horizontal { flex-direction: column; }
  .card-details-grid { grid-template-columns: repeat(2, 1fr); }
}
```

---

## Animation Timing

```css
/* Standard transitions */
transition: all 0.2s ease;

/* Micro-interactions */
transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

/* Map flyTo duration */
map.flyTo(coords, zoom, { duration: 1.5 });

/* Smooth scroll */
element.scrollIntoView({ behavior: 'smooth', block: 'center' });

/* Debounce timing */
debounce(callback, 300); // Map movement
debounce(callback, 500); // Search input
```

---

## Z-Index Hierarchy

```css
--z-header: 200;           /* Sticky filter header */
--z-map-controls: 1000;    /* Map zoom/style controls */
--z-marker-default: 100;   /* Regular markers */
--z-marker-hover: 200;     /* Hovered markers */
--z-marker-active: 300;    /* Selected markers */
--z-modal-overlay: 9998;   /* Modal background */
--z-modal-content: 9999;   /* Modal dialog */
```

---

## Essential JavaScript Patterns

### Map Initialization
```javascript
const map = L.map('property-map', {
  center: [37.7749, -122.4194],
  zoom: 12,
  scrollWheelZoom: true,
  zoomControl: false,
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
```

### Custom Marker Creation
```javascript
const icon = L.divIcon({
  className: 'custom-marker-wrapper',
  html: `<div class="custom-marker">$${price}K</div>`,
  iconSize: [60, 36],
  iconAnchor: [30, 42],
});

const marker = L.marker([lat, lng], { icon }).addTo(map);
```

### Synchronization Pattern
```javascript
// Marker click → Scroll to listing
marker.on('click', () => {
  const card = document.querySelector(`[data-property-id="${id}"]`);
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('selected');
});

// Listing hover → Highlight marker
card.addEventListener('mouseenter', () => {
  marker.getElement().classList.add('hover');
});
```

### Infinite Scroll
```javascript
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && hasMore) {
    loadMoreListings();
  }
}, { threshold: 0.1 });

observer.observe(document.getElementById('infinite-loader'));
```

---

## Quick Implementation Steps

1. **Day 1: Layout Structure**
   - Create split-screen HTML structure
   - Add Leaflet map container (left)
   - Add listings panel (right)
   - Implement sticky header

2. **Day 2: Map Setup**
   - Initialize Leaflet with custom markers
   - Add marker clustering
   - Create map controls
   - Add loading states

3. **Day 3: Listing Cards**
   - Build horizontal card component
   - Add hover states and quick actions
   - Implement scrollable container
   - Add skeleton loading

4. **Day 4: Interactivity**
   - Map-to-listing synchronization
   - Listing-to-map highlighting
   - Filter application logic
   - Infinite scroll

5. **Day 5: Polish**
   - Animations and transitions
   - Empty states
   - Mobile responsive
   - Performance optimization

6. **Day 6: Testing**
   - Cross-browser testing
   - Mobile device testing
   - Accessibility audit
   - Performance metrics

---

## Critical Performance Tips

1. **Marker Clustering**: Use for 100+ properties
2. **Image Lazy Loading**: Only load visible images
3. **Debounce Map Events**: 300ms for moveend
4. **Virtual Scrolling**: For 10,000+ listings
5. **Intersection Observer**: For infinite scroll
6. **Web Workers**: For heavy data processing
7. **Request Animation Frame**: For smooth animations

---

## Accessibility Checklist

- [ ] Semantic HTML5 elements
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation support
- [ ] Focus visible styles
- [ ] Alt text on images
- [ ] Color contrast 4.5:1 minimum
- [ ] Screen reader announcements
- [ ] Skip to content link

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Polyfills needed:**
- Intersection Observer (IE11)
- CSS Custom Properties (IE11)

---

## File Structure

```
/public
  /listings.html           ← Main split-screen page
  /listings-style.css      ← Existing styles (update)
  /listings-map.css        ← New map-specific styles
  /listings-map.js         ← Map initialization & interactions
  /listings.js             ← Existing JS (update)
  /images
    /properties            ← Property images (840x560px)
    /agents                ← Agent avatars (56x56px)
```

---

## CDN Resources

```html
<!-- Leaflet -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Leaflet MarkerCluster -->
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>

<!-- Font Awesome -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
```

---

## Contact for Questions

Reference the main design spec at:
**`/Users/default/property-dashboard/ZILLOW_DESIGN_SPEC.md`**

This document contains:
- Complete component specifications
- Full CSS code examples
- JavaScript implementation patterns
- Responsive design details
- State management guide
- Performance optimization strategies
