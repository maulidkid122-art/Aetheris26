// ============================================================
// AETHERIS 26 — ENHANCED FILTER WITH PHOTO SYSTEM
// FOKUS: Real student photos dengan fallback system
// ============================================================

// ===== DEPARTMENT CONFIGURATION =====
const DEPT_LABELS = {
    'PPLG': 'PPLG', 'DKV': 'DKV', 'TKJ': 'TKJ', 'TKR': 'TKR',
    'TET': 'TET', 'TLG': 'TLG', 'TLM': 'TLM', 'MPL': 'MPL',
    'AKL': 'AKL', 'TKF': 'TKF', 'PM': 'PM'
};

const DEPT_COLORS = {
    'PPLG': '#FFE065', 'DKV': '#45C7E2', 'TKJ': '#95CEFF', 'TKR': '#FF6B6B',
    'TET': '#F5C36D', 'TLG': '#B8A4FF', 'TLM': '#FF8CB8', 'MPL': '#6FFFE9',
    'AKL': '#FFC270', 'TKF': '#90EE90', 'PM': '#FFB6C1'
};

// ===== PHOTO PATH CONFIGURATION =====
const PHOTO_CONFIG = {
    basePath: 'assets/images/siswa/',
    fallbackPath: 'assets/images/siswa/placeholder.webp',
    format: '.webp', // atau '.jpg', '.png'
};

// ===== DOM ELEMENTS =====
const gallery = document.getElementById('galleryGrid');
const filterContainer = document.getElementById('filterContainer');
const searchInput = document.getElementById('searchInput');
const searchClear = document.querySelector('.search-clear');
const studentCount = document.getElementById('studentCount');

// ===== STATE =====
let activeFilter = 'all';
let searchTerm = '';
let photoCache = new Set(); // Track which photos exist

// ===== PHOTO UTILITIES =====
/**
 * Generate photo filename from student name
 * Format: NAMA-LENGKAP.webp (all caps, spaces to hyphens)
 */
function getPhotoFilename(nama) {
    return nama
        .toUpperCase()
        .trim()
        .replace(/\s+/g, '-') // Space jadi hyphen
        .replace(/[^\w-]/g, '') // Remove special chars
        + PHOTO_CONFIG.format;
}

/**
 * Get full photo path
 */
function getPhotoPath(nama) {
    const filename = getPhotoFilename(nama);
    return PHOTO_CONFIG.basePath + filename;
}

/**
 * Check if photo exists (with caching)
 */
function checkPhotoExists(nama, callback) {
    const photoPath = getPhotoPath(nama);
    
    // Return from cache if checked before
    if (photoCache.has(photoPath)) {
        callback(true);
        return;
    }
    
    // Test image load
    const img = new Image();
    img.onload = () => {
        photoCache.add(photoPath);
        callback(true);
    };
    img.onerror = () => {
        callback(false);
    };
    img.src = photoPath;
}

/**
 * Get initials as fallback
 */
function getInitials(nama) {
    return nama
        .split(' ')
        .filter(word => word.length > 2)
        .slice(0, 2)
        .map(word => word[0])
        .join('');
}

// ===== 1. SMART URL FILTERING =====
function initSmartFilter() {
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get('filter');
    
    if (filterParam && DEPT_LABELS[filterParam]) {
        activeFilter = filterParam;
        
        // Scroll to controls after brief delay
        setTimeout(() => {
            const controls = document.querySelector('.controls');
            if (controls) {
                const offset = controls.offsetTop - 20;
                window.scrollTo({ top: offset, behavior: 'smooth' });
            }
        }, 500);
    }
}

// ===== 2. GENERATE FILTER BUTTONS =====
function generateFilterButtons() {
    const departments = {};
    dataAngkatan.forEach(siswa => {
        const dept = siswa.kelas.replace(/\s*\d+$/, '').replace('XI ', '');
        departments[dept] = (departments[dept] || 0) + 1;
    });

    const sorted = Object.entries(departments).sort((a, b) => b[1] - a[1]);
    
    let buttonsHTML = `
        <button class="filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-class="all">
            <span>Semua</span>
            <span class="filter-count">${dataAngkatan.length}</span>
        </button>
    `;
    
    sorted.forEach(([dept, count]) => {
        const color = DEPT_COLORS[dept] || '#FFE065';
        const isActive = activeFilter === dept;
        buttonsHTML += `
            <button class="filter-btn ${isActive ? 'active' : ''}" data-class="${dept}" style="--dept-color: ${color}">
                <span>${DEPT_LABELS[dept] || dept}</span>
                <span class="filter-count">${count}</span>
            </button>
        `;
    });
    
    filterContainer.innerHTML = buttonsHTML;
    
    // Attach click handlers
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.class;
            
            // Update URL
            const newUrl = activeFilter === 'all' 
                ? window.location.pathname 
                : `${window.location.pathname}?filter=${activeFilter}`;
            window.history.replaceState({}, '', newUrl);
            
            filterSiswa();
        });
    });
}

// ===== 3. FILTER LOGIC =====
function filterSiswa() {
    const filtered = dataAngkatan.filter(siswa => {
        const searchMatch = !searchTerm || 
            siswa.nama.toLowerCase().includes(searchTerm) ||
            siswa.kelas.toLowerCase().includes(searchTerm);
        
        const dept = siswa.kelas.replace(/\s*\d+$/, '').replace('XI ', '');
        const deptMatch = activeFilter === 'all' || dept === activeFilter;
        
        return searchMatch && deptMatch;
    });
    
    renderGallery(filtered);
    updateStudentCount(filtered.length);
}

// ===== 4. RENDER GALLERY WITH PHOTOS =====
function renderGallery(data) {
    if (data.length === 0) {
        gallery.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                </div>
                <h3>Tidak ada hasil</h3>
                <p>Coba kata kunci lain atau ubah filter jurusan</p>
            </div>
        `;
        return;
    }
    
    gallery.innerHTML = data.map((siswa, index) => {
        const dept = siswa.kelas.replace(/\s*\d+$/, '').replace('XI ', '');
        const color = DEPT_COLORS[dept] || '#FFE065';
        const initials = getInitials(siswa.nama);
        const photoPath = getPhotoPath(siswa.nama);
        
        return `
            <div class="siswa-card" style="--dept-color: ${color}" onclick="openModal(${index}, '${siswa.nama.replace(/'/g, "\\'")}')">
                <div class="card-photo">
                    <!-- Real photo dengan lazy loading -->
                    <img 
                        class="card-photo-img lazyload" 
                        data-src="${photoPath}"
                        alt="${siswa.nama}"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    />
                    <!-- Fallback initials (hidden until photo fails) -->
                    <div class="card-initials" style="background: linear-gradient(135deg, ${color}22, ${color}11); display: none;">
                        <span style="color: ${color}">${initials}</span>
                    </div>
                    <!-- Department badge -->
                    <div class="card-dept-badge" style="background: ${color}33; color: ${color}; border: 1px solid ${color}44;">
                        ${DEPT_LABELS[dept] || dept}
                    </div>
                </div>
                <div class="card-info">
                    <h3 class="card-name">${siswa.nama}</h3>
                    <p class="card-class">
                        <span class="card-class-dot" style="background: ${color}"></span>
                        ${siswa.kelas}
                    </p>
                </div>
                <div class="card-click-hint">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </div>
            </div>
        `;
    }).join('');
    
    // Animate cards in
    setTimeout(() => {
        document.querySelectorAll('.siswa-card').forEach((card, i) => {
            setTimeout(() => card.style.opacity = '1', i * 30);
        });
    }, 50);
    
    // Initialize lazy loading
    initLazyLoad();
}

// ===== 5. LAZY LOADING IMAGES =====
function initLazyLoad() {
    const images = document.querySelectorAll('.lazyload');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazyload');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for older browsers
        images.forEach(img => {
            img.src = img.dataset.src;
        });
    }
}

// ===== 6. ENHANCED MODAL WITH PHOTO =====
function openModal(index, nama) {
    const siswa = dataAngkatan.find(s => s.nama === nama);
    if (!siswa) return;
    
    const dept = siswa.kelas.replace(/\s*\d+$/, '').replace('XI ', '');
    const color = DEPT_COLORS[dept] || '#FFE065';
    const initials = getInitials(siswa.nama);
    const photoPath = getPhotoPath(siswa.nama);
    
    // Generate quote & IG
    const quotes = [
        "Keep pushing forward, dreams are closer than they seem.",
        "Every ending is a new beginning.",
        "The best is yet to come.",
        "Rise above the horizons.",
        "Stay hungry, stay foolish."
    ];
    const quote = siswa.quotes || quotes[Math.floor(Math.random() * quotes.length)];
    const igHandle = siswa.ig || `@${nama.toLowerCase().split(' ')[0]}`;
    
    const modal = document.getElementById('studentModal');
    const modalContent = modal.querySelector('.glass-modal .modal-body');
    
    modal.style.setProperty('--dept-color', color);
    
    // Build modal dengan FOTO REAL (priority)
    modalContent.innerHTML = `
        <div class="modal-top">
            <div class="modal-photo-wrap">
                <!-- FOTO HD REAL -->
                <img 
                    class="modal-photo" 
                    src="${photoPath}"
                    alt="${siswa.nama}"
                    style="border: 3px solid ${color}; box-shadow: 0 0 30px ${color}66;"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                />
                <!-- Fallback initials (only if photo fails) -->
                <div class="modal-initials" style="background: linear-gradient(135deg, ${color}, ${adjustColor(color, -20)}); display: none;">
                    <span style="font-size: 2rem; font-weight: 700; color: #080E1A;">${initials}</span>
                </div>
                <!-- Department badge -->
                <div class="modal-dept-badge" style="background: ${color}; color: #080E1A;">
                    ${DEPT_LABELS[dept] || dept}
                </div>
            </div>
            <div class="modal-info">
                <span class="modal-no">AETHERIAN #${String(index + 1).padStart(3, '0')}</span>
                <h2 class="modal-name">${siswa.nama}</h2>
                <div class="modal-dept">
                    <span class="modal-dept-dot" style="background: ${color}"></span>
                    <span>${siswa.kelas}</span>
                </div>
                <blockquote class="modal-quote" style="border-color: ${color}">
                    "${quote}"
                </blockquote>
                <div class="modal-socmed">
                    <span class="socmed-label">Connect</span>
                    <a href="https://instagram.com/${igHandle.replace('@', '')}" target="_blank" class="socmed-btn" title="Instagram">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                        </svg>
                    </a>
                    <a href="#" class="socmed-btn" onclick="return false" title="LinkedIn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                            <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
                        </svg>
                    </a>
                    <a href="#" class="socmed-btn" onclick="return false" title="Portfolio">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
                        </svg>
                    </a>
                </div>
            </div>
        </div>
        <div class="modal-footer-bar" style="background: linear-gradient(90deg, ${color}22, transparent)">
            <span style="color: ${color}; font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.2em;">
                AETHERIS MMXXVI · RISING ABOVE HORIZONS
            </span>
        </div>
    `;
    
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// ===== UTILITY FUNCTIONS =====
function adjustColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

function updateStudentCount(count) {
    if (studentCount) {
        studentCount.innerHTML = `<span>${count}</span> Siswa`;
    }
}

// ===== SEARCH HANDLERS =====
searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    filterSiswa();
    
    if (searchClear) {
        searchClear.classList.toggle('visible', searchTerm.length > 0);
    }
});

if (searchClear) {
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchTerm = '';
        searchClear.classList.remove('visible');
        searchInput.focus();
        filterSiswa();
    });
}

// ===== MODAL HANDLERS =====
const modal = document.getElementById('studentModal');
const modalBackdrop = document.querySelector('.modal-backdrop');
const modalClose = document.querySelector('.modal-close');

function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
}

if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
    }
});

// ===== INITIALIZE =====
function init() {
    initSmartFilter();
    generateFilterButtons();
    filterSiswa();
    
    // Fade in body
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 50);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}