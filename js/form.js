/* ==========================================================================
   SOLUTO TECNOLOGIA - Form Validation + Web3Forms Integration
   ========================================================================== */

/**
 * CONFIGURAÇÃO WEB3FORMS
 * =====================
 * 1. Acesse https://web3forms.com
 * 2. Digite seu email e receba a Access Key
 * 3. Substitua 'YOUR_ACCESS_KEY_HERE' pela sua key no arquivo contato.html
 *    (procure por: <input type="hidden" name="access_key" value="YOUR_ACCESS_KEY_HERE">)
 * 4. O formulário passará a enviar emails de verdade!
 */

// Detecta se está em modo de simulação (sem access key real)
const WEB3FORMS_PLACEHOLDER = 'YOUR_ACCESS_KEY_HERE';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('contact-form');

    if (!form) return;

    // Check for success parameter in URL (redirect from Web3Forms)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
        showSuccessMessage(form);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Initialize form validation
    initFormValidation(form);
});

function initFormValidation(form) {
    const fields = form.querySelectorAll('.form-input, .form-textarea');
    const submitBtn = form.querySelector('button[type="submit"]');
    const accessKeyField = document.getElementById('web3forms-key');

    // Check if Web3Forms is configured
    const isWeb3FormsConfigured = accessKeyField &&
        accessKeyField.value &&
        accessKeyField.value !== WEB3FORMS_PLACEHOLDER;

    // Real-time validation on blur
    fields.forEach(field => {
        field.addEventListener('blur', function () {
            validateField(this);
        });

        field.addEventListener('input', function () {
            // Remove error on typing
            const error = this.parentElement.querySelector('.form-error');
            if (error) {
                error.remove();
                this.classList.remove('error');
            }
        });
    });

    // Phone formatting
    const phoneField = form.querySelector('#phone');
    if (phoneField) {
        phoneField.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');

            if (value.length > 11) {
                value = value.slice(0, 11);
            }

            if (value.length > 0) {
                if (value.length <= 2) {
                    value = `(${value}`;
                } else if (value.length <= 7) {
                    value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                } else {
                    value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                }
            }

            e.target.value = value;
        });
    }

    // Form submission
    form.addEventListener('submit', function (e) {
        let isValid = true;

        fields.forEach(field => {
            if (!validateField(field)) {
                isValid = false;
            }
        });

        if (!isValid) {
            e.preventDefault();
            return;
        }

        // If Web3Forms is NOT configured, use simulation mode
        if (!isWeb3FormsConfigured) {
            e.preventDefault();
            console.warn('⚠️ Web3Forms não configurado. Usando modo de simulação.');
            console.info('💡 Para configurar, substitua YOUR_ACCESS_KEY_HERE em contato.html');
            submitFormSimulation(form, submitBtn);
        } else {
            // Web3Forms IS configured - let form submit naturally
            showLoadingState(submitBtn);
        }
    });
}

function validateField(field) {
    const value = field.value.trim();
    const type = field.getAttribute('type') || field.tagName.toLowerCase();
    const name = field.getAttribute('name');
    const required = field.hasAttribute('required');

    // Skip hidden fields
    if (type === 'hidden' || type === 'checkbox') {
        return true;
    }

    // Remove existing error
    const existingError = field.parentElement.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }
    field.classList.remove('error');

    // Required validation
    if (required && !value) {
        showError(field, 'Este campo é obrigatório');
        return false;
    }

    // Email validation
    if (type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showError(field, 'Por favor, insira um e-mail válido');
            return false;
        }
    }

    // Phone validation
    if (name === 'phone' && value) {
        const phoneDigits = value.replace(/\D/g, '');
        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            showError(field, 'Por favor, insira um telefone válido');
            return false;
        }
    }

    // Name validation (minimum length)
    if (name === 'name' && value && value.length < 3) {
        showError(field, 'O nome deve ter pelo menos 3 caracteres');
        return false;
    }

    // Message validation (minimum length)
    if (name === 'message' && value && value.length < 10) {
        showError(field, 'A mensagem deve ter pelo menos 10 caracteres');
        return false;
    }

    return true;
}

function showError(field, message) {
    field.classList.add('error');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error';
    errorDiv.textContent = message;

    field.parentElement.appendChild(errorDiv);
}

function showLoadingState(submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
    <span class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></span>
    Enviando...
  `;
}

// Simulation mode (when Web3Forms is not configured)
function submitFormSimulation(form, submitBtn) {
    const originalText = submitBtn.innerHTML;

    // Show loading state
    showLoadingState(submitBtn);

    // Simulate form submission
    setTimeout(() => {
        // Success state
        submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Mensagem Enviada! (Simulação)
    `;
        submitBtn.classList.add('btn-success');

        // Show success message
        showSuccessMessage(form, true);

        // Reset form
        setTimeout(() => {
            form.reset();
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            submitBtn.classList.remove('btn-success');
        }, 3000);

    }, 1500);
}

function showSuccessMessage(form, isSimulation = false) {
    const existingMessage = form.querySelector('.success-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const simulationNote = isSimulation
        ? '<p style="margin: 4px 0 0; font-size: 12px; color: #ff6b00;">⚠️ Modo simulação - configure Web3Forms para enviar de verdade</p>'
        : '';

    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
    <div style="
      background: rgba(0, 255, 136, 0.1);
      border: 1px solid rgba(0, 255, 136, 0.3);
      border-radius: 8px;
      padding: 16px 24px;
      margin-top: 24px;
      text-align: center;
      color: #00ff88;
    ">
      <strong>✓ Mensagem enviada com sucesso!</strong>
      <p style="margin: 8px 0 0; font-size: 14px; color: #8a8a9a;">
        Entraremos em contato em breve.
      </p>
      ${simulationNote}
    </div>
  `;

    form.appendChild(successDiv);

    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// Add error styles
const errorStyles = document.createElement('style');
errorStyles.textContent = `
  .form-input.error,
  .form-textarea.error {
    border-color: #ff0080 !important;
    box-shadow: 0 0 0 3px rgba(255, 0, 128, 0.1) !important;
  }
  
  .btn-success {
    background: #00ff88 !important;
  }
  
  .form-error {
    color: #ff0080;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
`;
document.head.appendChild(errorStyles);
