// NASA API Configuration
const NASA_API_KEY = 'biOo4DgSIuYp6BYVPaNVw7dosxMKfAi6ew04yPWK'; // Replace with your NASA API key
const NEO_API_URL = 'https://api.nasa.gov/neo/rest/v1/feed';
const APOD_API_URL = 'https://api.nasa.gov/planetary/apod';

// Application State
let state = {
	asteroids: [],
	selectedAsteroid: null,
	bookmarks: JSON.parse(localStorage.getItem('asteroidBookmarks')) || [],
	isMetric: true,
	isComparisonMode: false,
	asteroidsForComparison: [],
	currentPage: 'dashboard',
	apodImages: []
};

// DOM Elements
const elements = {
	// Navigation
	navButtons: document.querySelectorAll('.nav-btn'),
	pages: document.querySelectorAll('.page'),
	bookmarkCount: document.getElementById('bookmark-count'),

	// Dashboard Controls
	dateInput: document.getElementById('date-input'),
	todayBtn: document.getElementById('today-btn'),
	unitToggle: document.getElementById('unit-toggle'),
	metric: document.querySelector('.metric'),
	imperial: document.querySelector('.imperial'),

	// Visualizer
	orbitCanvas: document.getElementById('orbit-canvas'),
	timeSlider: document.getElementById('time-slider'),
	timeScaleValue: document.getElementById('time-scale-value'),

	// Asteroid List
	sortSelect: document.getElementById('sort-select'),
	asteroidCards: document.getElementById('asteroid-cards'),
	asteroidCount: document.getElementById('asteroid-count'),
	comparisonBtn: document.getElementById('comparison-btn'),
	comparisonTable: document.getElementById('comparison-table'),
	exitCompareBtn: document.getElementById('exit-compare-btn'),
	asteroidDetail: document.getElementById('asteroid-detail'),

	// Comparison Table Elements
	compareName1: document.getElementById('compare-name-1'),
	compareName2: document.getElementById('compare-name-2'),
	compareDiameter1: document.getElementById('compare-diameter-1'),
	compareDiameter2: document.getElementById('compare-diameter-2'),
	compareSpeed1: document.getElementById('compare-speed-1'),
	compareSpeed2: document.getElementById('compare-speed-2'),
	compareDistance1: document.getElementById('compare-distance-1'),
	compareDistance2: document.getElementById('compare-distance-2'),
	compareStatus1: document.getElementById('compare-status-1'),
	compareStatus2: document.getElementById('compare-status-2'),

	// Other Pages
	learnSections: document.querySelector('.learn-sections'),
	imageGrid: document.getElementById('image-grid'),
	bookmarksGrid: document.getElementById('bookmarks-grid'),

	// Toast Container
	toastContainer: document.getElementById('toast-container')
};

// Initialize the application
function init() {
	// Set today's date as default
	const today = new Date().toISOString().split('T')[0];
	elements.dateInput.value = today;
	elements.dateInput.max = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
	elements.dateInput.min = '1900-01-01';

	// Event Listeners
	setupEventListeners();

	// Load initial data
	fetchAsteroids(today);
	fetchAPODImages();
	loadLearnSections();
	updateBookmarksDisplay();
	updateBookmarkCount();

	// Initialize visualizer
	drawVisualization();
}

// Event Listeners Setup
function setupEventListeners() {
	// Navigation
	elements.navButtons.forEach(button => {
		button.addEventListener('click', () => {
			const page = button.dataset.page;
			switchPage(page);
		});
	});

	// Date controls
	elements.dateInput.addEventListener('change', (e) => {
		fetchAsteroids(e.target.value);
	});

	elements.todayBtn.addEventListener('click', () => {
		const today = new Date().toISOString().split('T')[0];
		elements.dateInput.value = today;
		fetchAsteroids(today);
	});

	// Unit toggle
	elements.unitToggle.addEventListener('change', () => {
		state.isMetric = elements.unitToggle.checked;
		if (state.isMetric) {
			elements.imperial.classList.remove('active');
			elements.metric.classList.add('active')
		} else {
			elements.metric.classList.remove('active');
			elements.imperial.classList.add('active')
		}
		renderAsteroidCards();
		if (state.asteroidsForComparison.length === 2) {
			updateComparisonTable();
		}
	});

	//  sort
	elements.sortSelect.addEventListener('change', sortAsteroids);

	// Visualizer time slider
	elements.timeSlider.addEventListener('input', (e) => {
		const hours = Math.floor(elements.timeSlider.value / 60);
		const minutes = elements.timeSlider.value % 60;
		// Add leading zeros if necessary
		const formattedHours = String(hours).padStart(2, '0');
		const formattedMinutes = String(minutes).padStart(2, '0');

		elements.timeScaleValue.textContent = `${formattedHours}:${formattedMinutes}`;
		drawVisualization();
	});

	// Comparison mode
	elements.comparisonBtn.addEventListener('click', toggleComparisonMode);
	elements.exitCompareBtn.addEventListener('click', toggleComparisonMode);
}

// Page Navigation
function switchPage(page) {
	// Update navigation
	elements.navButtons.forEach(btn => {
		btn.classList.toggle('active', btn.dataset.page === page);
	});

	// Update pages
	elements.pages.forEach(p => {
		p.classList.toggle('active', p.id === `${page}-page`);
	});

	state.currentPage = page;

	// Page-specific actions
	if (page === 'bookmarks') {
		renderBookmarks();
	} else if (page === 'dashboard') {
		drawVisualization();
	}
}

// NASA API Functions
async function fetchAsteroids(date) {
	showLoading('asteroid-cards', 'Loading asteroids from NASA...');

	try {
		const response = await fetch(
			`${NEO_API_URL}?start_date=${date}&end_date=${date}&api_key=${NASA_API_KEY}`
		);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();
		const asteroidsArray = Object.values(data.near_earth_objects).flat();

		// Process asteroid data
		state.asteroids = asteroidsArray.map(asteroid => {
			const date = new Date(asteroid.close_approach_data[0]?.close_approach_date_full);
			const closeTime = (date.getHours() * 60) + date.getMinutes();
		
			return {
				id: asteroid.id,
				name: asteroid.name.replace(/[()]/g, ''),
				diameter: asteroid.estimated_diameter.meters.estimated_diameter_max,
				velocity: asteroid.close_approach_data[0]?.relative_velocity.kilometers_per_hour || 0,
				distance: asteroid.close_approach_data[0]?.miss_distance.kilometers || 0,
				closeApproachDate: asteroid.close_approach_data[0]?.close_approach_date_full || 'N/A',
				orbitalBody: asteroid.close_approach_data[0]?.orbiting_body || 'N/A',
				closeTime   // now a numeric value, not a function
			};
		});

		sortAsteroids();
		showToast('Asteroids Successfully Loaded')

	} catch (error) {
		console.error('Error fetching asteroids:', error);
		showToast(`Failed to load asteroid data: ${error.message}`, 'error');
		elements.asteroidCards.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                Failed to load asteroid data. Please try again later.
            </div>
        `;
	}
}

async function fetchAPODImages() {
	showLoading('image-grid', 'Loading space images from NASA...');

	try {
		const response = await fetch(
			`${APOD_API_URL}?api_key=${NASA_API_KEY}&count=6`
		);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();
		state.apodImages = Array.isArray(data) ? data.slice(0, 6) : [data];

		renderAPODImages();

	} catch (error) {
		console.error('Error fetching APOD images:', error);
		// Fallback to static images
		state.apodImages = [
			{ title: 'Asteroid Bennu Sample Return', url: 'https://images-assets.nasa.gov/image/PIA22455/PIA22455~thumb.jpg' },
			{ title: 'Asteroid Ryugu', url: 'https://images-assets.nasa.gov/image/PIA22724/PIA22724~thumb.jpg' },
			{ title: 'Asteroid Vesta', url: 'https://images-assets.nasa.gov/image/PIA14318/PIA14318~thumb.jpg' },
			{ title: 'Hubble Views Asteroid', url: 'https://images-assets.nasa.gov/image/STScI-H-1920a/STScI-H-1920a~thumb.jpg' }
		];
		renderAPODImages();
		showToast('Using cached space images', 'warning');
	}
}

// Asteroid Filtering and Sorting
function sortAsteroids() {
	const sortBy = elements.sortSelect.value;

	state.asteroids.sort((a, b) => {
		switch (sortBy) {
			case 'size':
				return b.diameter - a.diameter;
			case 'speed':
				return b.velocity - a.velocity;
			default: // distance
				return a.distance - b.distance;
		}
	});

	elements.asteroidCount.textContent = state.asteroids.length;
	renderAsteroidCards();
	drawVisualization();
}

// Render Functions
function renderAsteroidCards() {
	if (state.asteroids.length === 0) {
		elements.asteroidCards.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No asteroids found for the selected date/filter.</p>
                <p>Try a different date.</p>
            </div>
        `;
		return;
	}

	elements.asteroidCards.innerHTML = state.asteroids.map(asteroid => {
		const isBookmarked = state.bookmarks.some(b => b.id === asteroid.id);
		const isSelected = state.selectedAsteroid?.id === asteroid.id;
		const isInComparison = state.asteroidsForComparison.some(a => a.id === asteroid.id);

		return `
            <div class="asteroid-card ${isSelected ? 'selected' : ''}"
                 data-id="${asteroid.id}"
                 onclick="selectAsteroid('${asteroid.id}')">
                <div class="card-header">
                    <h3>${asteroid.name}</h3>
                    <div class="card-actions">
                        ${state.isComparisonMode ? `
                            <button class="compare-select-btn ${isInComparison ? 'selected' : ''}"
                                    onclick="event.stopPropagation(); toggleAsteroidForComparison('${asteroid.id}')">
                                <i class="fas ${isInComparison ? 'fa-check' : 'fa-plus'}"></i>
                                ${isInComparison ? 'Selected' : 'Compare'}
                            </button>
                        ` : `
                            <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}"
                                    onclick="event.stopPropagation(); toggleBookmark('${asteroid.id}')">
                                    
                                <i class="fas ${isBookmarked ? 'fa-star' : 'fa-star'}"></i>
                                ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
                            </button>
                        `}
                    </div>
                </div>
                <div class="card-details">
                    <div class="detail">
                        <span class="label">Size:</span>
                        <span class="value">${formatDiameter(asteroid.diameter)}</span>
                    </div>
                    <div class="detail">
                        <span class="label">Speed:</span>
                        <span class="value">${formatVelocity(asteroid.velocity)}</span>
                    </div>
                    <div class="detail">
                        <span class="label">Closest Distance:</span><br>&emsp;
                        <span class="value">${formatDistance(asteroid.distance)}</span>
                    </div>
                    <div class="detail">
                        <span class="label">Closest Approach:</span><br>&emsp;
                        <span class="value">${asteroid.closeApproachDate}</span>
                    </div>
                </div>
            </div>
        `;
	}).join('');
}

function renderAPODImages() {
	elements.imageGrid.innerHTML = state.apodImages.map(image => `
        <div class="gallery-item">
            <div class="image-container">
                <img src="${image.url || 'https://via.placeholder.com/400x300/7BD3EA/333?text=Space+Image'}" 
                     alt="${image.title}"
                     onerror="this.src='https://via.placeholder.com/400x300/7BD3EA/333?text=Space+Image'">
            </div>
            <div class="image-info">
                <h3>${image.title || 'NASA Space Image'}</h3>
                ${image.explanation ? `
                    <p class="image-description">
                        ${image.explanation.substring(0, 150)}...
                    </p>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function renderBookmarks() {
	if (state.bookmarks.length === 0) {
		elements.bookmarksGrid.innerHTML = `
            <div class="empty-bookmarks">
                <i class="far fa-star"></i>
                <p>No bookmarked asteroids yet!</p>
                <p>Go to the Asteroid Tracker and click the ☆ button to bookmark interesting asteroids.</p>
            </div>
        `;
		return;
	}

	elements.bookmarksGrid.innerHTML = state.bookmarks.map(asteroid => `
        <div class="bookmark-card">
            <h3>${asteroid.name}</h3>
            <div class="bookmark-details">
                <p><strong>Diameter:</strong> ${formatDiameter(asteroid.diameter)}</p>
                <p><strong>Status:</strong> ${asteroid.isHazardous ? '⚠️ Potentially Hazardous' : '✅ Safe'}</p>
                <p><strong>Close Approach:</strong> ${asteroid.closeApproachDate}</p>
            </div>
            <button class="remove-bookmark" onclick="removeBookmark('${asteroid.id}')">
                <i class="fas fa-trash-alt"></i> Remove Bookmark
            </button>
        </div>
    `).join('');
}

// Asteroid Selection
function selectAsteroid(id) {
	const asteroid = state.asteroids.find(a => a.id === id);
	if (!asteroid) return;

	state.selectedAsteroid = asteroid;
	// updateAsteroidDetail(asteroid);

	// Update card selection
	document.querySelectorAll('.asteroid-card').forEach(card => {
		card.classList.toggle('selected', card.dataset.id === id);
	});

	//update asteroid images
	document.querySelectorAll('.asteroid').forEach(a => {
		a.classList.toggle('selected-asteroid', a.id == id)
	});

	const card = document.querySelector('.selected')


	//scrolls to card

	// const rect = card.getBoundingClientRect();
	// let seen = ( rect.bottom > 0 &&
	// 	rect.top < (window.innerHeight || document.documentElement.clientHeight));
	// if(!seen) {
	// 	card.scrollIntoView({
	// 		behavior: 'smooth', 
	// 		block: 'start'
	// 	});
	// }


}


// Comparison Mode
function toggleComparisonMode() {
	state.isComparisonMode = !state.isComparisonMode;
	state.asteroidsForComparison = [];

	elements.comparisonTable.classList.toggle('hidden', !state.isComparisonMode);
	elements.comparisonBtn.innerHTML = state.isComparisonMode ?
		'<i class="fas fa-times"></i> Exit Compare Mode' :
		'<i class="fas fa-balance-scale"></i> Compare Asteroids';

	renderAsteroidCards();

	if (state.isComparisonMode) {
		showToast('Select two asteroids to compare them side by side', 'info');
	}
}

function toggleAsteroidForComparison(id) {
	const asteroid = state.asteroids.find(a => a.id === id);
	if (!asteroid) return;

	const index = state.asteroidsForComparison.findIndex(a => a.id === id);

	if (index > -1) {
		// Remove from comparison
		state.asteroidsForComparison.splice(index, 1);
	} else if (state.asteroidsForComparison.length < 2) {
		// Add to comparison
		state.asteroidsForComparison.push(asteroid);
	} else {
		showToast('You can only compare two asteroids at a time', 'warning');
		return;
	}

	renderAsteroidCards();

	if (state.asteroidsForComparison.length === 2) {
		updateComparisonTable();
	}
}

function updateComparisonTable() {
	const [a1, a2] = state.asteroidsForComparison;

	elements.compareName1.textContent = a1.name;
	elements.compareName2.textContent = a2.name;
	elements.compareDiameter1.textContent = formatDiameter(a1.diameter);
	elements.compareDiameter2.textContent = formatDiameter(a2.diameter);
	elements.compareSpeed1.textContent = formatVelocity(a1.velocity);
	elements.compareSpeed2.textContent = formatVelocity(a2.velocity);
	elements.compareDistance1.textContent = formatDistance(a1.distance);
	elements.compareDistance2.textContent = formatDistance(a2.distance);
	elements.compareStatus1.textContent = a1.isHazardous ? '⚠️ Hazardous' : '✅ Safe';
	elements.compareStatus2.textContent = a2.isHazardous ? '⚠️ Hazardous' : '✅ Safe';
}

// Bookmark Management
function toggleBookmark(id) {
	const asteroid = state.asteroids.find(a => a.id === id);
	if (!asteroid) return;

	const index = state.bookmarks.findIndex(b => b.id === id);
	if (index > -1) {
		// Remove bookmark
		state.bookmarks.splice(index, 1);
		showToast('Asteroid removed from bookmarks', 'info');
	} else {
		// Add bookmark
		state.bookmarks.push(asteroid);
		showToast('Asteroid bookmarked!', 'success');
	}

	// Save to localStorage
	localStorage.setItem('asteroidBookmarks', JSON.stringify(state.bookmarks));

	// Update UI
	updateBookmarkCount();
	renderAsteroidCards();

	// If on bookmarks page, update it
	if (state.currentPage === 'bookmarks') {
		renderBookmarks();
	}
}

function removeBookmark(id) {
	state.bookmarks = state.bookmarks.filter(b => b.id !== id);
	localStorage.setItem('asteroidBookmarks', JSON.stringify(state.bookmarks));
	updateBookmarkCount();
	renderBookmarks();
	showToast('Bookmark removed', 'info');
}

function updateBookmarkCount() {
	elements.bookmarkCount.textContent = state.bookmarks.length;
}

// Unit Formatting Functions
function formatDistance(km) {
	if (state.isMetric) {
		return `${(km / 1e6).toFixed(2)} million km`;
	} else {
		return `${(km / 1.609e6).toFixed(2)} million miles`;
	}
}

function formatDiameter(meters) {
	if (state.isMetric) {
		return `${meters.toFixed(0)} m`;
	} else {
		return `${(meters * 3.28084).toFixed(0)} ft`;
	}
}

function formatVelocity(kph) {
	if (state.isMetric) {
		return `${(kph / 1).toFixed(0)} km/h`;
	} else {
		return `${(kph * 0.621371).toFixed(0)} mph`;
	}
}

function drawVisualization() {
	const canvas = elements.orbitCanvas;
	const time = parseFloat(elements.timeSlider.value);

	canvas.innerHTML = `<img src="pictures/earth.jpg" id = "earth-pic" alt="earth">
	`;

	const asteroids = state.asteroids;
	const maxDiameter = Math.max(...asteroids.map(a => a.diameter), 1);
	const maxDistance = Math.max(...asteroids.map(asteroid=>Number(asteroid.distance) + 120*Number(asteroid.velocity)), 1);
	

	asteroids.forEach((asteroid, index) => {
		const rect = canvas.getBoundingClientRect(); 

		const size = Math.max(3, (asteroid.diameter / maxDiameter) * 20);
		// const size = Math.max(5, (asteroid.diameter / maxDiameter) * 30);
		const distance = Number(asteroid.distance) + Math.abs((time-asteroid.closeTime)/6)*Number(asteroid.velocity);
		const drawDistance = (distance / maxDistance)*.45 +.40;
		const angle = (index / asteroids.length) * Math.PI * 2 + 2*Math.PI*time/1400;
		let x = (Math.cos(angle) * drawDistance) * 50; 
		let y = (Math.sin(angle) * drawDistance)/2 * 100;
		
		const newAsteroid = document.createElement("img");
		newAsteroid.src = "pictures/asteroid.png";
		newAsteroid.classList.add('asteroid');
		newAsteroid.style.width = size + "%";
		newAsteroid.style.height = size + "%";
		newAsteroid.style.left = (50 + x ) + "%";
		newAsteroid.style.top  = (50 + y ) + "%";
		newAsteroid.id = asteroid.id;

		canvas.appendChild(newAsteroid);

		newAsteroid.addEventListener('click', () => {
			selectAsteroid(newAsteroid.id);
		});
	})

}


// Learn Page Content
function loadLearnSections() {
	const sections = [
		{
			title: 'What Are Asteroids?',
			content: 'Asteroids are rocky objects that orbit the Sun, mostly found in the asteroid belt between Mars and Jupiter. They are remnants from the early formation of our solar system about 4.6 billion years ago.',
			funFact: 'The largest asteroid, Ceres, is so big it\'s also classified as a dwarf planet!'
		},
		{
			title: 'What Are Near-Earth Asteroids?',
			content: 'Near-Earth Asteroids (NEAs) are asteroids whose orbits bring them close to Earth\'s orbit. NASA tracks over 28,000 known near-Earth asteroids to monitor any potential impact risks.',
			funFact: 'The first NEA was discovered in 1898 - it\'s called 433 Eros!'
		},
		{
			title: 'How Big Are They?',
			content: 'Asteroids range in size from tiny pebbles to objects hundreds of kilometers across. The largest known asteroid, Ceres, is about 940 km in diameter - about the size of Texas!',
			funFact: 'Most asteroids are smaller than a school bus!'
		},
		{
			title: 'What Makes an Asteroid Potentially Hazardous?',
			content: 'An asteroid is classified as potentially hazardous if it comes within 7.5 million kilometers of Earth\'s orbit AND is larger than about 140 meters in diameter. This doesn\'t mean it will hit Earth, just that it warrants careful observation.',
			funFact: 'Only about 1% of near-Earth asteroids larger than 1 km remain undiscovered!'
		},
		{
			title: 'How Do We Protect Earth?',
			content: 'NASA\'s Planetary Defense Coordination Office monitors asteroids and develops strategies for planetary defense. In 2022, the DART mission successfully demonstrated we could change an asteroid\'s orbit by crashing a spacecraft into it!',
			funFact: 'We have about 100 years of advance warning for most potentially hazardous asteroids!'
		}
	];

	elements.learnSections.innerHTML = sections.map((section, index) => `
        <div class="learn-section" onclick="toggleLearnSection(${index})">
            <h3>
                ${section.title}
                <span class="expand-icon">▼</span>
            </h3>
            <div class="section-content">
                <p>${section.content}</p>
                <div class="fun-fact">
                    <strong>Fun Fact:</strong> ${section.funFact}
                </div>
            </div>
        </div>
    `).join('');
}

function toggleLearnSection(index) {
	const section = elements.learnSections.children[index];
	section.classList.toggle('expanded');

	// Close other sections
	Array.from(elements.learnSections.children).forEach((s, i) => {
		if (i !== index) {
			s.classList.remove('expanded');
		}
	});
}

// Toast Notification System
function showToast(message, type = 'info') {
	const toast = document.createElement('div');
	toast.className = `toast ${type}`;
	toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;

	elements.toastContainer.appendChild(toast);

	// Remove toast after 4 seconds
	setTimeout(() => {
		toast.style.opacity = '0';
		toast.style.transform = 'translateX(100%)';
		setTimeout(() => {
			if (toast.parentNode) {
				toast.parentNode.removeChild(toast);
			}
		}, 300);
	}, 4000);
}

function getToastIcon(type) {
	switch (type) {
		case 'success': return 'check-circle';
		case 'error': return 'exclamation-circle';
		case 'warning': return 'exclamation-triangle';
		default: return 'info-circle';
	}
}

// Utility Functions
function showLoading(containerId, message) {
	const container = document.getElementById(containerId);
	if (container) {
		container.innerHTML = `
            <div class="loading-message">
                <i class="fas fa-satellite-dish fa-spin"></i> ${message}
            </div>
        `;
	}
}

function updateBookmarksDisplay() {
	if (state.currentPage === 'bookmarks') {
		renderBookmarks();
	}
}

// Make functions available globally for onclick handlers
window.selectAsteroid = selectAsteroid;
window.toggleBookmark = toggleBookmark;
window.toggleAsteroidForComparison = toggleAsteroidForComparison;
window.removeBookmark = removeBookmark;
window.toggleLearnSection = toggleLearnSection;

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);