// logo-drag.js - Standalone script for draggable logo icon with click-to-new-tab redirect

document.addEventListener('DOMContentLoaded', () => {
  const logoIcon = document.getElementById('logo-icon');
  if (!logoIcon) {
    console.error('Logo icon element not found!');
    return;
  }

  let isDragging = false;
  let currentX = logoIcon.offsetLeft;
  let currentY = logoIcon.offsetTop;
  let initialX, initialY;
  let dragStartX, dragStartY; // To track movement distance
  const DRAG_THRESHOLD = 5; // Minimum pixels to consider it a drag

  // Initialize position
  logoIcon.style.position = 'absolute';
  logoIcon.style.left = `${currentX}px`;
  logoIcon.style.top = `${currentY}px`;

  // Mouse down to start dragging
  logoIcon.addEventListener('mousedown', (e) => {
    isDragging = true;
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    logoIcon.classList.add('dragging');
    e.preventDefault(); // Prevent text selection
    console.log('Mouse down, starting drag detection');
  });

  // Mouse move to update position
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = Math.abs(e.clientX - dragStartX);
      const dy = Math.abs(e.clientY - dragStartY);
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        // Constrain within viewport
        const rect = logoIcon.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        logoIcon.style.left = `${currentX}px`;
        logoIcon.style.top = `${currentY}px`;
        console.log('Dragging, position updated:', { x: currentX, y: currentY });
      }
    }
  });

  // Mouse up to stop dragging
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      logoIcon.classList.remove('dragging');
      console.log('Drag ended');
    }
  });

  // Click to open chatbot.html in new tab
  logoIcon.addEventListener('click', (e) => {
    const dx = Math.abs(e.clientX - dragStartX);
    const dy = Math.abs(e.clientY - dragStartY);
    if (!isDragging && dx <= DRAG_THRESHOLD && dy <= DRAG_THRESHOLD) {
      e.preventDefault();
      console.log('Click detected, opening chatbot.html in new tab');
      window.open('chatbot.html', '_blank'); // Open in new tab
    } else {
      console.log('Click ignored due to drag movement:', { dx, dy });
    }
  });

  // Prevent default drag behavior on the image
  logoIcon.querySelector('img').addEventListener('dragstart', (e) => {
    e.preventDefault();
  });
});

// Error handling for console
window.addEventListener('error', (e) => {
  console.error('JavaScript error:', e.message);
});