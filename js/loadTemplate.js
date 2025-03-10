async function loadProfileTemplate() {
    try {
        const response = await fetch('templates/profile-card.html');
        const template = await response.text();
        
        // Insérer le template au début du layout
        const layout = document.querySelector('.layout');
        if (layout) {
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = template;
            layout.insertBefore(tempContainer.firstElementChild, layout.firstChild);
        }
    } catch (error) {
        console.error('Erreur lors du chargement du template de profil:', error);
    }
}

// Charger le template de profil au chargement de la page
document.addEventListener('DOMContentLoaded', loadProfileTemplate); 