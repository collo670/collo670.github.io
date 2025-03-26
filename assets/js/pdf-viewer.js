function initPDFViewer(pdfUrl) {
    let pdfDoc = null,
        pageNum = 1,
        pageRendering = false,
        pageNumPending = null,
        scale = 0.8,  // Initial scale
        canvas = document.getElementById('pdf-render'),
        ctx = canvas.getContext('2d'),
        pdfContainer = document.querySelector('.pdf-container');

    const SCALE_STEP = 0.2;
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 2.5;

    // Initialize PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

    // Search functionality variables
    let searchText = '';
    let currentMatch = -1;
    let matches = [];

    // Add zoom controls
    function zoomIn() {
        if (scale >= MAX_SCALE) return;
        scale += SCALE_STEP;
        renderPage(pageNum);
        updateZoomLevel();
    }

    function zoomOut() {
        if (scale <= MIN_SCALE) return;
        scale -= SCALE_STEP;
        renderPage(pageNum);
        updateZoomLevel();
    }

    function updateZoomLevel() {
        const zoomPercent = Math.round(scale * 100);
        document.getElementById('zoom-level').textContent = `${zoomPercent}%`;
    }

    // Render the page
    function renderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
            return;
        }
        
        pageRendering = true;
        document.getElementById('page-num').textContent = num;

        pdfDoc.getPage(num).then(function(page) {
            const viewport = page.getViewport({scale: scale});
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
                enableWebGL: true,  // Enable WebGL for better rendering
                renderInteractiveForms: false  // Disable form rendering for better performance
            };
            
            return page.render(renderContext).promise.then(() => {
                pageRendering = false;
                if (pageNumPending !== null) {
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }
                updateZoomLevel();
            });
        });
    }

    // Get Document
    pdfjsLib.getDocument(pdfUrl).promise.then(function(pdfDoc_) {
        pdfDoc = pdfDoc_;
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        renderPage(pageNum);
        updateZoomLevel();
    });

    // Previous page
    document.getElementById('prev').addEventListener('click', function() {
        if (pageNum <= 1 || pageRendering) return;
        pageNum--;
        pdfContainer.scrollTop = 0;
        renderPage(pageNum);
    });

    // Next page
    document.getElementById('next').addEventListener('click', function() {
        if (pageNum >= pdfDoc.numPages || pageRendering) return;
        pageNum++;
        pdfContainer.scrollTop = 0;
        renderPage(pageNum);
    });

    // Search functionality
    async function searchPDF() {
        matches = [];
        currentMatch = -1;
        searchText = document.getElementById('search-input').value;
        
        if (!searchText) {
            document.getElementById('search-info').textContent = '';
            return;
        }

        for (let pageIndex = 1; pageIndex <= pdfDoc.numPages; pageIndex++) {
            const page = await pdfDoc.getPage(pageIndex);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');
            
            if (text.toLowerCase().includes(searchText.toLowerCase())) {
                matches.push(pageIndex);
            }
        }

        updateSearchInfo();
        if (matches.length > 0) {
            currentMatch = 0;
            pageNum = matches[0];
            renderPage(pageNum);
        }
    }

    function updateSearchInfo() {
        const info = matches.length > 0 
            ? `Found ${matches.length} matches. Showing ${currentMatch + 1}/${matches.length}`
            : 'No matches found';
        document.getElementById('search-info').textContent = info;
    }

    function nextMatch() {
        if (matches.length === 0) return;
        currentMatch = (currentMatch + 1) % matches.length;
        pageNum = matches[currentMatch];
        renderPage(pageNum);
        updateSearchInfo();
    }

    function previousMatch() {
        if (matches.length === 0) return;
        currentMatch = (currentMatch - 1 + matches.length) % matches.length;
        pageNum = matches[currentMatch];
        renderPage(pageNum);
        updateSearchInfo();
    }

    // Add event listeners for search
    document.getElementById('search-button').addEventListener('click', searchPDF);
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPDF();
        }
    });
    document.getElementById('next-match').addEventListener('click', nextMatch);
    document.getElementById('prev-match').addEventListener('click', previousMatch);

    // Add zoom event listeners
    document.getElementById('zoom-in').addEventListener('click', zoomIn);
    document.getElementById('zoom-out').addEventListener('click', zoomOut);

    // Add wheel zoom with Ctrl key
    pdfContainer.addEventListener('wheel', function(e) {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        }
    });
}