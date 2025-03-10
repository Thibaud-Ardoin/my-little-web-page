async function loadContent() {
    try {
        const response = await fetch('content.json');
        const content = await response.json();
        return content;
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

function updateProfileCard(content) {
    const profile = content.profile;
    document.querySelector('.profile-image').src = profile.image;
    document.querySelector('.profile-card h1').textContent = profile.name;
    
    // Update bio with LaTeX
    const bioElement = document.querySelector('.bio');
    bioElement.textContent = profile.title;
    
    // Render LaTeX
    renderMathInElement(bioElement, {
        delimiters: [
            {left: "\\(", right: "\\)", display: false},
            {left: "\\[", right: "\\]", display: true}
        ]
    });
    
    // Update social links
    const socialLinks = document.querySelectorAll('.social-links a');
    socialLinks[0].href = `mailto:${profile.social.email}`;
    socialLinks[1].href = profile.social.linkedin;
    socialLinks[2].href = profile.social.scholar;
    socialLinks[3].href = profile.social.github;
}

function updatePageContent(content, pageName) {
    switch(pageName) {
        case 'index':
            document.querySelector('.description').textContent = content.profile.description;
            break;
        case 'cv':
            updateCV(content.cv);
            break;
        case 'projects':
            updateProjects(content.projects);
            break;
        case 'personal':
            updatePersonalProjects(content.personal_projects);
            break;
        case 'blog':
            updateBlog(content.blog_posts);
            break;
    }
}

// Fonctions spécifiques pour chaque page
function updateCV(cvContent) {
    // Logique pour mettre à jour le CV
}

function updateProjects(projects) {
    // Logique pour mettre à jour les projets
}

function updatePersonalProjects(personalProjects) {
    // Logique pour mettre à jour les projets personnels
}

function updateBlog(blogPosts) {
    // Logique pour mettre à jour le blog
}

// Add at the end of the file
document.addEventListener('DOMContentLoaded', () => {
    renderMathInElement(document.body, {
        delimiters: [
            {left: "\\(", right: "\\)", display: false},
            {left: "\\[", right: "\\]", display: true}
        ]
    });
}); 