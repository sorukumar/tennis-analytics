// components/include.js
document.addEventListener('DOMContentLoaded', function () {
    // Get the current page path to determine relative path to root
    const currentPath = window.location.pathname;
    const inSubfolder = currentPath.includes('/viz/') || currentPath.includes('/stantheman/') ||
        currentPath.includes('/bigthree/') || currentPath.includes('/summercamp/') || currentPath.includes('/nbi/') ||
        currentPath.includes('/gsdi/') || currentPath.includes('/globaltop100evolution/') || currentPath.includes('/network/') ||
        currentPath.includes('/indianplayers/');
    const pathPrefix = inSubfolder ? '../' : '';

    // Load header
    fetch(`${pathPrefix}components/header.html`)
        .then(response => response.text())
        .then(data => {
            // Replace relative paths based on current location
            if (inSubfolder) {
                // For subfolder pages, relative links (../) in the header fragment are already correct
                document.body.insertAdjacentHTML('afterbegin', data);
            } else {
                // For root level, remove the "../" prefix from links
                const adjustedData = data
                    .replace(/href="\.\.\//g, 'href="')
                    .replace(/src="\.\.\//g, 'src="');
                document.body.insertAdjacentHTML('afterbegin', adjustedData);
            }

            // Highlight current page in navigation
            setTimeout(() => {
                const navLinks = document.querySelectorAll('.nav-links a');
                const currentPage = window.location.pathname.split('/').pop();

                navLinks.forEach(link => {
                    const linkPage = link.getAttribute('href').split('/').pop();
                    if (linkPage === currentPage ||
                        (currentPage === 'index.html' && link.classList.contains('home-link'))) {
                        link.classList.add('active');
                    }
                });
            }, 100);
        });

    // Load footer
    fetch(`${pathPrefix}components/footer.html`)
        .then(response => response.text())
        .then(data => {
            // Replace relative paths based on current location
            if (inSubfolder) {
                // Already has correct paths for subfolders
                document.body.insertAdjacentHTML('beforeend', data);
            } else {
                // For root level, remove "../" prefix
                const adjustedData = data
                    .replace(/href="\.\.\//g, 'href="')
                    .replace(/src="\.\.\//g, 'src="');
                document.body.insertAdjacentHTML('beforeend', adjustedData);
            }
        });
});