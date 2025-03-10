async function loadProjectCard() {
    try {
        const response = await fetch('templates/project-card.html');
        return await response.text();
    } catch (error) {
        console.error('Erreur lors du chargement du template de projet:', error);
        return null;
    }
}

async function loadCVSection() {
    try {
        const response = await fetch('templates/cv-section.html');
        return await response.text();
    } catch (error) {
        console.error('Erreur lors du chargement du template de section CV:', error);
        return null;
    }
}

function createEducationHTML(education) {
    return education.map(item => `
        <div class="education-item">
            <div class="education-period">${item.period}</div>
            <h3 class="education-title">${item.title}</h3>
            <div class="education-institution">${item.institution}</div>
            ${item.description ? `<div class="education-description">${item.description}</div>` : ''}
        </div>
    `).join('');
}

function createSkillsHTML(skills) {
    return `
        <div class="skills-grid">
            <div class="skill-category">
                <h3>Programmation</h3>
                <ul class="skill-list">
                    ${skills.programming.map(skill => `<li class="skill-item">${skill}</li>`).join('')}
                </ul>
            </div>
            <div class="skill-category">
                <h3>Frameworks</h3>
                <ul class="skill-list">
                    ${skills.frameworks.map(skill => `<li class="skill-item">${skill}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

function createAboutHTML(about) {
    return `
        <div class="about-content">
            <p>${about.content}</p>
        </div>
    `;
}

function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '50px'
    });

    document.querySelectorAll('.cv-section').forEach(section => {
        observer.observe(section);
    });
}

async function loadContent() {
    try {
        // Charger le contenu JSON
        const response = await fetch('content.json');
        const content = await response.json();
        
        // Configurer MathJax
        window.MathJax = {
            tex2jax: {
                inlineMath: [['\\(', '\\)']],
                displayMath: [['\\[', '\\]']]
            },
            "HTML-CSS": { linebreaks: { automatic: true } },
            SVG: { linebreaks: { automatic: true } }
        };

        // Charger MathJax si nécessaire
        if (!window.MathJax || !window.MathJax.Hub) {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }
        
        // Attendre que le template soit chargé
        await new Promise(resolve => {
            if (document.querySelector('.profile-card')) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (document.querySelector('.profile-card')) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });

        // Mettre à jour la carte de profil
        const profileCard = document.querySelector('.profile-card');
        if (profileCard) {
            const img = profileCard.querySelector('.profile-image');
            const h1 = profileCard.querySelector('h1');
            const bio = profileCard.querySelector('.bio');
            
            if (img) img.src = content.profile.image;
            if (h1) h1.textContent = content.profile.name;
            if (bio) {
                bio.innerHTML = content.profile.title;
                // Attendre que MathJax soit prêt
                await new Promise(resolve => setTimeout(resolve, 100));
                if (window.MathJax && window.MathJax.Hub) {
                    MathJax.Hub.Queue(["Typeset", MathJax.Hub, bio]);
                }
            }
            
            // Mettre à jour les liens sociaux
            const socialLinks = profileCard.querySelector('.social-links');
            if (socialLinks) {
                const emailLink = socialLinks.querySelector('a[href^="mailto:"]');
                const linkedinLink = socialLinks.querySelector('a[href*="linkedin"]');
                const scholarLink = socialLinks.querySelector('a[href*="scholar"]');
                const githubLink = socialLinks.querySelector('a[href*="github"]');
                
                if (emailLink) emailLink.href = `mailto:${content.profile.social.email}`;
                if (linkedinLink) linkedinLink.href = content.profile.social.linkedin;
                if (scholarLink) scholarLink.href = content.profile.social.scholar;
                if (githubLink) githubLink.href = content.profile.social.github;
            }
        }

        // Mettre à jour le contenu principal
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            const pageName = window.location.pathname.split('/').pop() || 'index.html';
            
            // Gérer les différentes pages
            switch(pageName) {
                case 'projects.html':
                    const projectsContainer = mainContent.querySelector('.projects-grid');
                    if (projectsContainer && content.projects) {
                        const projectTemplate = await loadProjectCard();
                        if (projectTemplate) {
                            projectsContainer.innerHTML = '';
                            content.projects.forEach(project => {
                                const projectElement = document.createElement('div');
                                projectElement.innerHTML = projectTemplate;
                                
                                const img = projectElement.querySelector('.project-img');
                                const title = projectElement.querySelector('h3');
                                const description = projectElement.querySelector('.project-description');
                                const codeLink = projectElement.querySelector('.project-link:first-child');
                                const demoLink = projectElement.querySelector('.project-link:last-child');
                                
                                if (img) {
                                    img.src = project.image;
                                    img.alt = project.title;
                                }
                                if (title) title.textContent = project.title;
                                if (description) description.textContent = project.description;
                                if (codeLink) codeLink.href = project.github;
                                if (demoLink) demoLink.href = project.demo;
                                
                                projectsContainer.appendChild(projectElement);
                            });
                        }
                    }
                    break;

                case 'cv.html':
                    const cvTemplate = await loadCVSection();
                    if (cvTemplate && content.cv) {
                        const projectsGrid = mainContent.querySelector('.projects-grid');
                        if (projectsGrid) {
                            projectsGrid.innerHTML = ''; // Vider le conteneur
                            
                            // Section À propos
                            if (content.cv.about) {
                                const aboutSection = document.createElement('div');
                                aboutSection.innerHTML = cvTemplate;
                                aboutSection.querySelector('.section-title').textContent = content.cv.about.title;
                                aboutSection.querySelector('.section-body').innerHTML = createAboutHTML(content.cv.about);
                                projectsGrid.appendChild(aboutSection);
                            }
                            
                            // Section Éducation
                            if (content.cv.education) {
                                const educationSection = document.createElement('div');
                                educationSection.innerHTML = cvTemplate;
                                educationSection.querySelector('.section-title').textContent = 'Formation';
                                educationSection.querySelector('.section-body').innerHTML = createEducationHTML(content.cv.education);
                                projectsGrid.appendChild(educationSection);
                            }
                            
                            // Section Compétences
                            if (content.cv.skills) {
                                const skillsSection = document.createElement('div');
                                skillsSection.innerHTML = cvTemplate;
                                skillsSection.querySelector('.section-title').textContent = 'Compétences';
                                skillsSection.querySelector('.section-body').innerHTML = createSkillsHTML(content.cv.skills);
                                projectsGrid.appendChild(skillsSection);
                            }
                            
                            // Configurer les animations au défilement
                            setupScrollAnimations();
                        }
                    }
                    break;

                default:
                    // Pour les autres pages, charger le contenu normal depuis pages
                    const pageContent = content.pages[pageName];
                    if (pageContent) {
                        mainContent.innerHTML = pageContent;
                    }
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement du contenu:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadContent); 