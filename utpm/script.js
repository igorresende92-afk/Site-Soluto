/**
 * UTPM - Uma Terapeuta pra Mamãe
 * Accordion Logic
 * 
 * Comportamento: Apenas uma seção aberta por vez.
 * Ao clicar em um item, o anterior fecha automaticamente.
 */

document.addEventListener('DOMContentLoaded', () => {
    const accordion = document.getElementById('accordion-container');
    const items = accordion.querySelectorAll('.accordion__item');

    items.forEach(item => {
        const header = item.querySelector('.accordion__header');

        header.addEventListener('click', () => {
            const isCurrentlyActive = item.classList.contains('is-active');

            // Fecha todos os itens primeiro
            closeAllItems(items);

            // Se o item clicado NÃO estava ativo, abre ele
            if (!isCurrentlyActive) {
                openItem(item);
            }
        });

        // Suporte a teclado (Enter e Espaço já funcionam nativamente no <button>)
        // Mas adicionamos feedback visual para navegação por teclado
        header.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusNextItem(items, item);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                focusPreviousItem(items, item);
            }
        });
    });

    /**
     * Abre um item do accordion com animação suave de max-height.
     */
    function openItem(item) {
        const panel = item.querySelector('.accordion__panel');
        const header = item.querySelector('.accordion__header');

        item.classList.add('is-active');
        header.setAttribute('aria-expanded', 'true');

        // Calcula a altura real do conteúdo para animar
        panel.style.maxHeight = panel.scrollHeight + 'px';

        // Scroll suave até o item (com um delay para a animação iniciar)
        setTimeout(() => {
            item.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }, 150);
    }

    /**
     * Fecha todos os itens do accordion.
     */
    function closeAllItems(items) {
        items.forEach(item => {
            const panel = item.querySelector('.accordion__panel');
            const header = item.querySelector('.accordion__header');

            item.classList.remove('is-active');
            header.setAttribute('aria-expanded', 'false');
            panel.style.maxHeight = '0';
        });
    }

    /**
     * Move o foco para o próximo item (navegação por setas).
     */
    function focusNextItem(items, currentItem) {
        const itemsArray = Array.from(items);
        const currentIndex = itemsArray.indexOf(currentItem);
        const nextIndex = (currentIndex + 1) % itemsArray.length;
        itemsArray[nextIndex].querySelector('.accordion__header').focus();
    }

    /**
     * Move o foco para o item anterior (navegação por setas).
     */
    function focusPreviousItem(items, currentItem) {
        const itemsArray = Array.from(items);
        const currentIndex = itemsArray.indexOf(currentItem);
        const prevIndex = (currentIndex - 1 + itemsArray.length) % itemsArray.length;
        itemsArray[prevIndex].querySelector('.accordion__header').focus();
    }

    // --- Efeito de entrada animada para os itens ao rolar (Intersection Observer) ---
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.animationPlayState = 'running';
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );

        items.forEach(item => {
            item.style.animationPlayState = 'paused';
            observer.observe(item);
        });
    }
});
