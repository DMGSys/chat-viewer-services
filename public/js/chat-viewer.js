/**
 * Chat Viewer - Client-side JavaScript
 * Handles filtering, display, and export of chat conversations
 */

document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM elements
  const filterForm = document.getElementById('filter-form');
  const assistantSelect = document.getElementById('asistente');
  const sessionIdSelect = document.getElementById('sessionId');
  const fechaInicioInput = document.getElementById('fechaInicio');
  const fechaFinInput = document.getElementById('fechaFin');
  const busquedaInput = document.getElementById('busqueda');
  const ordenarSelect = document.getElementById('ordenarPor');
  const direccionSelect = document.getElementById('direccion');
  const chatContainer = document.getElementById('chat-container');
  const exportButton = document.getElementById('export-button');
  const resetButton = document.getElementById('reset-button');
  const loadingIndicator = document.getElementById('loading-indicator');
  
  // Initialize components and event listeners
  initializeDatePickers();
  setupEventListeners();
  
  /**
   * Initialize date picker inputs with default values and constraints
   */
  function initializeDatePickers() {
    // Set default date range (last 7 days to today)
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    
    // Format dates for input fields (YYYY-MM-DD)
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Set default values
    fechaInicioInput.value = formatDate(lastWeek);
    fechaFinInput.value = formatDate(today);
    
    // Set max date to today for both inputs
    const maxDate = formatDate(today);
    fechaInicioInput.setAttribute('max', maxDate);
    fechaFinInput.setAttribute('max', maxDate);
    
    // Ensure fechaFin is not before fechaInicio
    fechaInicioInput.addEventListener('change', () => {
      if (fechaInicioInput.value > fechaFinInput.value) {
        fechaFinInput.value = fechaInicioInput.value;
      }
    });
    
    fechaFinInput.addEventListener('change', () => {
      if (fechaFinInput.value < fechaInicioInput.value) {
        fechaInicioInput.value = fechaFinInput.value;
      }
    });
  }
  
  /**
   * Set up all event listeners for the page
   */
  function setupEventListeners() {
    // Filter form submission
    if (filterForm) {
      filterForm.addEventListener('submit', handleFilterSubmit);
    }
    
    // Reset button
    if (resetButton) {
      resetButton.addEventListener('click', resetFilters);
    }
    
    // Export button
    if (exportButton) {
      exportButton.addEventListener('click', exportChatHistory);
    }
    
    // Dynamic sessionId loading when assistant type changes
    if (assistantSelect) {
      assistantSelect.addEventListener('change', loadSessionIds);
    }
    
    // Responsive design - adjust UI on window resize
    window.addEventListener('resize', adjustUIForScreenSize);
    
    // Initial UI adjustment
    adjustUIForScreenSize();
  }
  
  /**
   * Handle filter form submission
   * @param {Event} event - Form submit event
   */
  function handleFilterSubmit(event) {
    event.preventDefault();
    showLoading(true);
    
    // Get current collection from URL
    const urlParams = new URLSearchParams(window.location.search);
    const coleccion = urlParams.get('coleccion') || 'chats';
    
    // Build query string from form inputs
    const formData = new FormData(filterForm);
    const queryParams = new URLSearchParams();
    
    for (const [key, value] of formData.entries()) {
      if (value) {
        queryParams.append(key, value);
      }
    }
    
    // Redirect to the same page with filter parameters
    window.location.href = `/chats/${coleccion}?${queryParams.toString()}`;
  }
  
  /**
   * Reset all filters to default values
   */
  function resetFilters() {
    // Get current collection from URL
    const urlPath = window.location.pathname;
    
    // Redirect to the collection page without query parameters
    window.location.href = urlPath;
  }
  
  /**
   * Load sessionIds based on selected assistant type
   */
  async function loadSessionIds() {
    const assistantType = assistantSelect.value;
    
    if (!assistantType) {
      return;
    }
    
    try {
      // Get current collection from URL
      const urlPath = window.location.pathname;
      const coleccion = urlPath.split('/').pop();
      
      // Clear current options
      sessionIdSelect.innerHTML = '<option value="">Seleccionar número de teléfono</option>';
      
      // Show loading state
      sessionIdSelect.disabled = true;
      
      // Fetch sessionIds for the selected assistant
      const response = await fetch(`/chats/${coleccion}/sessionids?asistente=${assistantType}`);
      const sessionIds = await response.json();
      
      // Add options to select
      sessionIds.forEach(sessionId => {
        const option = document.createElement('option');
        option.value = sessionId;
        option.textContent = formatPhoneNumber(sessionId);
        sessionIdSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading sessionIds:', error);
    } finally {
      // Enable select
      sessionIdSelect.disabled = false;
    }
  }
  
  /**
   * Format phone number for display
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} Formatted phone number
   */
  function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Basic formatting for phone numbers
    // Assumes format like: 5491112345678
    if (phoneNumber.length >= 10) {
      // Try to format as international number
      try {
        const cleaned = phoneNumber.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2,3})(\d{2})(\d{4})(\d{4})$/);
        
        if (match) {
          return `+${match[1]} ${match[2]} ${match[3]}-${match[4]}`;
        }
        
        // Fallback to simple formatting
        if (cleaned.length > 8) {
          return `+${cleaned.slice(0, -8)} ${cleaned.slice(-8, -4)}-${cleaned.slice(-4)}`;
        }
      } catch (e) {
        // If formatting fails, return original
      }
    }
    
    return phoneNumber;
  }
  
  /**
   * Export chat history based on current filters
   */
  function exportChatHistory() {
    // Get current URL and replace /chats/ with /chats/export/
    const currentUrl = new URL(window.location.href);
    const coleccion = currentUrl.pathname.split('/').pop();
    
    // Create export URL with current query parameters
    const exportUrl = `/chats/${coleccion}/exportar${currentUrl.search}`;
    
    // Open download in new tab/window
    window.open(exportUrl, '_blank');
  }
  
  /**
   * Format and display chat messages in conversation view
   * @param {Array} chats - Array of chat objects
   * @param {HTMLElement} container - Container element for chats
   */
  function displayChats(chats, container) {
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    if (!chats || chats.length === 0) {
      // Show no results message
      container.innerHTML = `
        <div class="no-results">
          <i class="fas fa-comments"></i>
          <p>No se encontraron conversaciones con los filtros actuales.</p>
          <button class="btn btn-outline" onclick="resetFilters()">Limpiar filtros</button>
        </div>
      `;
      return;
    }
    
    // Group chats by sessionId
    const chatsBySession = groupChatsBySession(chats);
    
    // Create accordion for each session
    Object.entries(chatsBySession).forEach(([sessionId, sessionChats]) => {
      const chatSession = document.createElement('div');
      chatSession.className = 'chat-session';
      
      // Determine assistant type for the session
      const assistantType = determineAssistantType(sessionChats[0]);
      
      // Create header with session info
      const header = document.createElement('div');
      header.className = 'chat-header';
      
      // Get the first timestamp from the chat
      let firstTimestamp;
      if (sessionChats[0].mensajes && sessionChats[0].mensajes.length > 0) {
        firstTimestamp = sessionChats[0].mensajes[0].fecha;
      } else if (sessionChats[0].messages && sessionChats[0].messages.length > 0) {
        firstTimestamp = sessionChats[0].messages[0].timestamp;
      } else {
        firstTimestamp = sessionChats[0].fecha || new Date();
      }
      
      header.innerHTML = `
        <h2>
          <span class="assistant-badge assistant-${assistantType.toLowerCase()}">${assistantType}</span>
          ${formatPhoneNumber(sessionId)}
        </h2>
        <div class="chat-session-info">
          <span>${formatDate(firstTimestamp)}</span>
          <span>${getMessageCount(sessionChats)} mensajes</span>
        </div>
      `;
      
      // Create messages container
      const messagesContainer = document.createElement('div');
      messagesContainer.className = 'chat-messages';
      
      // Add messages
      sessionChats.forEach(chat => {
        // Handle different message formats
        if (chat.messages && Array.isArray(chat.messages)) {
          // New format: messages array with type and data.content
          chat.messages.forEach(message => {
            const messageEl = createMessageElement({
              texto: message.data.content,
              esUsuario: message.type === 'human',
              fecha: message.timestamp
            }, assistantType);
            messagesContainer.appendChild(messageEl);
          });
        } else if (chat.mensajes && Array.isArray(chat.mensajes)) {
          // Old format: mensajes array with esUsuario and texto
          chat.mensajes.forEach(mensaje => {
            const messageEl = createMessageElement(mensaje, assistantType);
            messagesContainer.appendChild(messageEl);
          });
        } else if (chat.mensaje) {
          // Single message format
          const messageEl = createMessageElement({
            texto: chat.mensaje,
            esUsuario: chat.esUsuario,
            fecha: chat.fecha
          }, assistantType);
          messagesContainer.appendChild(messageEl);
        }
      });
      
      // Append elements to chat session
      chatSession.appendChild(header);
      chatSession.appendChild(messagesContainer);
      
      // Append session to container
      container.appendChild(chatSession);
    });
  }
  
  /**
   * Get total message count from session chats
   * @param {Array} sessionChats - Array of chat objects for a session
   * @returns {number} Total message count
   */
  function getMessageCount(sessionChats) {
    let count = 0;
    
    sessionChats.forEach(chat => {
      if (chat.messages && Array.isArray(chat.messages)) {
        count += chat.messages.length;
      } else if (chat.mensajes && Array.isArray(chat.mensajes)) {
        count += chat.mensajes.length;
      } else if (chat.mensaje) {
        count += 1;
      }
    });
    
    return count;
  }
  
  /**
   * Group chats by sessionId
   * @param {Array} chats - Array of chat objects
   * @returns {Object} Chats grouped by sessionId
   */
  function groupChatsBySession(chats) {
    return chats.reduce((groups, chat) => {
      const sessionId = chat.sessionId;
      if (!groups[sessionId]) {
        groups[sessionId] = [];
      }
      groups[sessionId].push(chat);
      return groups;
    }, {});
  }
  
  /**
   * Determine assistant type from chat object
   * @param {Object} chat - Chat object
   * @returns {string} Assistant type name
   */
  function determineAssistantType(chat) {
    // Check for direct assistant type indicators
    if (chat.asistente === "Granville") {
      return "Granville";
    } else if (chat.asistente_fc === "Fortecar") {
      return "Fortecar";
    } else if (chat.asistente_pw === "Pampawagen") {
      return "Pampawagen";
    }
    
    // Check in messages array (new format)
    if (chat.messages && Array.isArray(chat.messages)) {
      // Look for assistant messages
      const assistantMessages = chat.messages.filter(m => m.type === 'ai');
      if (assistantMessages.length > 0) {
        const content = assistantMessages[0].data.content;
        if (content.includes('Pampawagen') || content.includes('Martina')) {
          return "Pampawagen";
        } else if (content.includes('Fortecar')) {
          return "Fortecar";
        } else if (content.includes('Granville')) {
          return "Granville";
        }
      }
    }
    
    // Check in mensajes array (old format)
    if (chat.mensajes && Array.isArray(chat.mensajes)) {
      const assistantMessages = chat.mensajes.filter(m => !m.esUsuario);
      if (assistantMessages.length > 0) {
        const content = assistantMessages[0].texto;
        if (content.includes('Pampawagen') || content.includes('Martina')) {
          return "Pampawagen";
        } else if (content.includes('Fortecar')) {
          return "Fortecar";
        } else if (content.includes('Granville')) {
          return "Granville";
        }
      }
    }
    
    return "Asistente";
  }
  
  /**
   * Create a message element for display
   * @param {Object} mensaje - Message object
   * @param {string} assistantType - Type of assistant
   * @returns {HTMLElement} Message element
   */
  function createMessageElement(mensaje, assistantType) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${mensaje.esUsuario ? 'message-user' : 'message-assistant message-' + assistantType.toLowerCase()}`;
    
    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'message-bubble';
    
    // Message text
    bubbleEl.innerHTML = formatMessageText(mensaje.texto || '');
    
    // Message metadata
    const metaEl = document.createElement('div');
    metaEl.className = 'message-meta';
    
    const senderEl = document.createElement('span');
    senderEl.className = 'message-sender';
    senderEl.textContent = mensaje.esUsuario ? 'Usuario' : assistantType;
    
    const timeEl = document.createElement('span');
    timeEl.className = 'message-time';
    timeEl.textContent = formatTime(mensaje.fecha);
    
    metaEl.appendChild(senderEl);
    metaEl.appendChild(timeEl);
    
    bubbleEl.appendChild(metaEl);
    messageEl.appendChild(bubbleEl);
    
    return messageEl;
  }
  
  /**
   * Format message text with line breaks and links
   * @param {string} text - Raw message text
   * @returns {string} Formatted HTML
   */
  function formatMessageText(text) {
    if (!text) return '';
    
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
    
    // Convert line breaks to <br>
    return text.replace(/\n/g, '<br>');
  }
  
  /**
   * Format date for display
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date
   */
  function formatDate(date) {
    if (!date) return '';
    
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  /**
   * Format time for display
   * @param {string|Date} date - Date with time to format
   * @returns {string} Formatted time
   */
  function formatTime(date) {
    if (!date) return '';
    
    const dateObj = new Date(date);
    return dateObj.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * Show or hide loading indicator
   * @param {boolean} show - Whether to show loading
   */
  function showLoading(show) {
    if (loadingIndicator) {
      loadingIndicator.style.display = show ? 'flex' : 'none';
    }
  }
  
  /**
   * Adjust UI elements based on screen size
   */
  function adjustUIForScreenSize() {
    const width = window.innerWidth;
    
    // Adjust filter panel layout
    const filterGroups = document.querySelectorAll('.filter-group');
    
    if (width < 768) {
      // Mobile layout
      filterGroups.forEach(group => {
        group.style.flex = '1 0 100%';
      });
      
      // Adjust chat container height
      if (chatContainer) {
        chatContainer.style.maxHeight = '60vh';
      }
    } else {
      // Desktop layout
      filterGroups.forEach(group => {
        group.style.flex = '1';
      });
      
      // Adjust chat container height
      if (chatContainer) {
        chatContainer.style.maxHeight = '70vh';
      }
    }
  }
  
  // Call displayChats if we have chat data from server
  if (typeof chatsData !== 'undefined' && chatContainer) {
    displayChats(chatsData, chatContainer);
  }
});
